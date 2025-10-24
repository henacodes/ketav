import { useEffect, useState } from "react";
import useSettingsStore from "@/stores/useSettingsStore";
import { BookCardSkeleton } from "@/components/BookCardSkeleton";
import { Link } from "react-router";
import { MoveRight, RefreshCcw } from "lucide-react";
import BookCard from "@/components/BookCard";
import { syncBooksInFileSystemWithDb } from "@/lib/helpers/fs";
import { fetchAllDbBooks } from "@/db/services/books.services";
import { useBookCovers } from "@/hooks/useBookCover";
import { Book } from "@/db/schema";
import { Button } from "@/components/ui/button";

export function LibraryPage() {
  const [libraryBooks, setLibraryBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const { settings, fetchSettings } = useSettingsStore((state) => state);

  const coverImages = useBookCovers(libraryBooks, "image/jpeg");

  // Fetch books from DB (no sync)
  async function fetchBooksFromDb() {
    setLoading(true);
    try {
      const booksInDb = await fetchAllDbBooks();
      setLibraryBooks(booksInDb);
      return booksInDb;
    } catch (error) {
      console.log("Error fetching books from DB:", error);
      return [];
    } finally {
      setLoading(false);
    }
  }

  // Sync file system with DB, then fetch
  async function syncAndFetchBooks() {
    setLoading(true);
    try {
      await syncBooksInFileSystemWithDb({ settings });
      const booksInDb = await fetchAllDbBooks();
      setLibraryBooks(booksInDb);
    } catch (error) {
      console.log("Error syncing the DB", error);
    } finally {
      setLoading(false);
    }
  }

  // Initial effect: only sync if DB is empty
  useEffect(() => {
    async function init() {
      const books = await fetchBooksFromDb();
      if (books.length === 0) {
        await syncAndFetchBooks();
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.libraryFolderPath]);

  return (
    <div className="p-8">
      <div className=" flex items-center justify-between ">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-foreground">
            My Library
          </h1>
          <p className="text-muted-foreground mb-8">Your personal collection</p>
        </div>
        <Button onClick={syncAndFetchBooks} disabled={loading}>
          <RefreshCcw />
          Sync Library
        </Button>
      </div>

      {libraryBooks.length === 0 && !loading && (
        <p className="text-gray-500 flex items-center">
          No books found in your library. Perhaps change your library folder to
          somewhere else
          <Link
            className="mx-3 text-primary flex items-center gap-2"
            to={"/settings"}
          >
            here
            <MoveRight />
          </Link>
        </p>
      )}
      <div className="grid mt-5 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6 w-full">
        {loading && (
          <>
            {[...Array(4)].map((_, i) => (
              <BookCardSkeleton key={i} />
            ))}
          </>
        )}
        {libraryBooks.map((book, index) => (
          <BookCard
            book={book}
            index={index}
            imgSrc={coverImages[index]}
            key={book.bookId}
          />
        ))}
      </div>
    </div>
  );
}
