import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { format } from "date-fns";

interface ReadingTrackerOptions {
  bookId: string;

}

export function useReadingTracker({   }: ReadingTrackerOptions) {
  const [isActive, setIsActive] = useState(true);
  const [minutesRead, setMinutesRead] = useState(0);
  const lastActivityRef = useRef(Date.now());
  const intervalRef = useRef<number | null>(null);
  const INACTIVITY_LIMIT = 10 * 60 * 1000; // 10 minutes

  // Detect user activity
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

  // Detect window focus/blur
  useEffect(() => {
    async function handleFocusEvents() {
      await listen("tauri://focus", () => {
        console.log("Window focused, resuming timer");
        setIsActive(true);
        lastActivityRef.current = Date.now();
      });

      await listen("tauri://blur", () => {
        console.log("Window lost focus, pausing timer");
        setIsActive(false);
      });
    }

    handleFocusEvents();
  }, []);

  // Timer logic
  useEffect(() => {
    intervalRef.current = window.setInterval(async () => {
      const now = Date.now();
      const inactiveTooLong = now - lastActivityRef.current > INACTIVITY_LIMIT;

      if (!isActive || inactiveTooLong) return;

      setMinutesRead((prev) => prev + 1);
      await updateStats(1); // +1 minute
    }, 60 * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive]);

  async function updateStats(minutesIncrement: number) {
    const day = format(new Date(), "yyyy-mm-dd");
    const now = Date.now();

    //update db 

    console.log("SAVE TO DB")
  }

  return { minutesRead, isActive };
}
