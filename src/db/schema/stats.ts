import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { books } from "./book";
import { relations, InferSelectModel } from "drizzle-orm";

export const dailyUserStats = sqliteTable("daily_user_stats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  day: text("day").notNull(), // 'YYYY-MM-DD'
  minutesRead: integer("minutes_read").notNull().default(0),
  sessionsCount: integer("sessions_count").notNull().default(0),
});

export const dailyBookStats = sqliteTable("daily_book_stats", {
  day: text("day").notNull(), // 'YYYY-MM-DD'
  bookId: text("book_id")
    .notNull()
    .references(() => books.bookId, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  minutesRead: integer("minutes_read").notNull().default(0),
  lastActive: integer("last_active"),
});

export const dailyBookStatsRelations = relations(dailyBookStats, ({ one }) => ({
  book: one(books, {
    fields: [dailyBookStats.bookId],
    references: [books.bookId],
  }),
}));

export type DailyBookRecord = InferSelectModel<typeof dailyBookStats>;
