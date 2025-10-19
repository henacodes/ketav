import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "..";
import { dailyReadingGoal, dailyReadingProgress, InsertGoals } from "../schema";
import { today } from "@/lib/helpers/time";

//// FIXME: prevent from creating more than one general reading goal
export async function createDailyReadingGoal(goal: InsertGoals) {
  // Check if a goal for this book already exists
  const existing = await db
    .select()
    .from(dailyReadingGoal)
    .where(eq(dailyReadingGoal.associatedBook, goal.associatedBook || ""));
  if (existing.length > 0) {
    throw new Error("A daily reading goal for this book already exists.");
  }
  return await db.insert(dailyReadingGoal).values(goal);
}

export async function fetchAllGoals() {
  return await db.select().from(dailyReadingGoal);
}

export async function fetchProgressForToday() {
  return await db
    .select()
    .from(dailyReadingProgress)
    .where(eq(dailyReadingProgress.date, today()));
}

export async function createDailyReadingProgress(goalId: number, date: string) {
  const existing = await db
    .select()
    .from(dailyReadingProgress)
    .where(
      and(
        eq(dailyReadingProgress.goalId, goalId),
        eq(dailyReadingProgress.date, date)
      )
    );
  if (existing.length > 0) {
    throw new Error("Progress for this date already exists.");
  }
  return await db.insert(dailyReadingProgress).values({
    goalId,
    date,
    minutesRead: 0,
  });
}

export async function incrementMinutesReadForBook(
  bookId: string,
  incrementBy: number = 1
) {
  // Fetch all goals that are either unassociated or match the given bookId
  const goals = await db
    .select()
    .from(dailyReadingGoal)
    .where(
      or(
        isNull(dailyReadingGoal.associatedBook),
        eq(dailyReadingGoal.associatedBook, ""),
        eq(dailyReadingGoal.associatedBook, bookId)
      )
    );

  if (goals.length === 0) {
    return;
  }

  for (const goal of goals) {
    // Try to fetch today's progress for the goal
    const [progress] = await db
      .select()
      .from(dailyReadingProgress)
      .where(
        and(
          eq(dailyReadingProgress.goalId, goal.id),
          eq(dailyReadingProgress.date, today())
        )
      );

    let newMinutes: number;

    if (progress) {
      // Increment but do not exceed the goal's minutesToRead
      newMinutes = Math.min(
        progress.minutesRead + incrementBy,
        goal.minutesToRead
      );

      await db
        .update(dailyReadingProgress)
        .set({ minutesRead: newMinutes })
        .where(eq(dailyReadingProgress.id, progress.id));
    } else {
      // Create new progress record
      newMinutes = Math.min(incrementBy, goal.minutesToRead);
      await db
        .insert(dailyReadingProgress)
        .values({
          goalId: goal.id,
          date: today(),
          minutesRead: newMinutes,
        })
        .returning();
    }
  }
}
