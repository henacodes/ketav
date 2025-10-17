import { db } from "..";
import { books, InsertBook } from "../schema";

export async function registerBook(input: InsertBook) {
  try {
    await db.insert(books).values({ ...input });
  } catch (error) {
    console.log("Failed to register a book: ", error);
  }
}

export async function fetchAllDbBooks() {
  const res = await db.select().from(books);

  return res;
}
