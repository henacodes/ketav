import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { InferSelectModel } from "drizzle-orm";
export const books = sqliteTable("books", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bookId: text("book_id").unique().notNull(),
  title: text("title").notNull(),
  author: text("author").notNull(),
});

export type Book = InferSelectModel<typeof books>;
