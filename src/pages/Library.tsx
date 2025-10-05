import { useEffect, useState } from "react";
import { readDir, BaseDirectory } from "@tauri-apps/plugin-fs";

import { collectEpubs, filterEpubFiles } from "@/lib/helpers/epub";
import type { LibraryEpub } from "@/lib/types/epub";
import useSettingsStore from "@/stores/useSettingsStore";
import { EpubMetadata } from "epubix";

export function LibraryPage() {
  const [libraryBooks, setLibraryBooks] = useState<LibraryEpub[]>([]);

  const { settings, fetchSettings } = useSettingsStore((state) => state);

  useEffect(() => {
    fetchSettings();
    async function fetchLibraryBooks() {
      try {
        const entries = await readDir(settings?.libraryFolderPath || "books", {
          baseDir: BaseDirectory.Document,
        });

        const filteredFiles = filterEpubFiles(entries);
        const epubs = await collectEpubs(filteredFiles);

        setLibraryBooks(epubs);
      } catch (error) {
        console.error("Failed to read library:", error);
      }
    }

    if (settings?.libraryFolderPath) {
      fetchLibraryBooks();
    }
  }, [fetchSettings, settings?.libraryFolderPath]);

  return (
    <div className="p-6 min-h-screen ">
      <h1 className="text-3xl font-bold mb-6">Library</h1>

      {libraryBooks.length === 0 ? (
        <p className="text-gray-500">No books found in your library.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {libraryBooks.map((book, index) => (
            <div
              key={index}
              className=" bg-accent rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-200"
            >
              <div className="w-full h-60 bg-gray-200 flex items-center justify-center overflow-hidden">
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
                    className="w-24 h-24 object-contain opacity-50"
                  />
                )}
              </div>
              <div className="p-4">
                <h2 className="text-lg font-semibold mb-1">{book.title}</h2>
                <p className="text-gray-500 text-sm">{book.author}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
