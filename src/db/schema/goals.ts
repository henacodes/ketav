import { integer, text } from "drizzle-orm/sqlite-core";
import { sqliteTable } from "drizzle-orm/sqlite-core";
import { books } from "./book";
import { InferInsertModel, InferSelectModel } from "drizzle-orm";

export const dailyReadingGoal = sqliteTable("daily_reading_goal", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  minutesToRead: integer("minutes_to_read").notNull(),
  associatedBook: text("associated_book").references(() => books.bookId, {
    onDelete: "cascade",
  }),
  startDate: text("start_date").notNull(), // YYYY-MM-DD
  endDate: text("end_date"), // YYYY-MM-DD
});

export const dailyReadingProgress = sqliteTable("daily_reading_progress", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  goalId: integer("goal_id").references(() => dailyReadingGoal.id, {
    onDelete: "cascade",
  }),
  date: text("date").notNull(), // YYYY-MM-DD
  minutesRead: integer("minutes_read").notNull(),
});

export type InsertGoals = InferInsertModel<typeof dailyReadingGoal>;
export type Goal = InferSelectModel<typeof dailyReadingGoal>;
