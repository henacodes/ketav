import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { format } from "date-fns";
import { updateBookStats, updateDailyUserStats } from "@/db/services/stats.services";

interface ReadingTrackerOptions {
  bookId: string;
}

export function useReadingTracker({ bookId }: ReadingTrackerOptions) {
  const [isActive, setIsActive] = useState(true);
  const [minutesRead, setMinutesRead] = useState(0);
  const lastActivityRef = useRef(Date.now());
  const intervalRef = useRef<number | null>(null);
  const INACTIVITY_LIMIT = 10 * 60 * 1000; // 10 minutes



  // 🧠 detect user activity
  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
      if (!isActive) setIsActive(true);
    };

    window.addEventListener("mousemove", updateActivity);
    window.addEventListener("keydown", updateActivity);
    window.addEventListener("scroll", updateActivity);

    return () => {
      window.removeEventListener("mousemove", updateActivity);
      window.removeEventListener("keydown", updateActivity);
      window.removeEventListener("scroll", updateActivity);
    };
  }, [isActive]);

useEffect(() => {
  let unlistenFocus: (() => void) | null = null;
  let unlistenBlur: (() => void) | null = null;

  async function handleFocusEvents() {
    unlistenFocus = await listen("tauri://focus", () => {
      console.log("FOCUSING AGAIN");
      setIsActive(true);
      lastActivityRef.current = Date.now();
    });

    unlistenBlur = await listen("tauri://blur", () => {
      console.log("Window lost focus, pausing timer");
      setIsActive(false);
    });
  }

  handleFocusEvents();

  // 🧹 Cleanup to avoid multiple listeners
  return () => {
    if (unlistenFocus) unlistenFocus();
    if (unlistenBlur) unlistenBlur();
  };
}, []);

  // ⏱️ main timer
  useEffect(() => {
    intervalRef.current = window.setInterval(async () => {
      const now = Date.now();
      const inactiveTooLong = now - lastActivityRef.current > INACTIVITY_LIMIT;
      if (!isActive || inactiveTooLong) return;

      setMinutesRead((prev) => prev + 1);
      console.log("isActiveisActive", isActive)
      await updateStats(1); // +1 minute
    }, 60 * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive]);

  async function updateStats(minutesIncrement: number) {
  
    const day = format(new Date(), "yyyy-MM-dd");

    console.log("HEARBEBAT SAVED")
    await updateBookStats(minutesIncrement, bookId, day)
    await updateDailyUserStats(minutesIncrement, day)

    console.log(`[DB] Updated ${bookId} for ${day} (+${minutesIncrement} min)`); 
  }

  return { minutesRead, isActive };
}
