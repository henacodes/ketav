import { eq, and, gt, lte } from "drizzle-orm";
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
    .orderBy(dailyUserStats.day); // ascending

  if (stats.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalDays: 0,
    };
  }

  // Build a sorted array of unique Date objects (dedupe same dates)
  const seen = new Set<string>();
  const uniqueDates: Date[] = [];
  for (const s of stats) {
    // s.day already in 'yyyy-MM-dd' format
    if (!seen.has(s.day)) {
      seen.add(s.day);
      uniqueDates.push(parseISO(s.day));
    }
  }

  const totalDays = uniqueDates.length;

  if (totalDays === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalDays: 0,
    };
  }

  // Compute longest streak
  let longestStreak = 1;
  let tempStreak = 1;

  for (let i = 1; i < uniqueDates.length; i++) {
    const diff = differenceInCalendarDays(uniqueDates[i], uniqueDates[i - 1]);

    if (diff === 1) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else if (diff === 0) {
      // same day (shouldn't happen after dedupe, but safe to ignore)
      continue;
    } else {
      tempStreak = 1;
    }
  }

  // Compute current streak
  let currentStreak = 0;
  const lastReading = uniqueDates[uniqueDates.length - 1];
  const today = new Date();
  const diffToToday = differenceInCalendarDays(today, lastReading);

  // only start counting if lastReading is today or yesterday
  if (diffToToday <= 1) {
    currentStreak = 1; // include lastReading
    for (let i = uniqueDates.length - 1; i > 0; i--) {
      const diff = differenceInCalendarDays(uniqueDates[i], uniqueDates[i - 1]);

      if (diff === 1) {
        currentStreak++;
      } else if (diff === 0) {
        // ignore duplicates (defensive)
        continue;
      } else {
        break;
      }
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

export async function getLastYearUserStats() {
  const today = new Date();
  const startDate = subDays(today, 364);

  const start = format(startDate, "yyyy-MM-dd");
  const end = format(today, "yyyy-MM-dd");

  const stats = await db
    .select()
    .from(dailyUserStats)
    .where(and(gte(dailyUserStats.day, start), lte(dailyUserStats.day, end)))
    .orderBy(dailyUserStats.day);

  return stats;
}
