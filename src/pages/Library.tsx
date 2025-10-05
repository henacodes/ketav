import { useEffect, useState } from "react";
import { readDir, BaseDirectory } from "@tauri-apps/plugin-fs";
import { collectEpubs, filterEpubFiles } from "@/lib/helpers/epub";
import type { LibraryEpub } from "@/lib/types/epub";
import useSettingsStore from "@/stores/useSettingsStore";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Clock, CheckCircle2 } from "lucide-react";
import { BookCardSkeleton } from "@/components/BookCardSkeleton";
import { useReaderStore } from "@/stores/useReaderStore";
import { useNavigate } from "react-router";

export function LibraryPage() {
  const navigate = useNavigate();

  const [libraryBooks, setLibraryBooks] = useState<LibraryEpub[]>([]);
  const [loading, setLoading] = useState(false);
  const { settings, fetchSettings } = useSettingsStore((state) => state);
  const setOpenBook = useReaderStore((state) => state.setOpenBook);

  function handleOpenBook(epubMetadata: LibraryEpub) {
    setOpenBook(epubMetadata);
    navigate("/");
  }

  useEffect(() => {
    fetchSettings();

    async function fetchLibraryBooks() {
      setLoading(true);
      try {
        if (!settings?.libraryFolderPath) return;

        const entries = await readDir(settings.libraryFolderPath, {
          baseDir: BaseDirectory.Document,
        });

        const filteredFiles = filterEpubFiles(entries);
        const epubs = await collectEpubs(filteredFiles);

        setLibraryBooks(epubs);
      } catch (error) {
        console.error("Failed to read library:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchLibraryBooks();
  }, [fetchSettings, settings?.libraryFolderPath]);

  return (
    <div className="max-w-6xl  p-8">
      <h1 className="text-3xl font-bold mb-2 text-foreground">My Library</h1>
      <p className="text-muted-foreground mb-8">Your personal collection</p>
      {libraryBooks.length === 0 && !loading && (
        <p className="text-gray-500">No books found in your library.</p>
      )}
      <div className="grid mt-5 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {loading && (
          <>
            {[...Array(4)].map((_, i) => (
              <BookCardSkeleton key={i} />
            ))}
          </>
        )}
        {libraryBooks.map((book, index) => (
          <Card
            key={index}
            className="overflow-hidden bg-card border-border hover:border-primary/50 transition-colors"
          >
            <div className="aspect-[2/3] bg-muted relative">
              {book.coverBase64 ? (
                <img
                  src={book.coverBase64}
                  alt={book.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src="/epub.svg"
                  alt="No cover"
                  className="w-24 h-24 object-contain opacity-50 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                />
              )}

              {/* Progress / completed badge commented for now */}
              {/*
                {book.progress === 100 && (
                  <div className="absolute top-2 right-2 bg-primary/90 rounded-full p-1">
                    <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
                */}
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-foreground mb-1 line-clamp-1">
                {book.title}
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                {book.author}
              </p>

              {/* Progress bar commented for now */}
              {/*
                {book.progress > 0 && book.progress < 100 && (
                  <>
                    <div className="w-full bg-muted rounded-full h-2 mb-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${book.progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      {book.progress}% complete
                    </p>
                  </>
                )}
                */}

              <Button
                onClick={() => handleOpenBook(book)}
                variant="outline"
                size="sm"
                className="w-full"
              >
                {/* Progress / reading status commented for now */}
                {/*
                  {book.progress === 100 ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Completed
                    </>
                  ) : book.progress > 0 ? (
                    <>
                      <BookOpen className="w-4 h-4 mr-2" />
                      Continue Reading
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4 mr-2" />
                      Start Reading
                    </>
                  )}
                  */}
                Open
              </Button>
            </div>
          </Card>
        ))}
      </div>
      )
    </div>
  );
}
