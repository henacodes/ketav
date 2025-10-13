import { integer } from "drizzle-orm/sqlite-core";
import { sqliteTable } from "drizzle-orm/sqlite-core";
import { books } from "./book";

export const userGoal = sqliteTable("user_goal", {
  minutesToRead: integer("minutes_to_read").notNull(),
  associatedBook: integer("associated_book").references(() => books.bookId, {
    onDelete: "cascade",
  }),
});
