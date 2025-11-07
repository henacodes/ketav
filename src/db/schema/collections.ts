import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { books } from "./book";

export const collections = sqliteTable("collections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").unique().notNull(),
  description: text("description"),
});

export const collectionBooks = sqliteTable("collection_books", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  collectionId: integer("collection_id")
    .notNull()
    .references(() => collections.id, { onDelete: "cascade" }),
  bookId: integer("book_id")
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
});

export type Collection = InferSelectModel<typeof collections>;
export type InsertCollection = InferInsertModel<typeof collections>;

export type CollectionBook = InferSelectModel<typeof collectionBooks>;
export type InsertCollectionBook = InferInsertModel<typeof collectionBooks>;
