"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchAllDbBooks } from "@/db/services/books.services";
import { useBookCovers } from "@/hooks/useBookCover";
import { Book } from "@/db/schema";

interface BookSelectorProps {
  onSelect: (book: Book) => void;
  excludedBooks?: number[];
  trigger?: React.ReactNode;
}

export function BookSelector({
  onSelect,
  excludedBooks,
  trigger,
}: BookSelectorProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [open, setOpen] = useState(false);

  const coverImages = useBookCovers(filteredBooks, "image/jpeg");

  useEffect(() => {
    async function fetchBooks() {
      setLoading(true);
      try {
        let allBooks = await fetchAllDbBooks();
        setBooks(allBooks);

        if (excludedBooks) {
          allBooks = allBooks.filter((b) => !excludedBooks.includes(b.id));
        }
        console.log("filters books", allBooks);
        setFilteredBooks(allBooks);
      } catch (err) {
        console.error("Error fetching books:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchBooks();
  }, []);
  /* 
  useEffect(() => {
    if (!searchTerm) {
      setFilteredBooks(books);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredBooks(
        books.filter(
          (b) =>
            b.title.toLowerCase().includes(term) ||
            b.author.toLowerCase().includes(term)
        )
      );
    }
  }, [searchTerm, books]); */

  useEffect(() => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      setFilteredBooks(
        books.filter(
          (b) =>
            b.title.toLowerCase().includes(term) ||
            b.author.toLowerCase().includes(term)
        )
      );
    }
  }, [searchTerm]);
  const handleConfirm = () => {
    if (selectedBook) {
      onSelect(selectedBook);
      setSelectedBook(null);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button>Select Book</Button>}
      </DialogTrigger>

      <DialogContent className="max-w-2xl w-full">
        <DialogHeader>
          <DialogTitle>Select a Book</DialogTitle>
        </DialogHeader>

        <div className="mb-4">
          <Input
            placeholder="Search by title or author"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <p className="text-center py-8">Loading books...</p>
        ) : filteredBooks.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            No books found
          </p>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto border border-border rounded-md">
            {filteredBooks.map((book, index) => (
              <div
                key={book.id}
                onClick={() => setSelectedBook(book)}
                className={`flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-accent  transition-colors ${
                  selectedBook?.id === book.id ? "bg-primary/20" : ""
                }`}
              >
                <div className="shrink-0 w-12 h-16 bg-muted rounded overflow-hidden">
                  <img
                    src={coverImages[index] || "/placeholder.svg"}
                    alt={book.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">{book.title}</span>
                  <span className="text-sm text-muted-foreground">
                    {book.author}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="mt-4 flex justify-between">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedBook}
            className="ml-auto"
          >
            Confirm Selection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
