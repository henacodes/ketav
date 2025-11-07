"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getBooksNotInCollection } from "@/db/services/collections.services";
import { BookSelector } from "@/components/BookSelector"; // import your generic selector
import { Book as DbBook } from "@/db/schema/book";
interface Book {
  id: number;
  title: string;
  author: string;
  cover: string;
}

interface Collection {
  id: number;
  name: string;
  description: string | null;
  books: Book[];
}

interface CollectionDetailViewProps {
  collection: Collection;
  onAddBook: (bookId: number) => void;
  onRemoveBook: (bookId: number) => void;
}

export function CollectionDetailView({
  collection,
  onAddBook,
  onRemoveBook,
}: CollectionDetailViewProps) {
  const [booksNotInCollection, setBooksNotInCollection] = useState<Book[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function fetchBooks() {
      const availableBooks = await getBooksNotInCollection(collection.id);
      setBooksNotInCollection(availableBooks);
    }
    fetchBooks();
  }, [collection.id, collection.books]);

  const filteredBooks = useMemo(() => {
    if (!searchTerm) return booksNotInCollection;
    return booksNotInCollection.filter(
      (b) =>
        b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.author.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, booksNotInCollection]);

  const handleAddBook = async (book: DbBook) => {
    await onAddBook(book.id);
    setBooksNotInCollection((prev) => prev.filter((b) => b.id !== book.id));
  };

  const handleRemoveBook = async (bookId: number) => {
    await onRemoveBook(bookId);
    const updatedBooks = await getBooksNotInCollection(collection.id);
    setBooksNotInCollection(updatedBooks);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          {collection.name}
        </h1>
        {collection.description && (
          <p className="text-muted-foreground">{collection.description}</p>
        )}
      </div>

      {/* Books in Collection */}
      <div className="mb-12">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Books in Collection ({collection.books.length})
        </h2>
        {collection.books.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collection.books.map((book) => (
                <TableRow key={book.id}>
                  <TableCell>{book.title}</TableCell>
                  <TableCell>{book.author}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      className=" text-destructive "
                      onClick={() => handleRemoveBook(book.id)}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground py-8">
            No books in this collection yet.
          </p>
        )}
      </div>

      {/* Add Books Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Add Books to Collection
        </h2>

        <BookSelector
          excludedBooks={booksNotInCollection.map((b) => b.id)} // filter only books not in collection
          onSelect={handleAddBook}
          trigger={<Button>Add Book</Button>}
        />
      </div>
    </div>
  );
}
