import { useEffect, useState } from "react";
import { readFile, BaseDirectory } from "@tauri-apps/plugin-fs";
import { LibraryEpub } from "@/lib/types/epub";
import { Book } from "@/db/schema";

function uint8ToBase64(u8: Uint8Array) {
  let binary = "";
  for (let i = 0; i < u8.length; i++) {
    binary += String.fromCharCode(u8[i]);
  }
  return window.btoa(binary);
}

export function useBookCovers(books: Book[], mimeType = "image/png") {
  const [coverUrls, setCoverUrls] = useState<(string | undefined)[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      books.map(async (book) => {
        if (!book.coverImagePath) return undefined;
        try {
          const bytes = await readFile(book.coverImagePath, {
            baseDir: BaseDirectory.AppData,
          });
          const base64 = uint8ToBase64(bytes);
          return `data:${mimeType};base64,${base64}`;
        } catch {
          return undefined;
        }
      })
    ).then((results) => {
      if (!cancelled) setCoverUrls(results);
    });
    return () => {
      cancelled = true;
    };
  }, [books, mimeType]);

  return coverUrls;
}
