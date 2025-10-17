import { integer, text } from "drizzle-orm/sqlite-core";
import { sqliteTable } from "drizzle-orm/sqlite-core";
import { books } from "./book";

export const dailyReadingGoal = sqliteTable("daily_reading_goal", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  minutesToRead: integer("minutes_to_read").notNull(),
  associatedBook: text("associated_book").references(() => books.bookId, {
    onDelete: "cascade",
  }),
  startDate: text("start_date").notNull(), // YYYY-MM-DD
  endDate: text("end_date"), // YYYY-MM-DD
});
