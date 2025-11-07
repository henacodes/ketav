import { db } from "@/db";
import { collections, collectionBooks } from "../schema/collections";
import { books } from "@/db/schema/book";
import { eq, notInArray } from "drizzle-orm";
import type {
  InsertCollection,
  InsertCollectionBook,
} from "../schema/collections";

export async function createCollection(data: InsertCollection) {
  await db.insert(collections).values(data);

  const [collection] = await db
    .select()
    .from(collections)
    .where(eq(collections.name, data.name));

  return collection;
}
export async function addBookToCollection(data: InsertCollectionBook) {
  const exists = await db
    .select()
    .from(collectionBooks)
    .where(
      eq(collectionBooks.collectionId, data.collectionId) &&
        eq(collectionBooks.bookId, data.bookId)
    );

  if (exists.length > 0) return exists[0]; // prevent duplicate
  const [link] = await db.insert(collectionBooks).values(data).returning();
  return link;
}

export async function removeBookFromCollection(
  collectionId: number,
  bookId: number
) {
  await db
    .delete(collectionBooks)
    .where(
      eq(collectionBooks.collectionId, collectionId) &&
        eq(collectionBooks.bookId, bookId)
    );
}

export async function getCollections() {
  const results = await db.select().from(collections);
  return results.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    books: [],
  }));
}

// Get a single collection with its books
export async function getCollectionWithBooks(collectionId: number) {
  const [collection] = await db
    .select()
    .from(collections)
    .where(eq(collections.id, collectionId));

  if (!collection) return null;

  const booksInCollection = await db
    .select({
      id: books.id,
      bookId: books.bookId,
      title: books.title,
      author: books.author,
      coverImagePath: books.coverImagePath,
      fileName: books.fileName,
      pages: books.pages,
    })
    .from(collectionBooks)
    .innerJoin(books, eq(collectionBooks.bookId, books.id))
    .where(eq(collectionBooks.collectionId, collectionId));

  const mappedBooks = booksInCollection.map((b) => ({
    id: b.id,
    title: b.title,
    author: b.author,
    cover: b.coverImagePath || "/default-cover.jpg", // fallback if null
  }));

  return {
    id: collection.id,
    name: collection.name,
    description: collection.description,
    books: mappedBooks,
  };
}

export async function deleteCollection(collectionId: number) {
  await db.delete(collections).where(eq(collections.id, collectionId));
}

export async function getBooksNotInCollection(collectionId: number) {
  // Get all book IDs that are already in the collection
  const booksInCollection = await db
    .select({ bookId: collectionBooks.bookId })
    .from(collectionBooks)
    .where(eq(collectionBooks.collectionId, collectionId));

  const bookIdsInCollection = booksInCollection.map((b) => b.bookId);

  // Select all books NOT in that collection
  const remainingBooks = await db
    .select({
      id: books.id,
      title: books.title,
      author: books.author,
      coverImagePath: books.coverImagePath,
    })
    .from(books)
    .where(notInArray(books.id, bookIdsInCollection));

  return remainingBooks.map((b) => ({
    id: b.id,
    title: b.title,
    author: b.author,
    cover: b.coverImagePath || "/default-cover.jpg",
  }));
}
