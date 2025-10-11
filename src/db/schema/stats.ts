import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { books } from "./book";

export const dailyUserStats = sqliteTable("daily_user_stats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  day: text("day").notNull(), // 'YYYY-MM-DD' 
  minutesRead: integer("minutes_read").notNull().default(0),
  sessionsCount: integer("sessions_count").notNull().default(0),
});


export const dailyBookStats = sqliteTable("daily_book_stats", {
  userId: text("user_id").notNull(),
  day: text("day").notNull(), // 'YYYY-MM-DD'
  bookId: integer("book_id").notNull().references(() => books.id, { onDelete: "cascade", onUpdate: "cascade" }),
  minutesRead: integer("minutes_read").notNull().default(0),
  lastActive: integer("last_active")
});
