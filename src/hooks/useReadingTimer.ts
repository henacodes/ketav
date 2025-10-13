import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { format } from "date-fns";
import {
  updateBookStats,
  updateDailyUserStats,
} from "@/db/services/stats.services";

interface ReadingTrackerOptions {
  bookId: string;
}

interface ReadingTrackerHookOptions {
  /**
   * If true, the hook will update a reactive minutesRead state each minute.
   * Default: false (recommended to avoid unnecessary re-renders).
   */
  reactive?: boolean;
}

export function useReadingTracker(
  { bookId }: ReadingTrackerOptions,
  { reactive = false }: ReadingTrackerHookOptions = {}
) {
  // Internal refs (no rerenders when these change)
  const isActiveRef = useRef(true);
  const minutesRef = useRef(0);
  const lastActivityRef = useRef(Date.now());
  const intervalRef = useRef<number | null>(null);

  // Public reactive state — only used if `reactive` is true.
  const [minutesRead, setMinutesRead] = useState(0);

  const INACTIVITY_LIMIT = 10 * 60 * 1000; // 10 minutes

  // Activity listeners: attach once. Use refs to avoid causing re-subscriptions.
  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
      isActiveRef.current = true;
    };

    window.addEventListener("mousemove", updateActivity);
    window.addEventListener("keydown", updateActivity);
    window.addEventListener("scroll", updateActivity);

    return () => {
      window.removeEventListener("mousemove", updateActivity);
      window.removeEventListener("keydown", updateActivity);
      window.removeEventListener("scroll", updateActivity);
    };
  }, []); // empty deps -> attach once

  // Tauri focus/blur: update the ref only (don't set React state on blur).
  useEffect(() => {
    let unlistenFocus: (() => void) | null = null;
    let unlistenBlur: (() => void) | null = null;

    async function handleFocusEvents() {
      unlistenFocus = await listen("tauri://focus", () => {
        // When app regains focus, mark active and flush UI if reactive
        isActiveRef.current = true;
        lastActivityRef.current = Date.now();
        if (reactive) {
          // flush accumulated minutes so UI reflects the current value
          setMinutesRead(minutesRef.current);
        }
      });

      unlistenBlur = await listen("tauri://blur", () => {
        // Mark inactive in the ref only — avoid setState here to prevent rerender
        isActiveRef.current = false;
      });
    }

    void handleFocusEvents();

    return () => {
      if (unlistenFocus) unlistenFocus();
      if (unlistenBlur) unlistenBlur();
    };
  }, [reactive]); // only matters if reactive flag changes

  // Visibility change: when user returns, flush minutes to UI if reactive
  useEffect(() => {
    function onVisibilityChange() {
      if (typeof document === "undefined") return;
      if (!document.hidden && reactive) {
        // flush accumulated minutes so UI updates once on return
        setMinutesRead(minutesRef.current);
      }
    }
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibilityChange);
    }
    return () => {
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibilityChange);
      }
    };
  }, [reactive]);

  // Interval: run once and rely on refs to determine behavior.
  useEffect(() => {
    intervalRef.current = window.setInterval(async () => {
      const now = Date.now();
      const inactiveTooLong = now - lastActivityRef.current > INACTIVITY_LIMIT;
      if (!isActiveRef.current || inactiveTooLong) return;

      // increment the internal counter (no rerender)
      minutesRef.current += 1;

      // Only update React state when reactive and visible so switching windows doesn't trigger UI updates.
      if (reactive && (typeof document === "undefined" || !document.hidden)) {
        setMinutesRead(minutesRef.current);
      }

      // Persist increment to DB (still awaited, unchanged)
      try {
        await updateStats(1); // +1 minute
      } catch (err) {
        // swallow/log; avoid setState changes from DB errors here to keep renders stable
        // console.error("updateStats error", err);
      }
    }, 60 * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [bookId, reactive]); // recreate interval if bookId or reactive mode changes

  async function updateStats(minutesIncrement: number) {
    const day = format(new Date(), "yyyy-MM-dd");

    await updateBookStats(minutesIncrement, bookId, day);
    await updateDailyUserStats(minutesIncrement, day);
  }

  // Return minutesRead (reactive if requested) and isActive (non-reactive snapshot).
  return {
    // If reactive is true we give the stateful value; otherwise return the ref value (non-reactive).
    minutesRead: reactive ? minutesRead : minutesRef.current,
    isActive: isActiveRef.current,
  };
}
