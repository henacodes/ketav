import { useEffect, useState } from "react";
import { readDir, BaseDirectory } from "@tauri-apps/plugin-fs";
import {
  collectEpubs,
  filterEpubFiles,
  generateBookId,
} from "@/lib/helpers/epub";
import type { LibraryEpub } from "@/lib/types/epub";
import useSettingsStore from "@/stores/useSettingsStore";
import { BookCardSkeleton } from "@/components/BookCardSkeleton";
import { Link } from "react-router";
import { MoveRight } from "lucide-react";
import BookCard from "@/components/BookCard";
import { saveImage } from "@/lib/helpers/fs";
import { InsertBook } from "@/db/schema";
import { registerBook } from "@/db/services/books.services";

export function LibraryPage() {
  const [libraryBooks, setLibraryBooks] = useState<LibraryEpub[]>([]);
  const [loading, setLoading] = useState(false);
  const { settings, fetchSettings } = useSettingsStore((state) => state);

  useEffect(() => {
    fetchSettings();

    async function fetchLibraryBooks() {
      setLoading(true);
      try {
        if (!settings?.libraryFolderPath) return;

        console.log("LIBRARY FOLDER", settings.libraryFolderPath);
        const entries = await readDir(settings.libraryFolderPath, {
          baseDir: BaseDirectory.Document,
        });

        const filteredFiles = filterEpubFiles(entries);
        const epubs = await collectEpubs(filteredFiles);

        epubs.forEach(async (epub) => {
          const bookId = generateBookId({ ...epub });
          // console.log("book ", ep.title, bookId);
          let imgPath = "";

          if (epub.coverBase64) {
            try {
              imgPath = await saveImage(epub.coverBase64, epub.fileName);
              console.log("image path", imgPath);
            } catch (error: any) {
              console.log("Failed to save the image", error);
            }
          }

          console.log("file name", epub.fileName);
          await registerBook({
            title: epub.title || "",
            author: epub.author || "",
            bookId,
            coverImagePath: imgPath,
            fileName: epub.fileName,
          });
        });

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
    <div className="  p-8">
      <img
        src="/home/kirakos/.local/share/com.kirakos.ketav/covers/The_Resurrection of Jesus (_ (Z-Library).jpeg"
        alt=""
      />
      <h1 className="text-3xl font-bold mb-2 text-foreground">My Library</h1>
      <p className="text-muted-foreground mb-8">Your personal collection</p>
      {libraryBooks.length === 0 && !loading && (
        <p className="text-gray-500 flex items-center  ">
          No books found in your library. Perhaps change your library folder to
          somewhere else
          <Link
            className=" mx-3 text-primary flex items-center   gap-2  "
            to={"/settings"}
          >
            {" "}
            here
            <MoveRight />
          </Link>{" "}
        </p>
      )}
      <div className="grid mt-5 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6  gap-6 w-full  ">
        {loading && (
          <>
            {[...Array(4)].map((_, i) => (
              <BookCardSkeleton key={i} />
            ))}
          </>
        )}
        {libraryBooks.map((book, index) => (
          <BookCard book={book} index={index} />
        ))}
      </div>
    </div>
  );
}
