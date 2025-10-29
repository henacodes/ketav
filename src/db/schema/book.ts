import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { InferInsertModel, InferSelectModel } from "drizzle-orm";
export const books = sqliteTable("books", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bookId: text("book_id").unique().notNull(),
  title: text("title").notNull(),
  author: text("author").notNull(),
  coverImagePath: text("cover_image_path"),
  fileName: text("file_name").notNull(),
  pages: integer("pages"),
});

export type Book = InferSelectModel<typeof books>;
export type InsertBook = InferInsertModel<typeof books>;
