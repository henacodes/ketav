import { eq, and } from "drizzle-orm";
import { dailyBookStats, dailyUserStats } from "@/db/schema/stats";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import { db } from "..";


export async function updateBookStats(minutesIncrement: number, bookId: string, day: string) {

  const existing = await db.query.dailyBookStats.findFirst({
    where: and(eq(dailyBookStats.bookId, bookId), eq(dailyBookStats.day, day)),
  });

  if (existing) {
    await db
      .update(dailyBookStats)
      .set({
        minutesRead: existing.minutesRead + minutesIncrement,
        lastActive:Date.now()
      })
      .where(and(eq(dailyBookStats.bookId, bookId), eq(dailyBookStats.day, day)));
  } else {
    // Insert new record
    await db.insert(dailyBookStats).values({
      bookId,
      day,
      minutesRead: minutesIncrement,
      lastActive:Date.now()
    });
  }

  console.log(`[DB] Updated ${bookId} for ${day} (+${minutesIncrement} min)`);
}




export async function updateDailyUserStats(minutesIncrement: number, day:string) {



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
