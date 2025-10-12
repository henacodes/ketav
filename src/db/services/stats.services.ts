import { eq, and, gt } from "drizzle-orm";
import { dailyBookStats, dailyUserStats } from "@/db/schema/stats";
import { db } from "..";
import { differenceInCalendarDays, format, parseISO, subDays } from "date-fns";
import { gte } from "drizzle-orm";

export async function updateBookStats(
  minutesIncrement: number,
  bookId: string,
  day: string
) {
  const existing = await db.query.dailyBookStats.findFirst({
    where: and(eq(dailyBookStats.bookId, bookId), eq(dailyBookStats.day, day)),
  });

  if (existing) {
    await db
      .update(dailyBookStats)
      .set({
        minutesRead: existing.minutesRead + minutesIncrement,
        lastActive: Date.now(),
      })
      .where(
        and(eq(dailyBookStats.bookId, bookId), eq(dailyBookStats.day, day))
      );
  } else {
    // Insert new record
    await db.insert(dailyBookStats).values({
      bookId,
      day,
      minutesRead: minutesIncrement,
      lastActive: Date.now(),
    });
  }

  console.log(`[DB] Updated ${bookId} for ${day} (+${minutesIncrement} min)`);
}

export async function updateDailyUserStats(
  minutesIncrement: number,
  day: string
) {
  // Check if there's already a record for today
  const existing = await db.query.dailyUserStats.findFirst({
    where: eq(dailyUserStats.day, day),
  });

  if (existing) {
    // Update today's total minutes and session count
    await db
      .update(dailyUserStats)
      .set({
        minutesRead: existing.minutesRead + minutesIncrement,
      })
      .where(eq(dailyUserStats.day, day));
  } else {
    // Insert a new record for today
    await db.insert(dailyUserStats).values({
      day,
      minutesRead: minutesIncrement,
    });
  }

  console.log(`[DB] Updated daily stats for ${day} (+${minutesIncrement} min)`);
}

export async function getDailyUserStatsForLastDays(days: number) {
  const today = new Date();
  const startDate = subDays(today, days - 1);
  const formattedStartDate = format(startDate, "yyyy-MM-dd");

  const stats = await db
    .select()
    .from(dailyUserStats)
    .where(gte(dailyUserStats.day, formattedStartDate))
    .orderBy(dailyUserStats.day);

  return stats;
}

export async function seedRandomDailyUserStats() {
  const today = new Date();

  const last7Days = Array.from({ length: 7 }, (_, i) =>
    format(subDays(today, i), "yyyy-MM-dd")
  );

  const randomDays = last7Days.sort(() => Math.random() - 0.5).slice(0, 4);

  const entries = randomDays.map((day) => ({
    day,
    minutesRead: Math.floor(Math.random() * 120) + 1, // 1–120 min
  }));

  await db.insert(dailyUserStats).values(entries);
}

export async function getStreakSummary() {
  // Fetch all reading days (with > 0 minutes)
  const stats = await db
    .select()
    .from(dailyUserStats)
    .where(gt(dailyUserStats.minutesRead, 0))
    .orderBy(dailyUserStats.day);

  if (stats.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalDays: 0,
    };
  }

  const dates = stats.map((s) => parseISO(s.day));
  const totalDays = dates.length;

  let longestStreak = 1;
  let currentStreak = 1;
  let tempStreak = 1;

  for (let i = 1; i < dates.length; i++) {
    const diff = differenceInCalendarDays(dates[i], dates[i - 1]);

    if (diff === 1) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else if (diff > 1) {
      tempStreak = 1;
    }
  }

  // Check if the last reading date is today or yesterday (still active streak)
  const lastReading = dates[dates.length - 1];
  const today = new Date();
  const diffToToday = differenceInCalendarDays(today, lastReading);

  if (diffToToday > 1) {
    currentStreak = 0; // broke streak
  } else {
    // Count consecutive streak ending with last day
    currentStreak = 1;
    for (let i = dates.length - 1; i > 0; i--) {
      const diff = differenceInCalendarDays(dates[i], dates[i - 1]);
      if (diff === 1) currentStreak++;
      else break;
    }
  }

  return {
    currentStreak,
    longestStreak,
    totalDays,
  };
}
export async function getBooksForDay(day: string) {
  const results = await db.query.dailyBookStats.findMany({
    where: eq(dailyBookStats.day, day),
    with: {
      book: true,
    },
  });

  return results;
}
