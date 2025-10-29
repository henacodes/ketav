import type { OpenEpub } from "@/lib/types/epub"; // existing import (if you have)
import type { OpenPdf } from "@/lib/types/pdf";
import { BaseDirectory, readFile } from "@tauri-apps/plugin-fs";
import { loadEpubBook } from "epubix";
import { create } from "zustand";
import useSettingsStore from "./useSettingsStore";
import { DEFAULT_LIBRARY_FOLDER_PATH, STORE_KEYS } from "@/lib/constants";
import { db } from "@/db";
import { books } from "@/db/schema";
import { eq } from "drizzle-orm";
// Optional: pdf metadata helper if you have one
import { getPdfMetadataFromArrayBuffer } from "@/lib/helpers/pdf";

type OpenBook = OpenEpub | OpenPdf;
interface ReaderStore {
  openBook: OpenBook | null; // <- changed from OpenEpub | null
  openChapterHref: string | null;
  isSettingsDialogOpen: boolean;
  setOpenBook: (fileName: string) => Promise<void>;
  setOpenChapterHref: (href: string) => void;
  toggleSettingsDialog: (state: boolean) => void;
  closeBook: () => void;
  loading: boolean;
  error: { message: string; detail?: string } | null;
}

export const useReaderStore = create<ReaderStore>((set) => ({
  loading: false,
  error: null,
  openBook: null,
  openChapterHref: null,
  isSettingsDialogOpen: false,
  closeBook: () => {
    set({ openBook: null, openChapterHref: null });
  },
  setOpenBook: async (fileName: string) => {
    const store = useSettingsStore.getState();
    let currentLibraryPath =
      store.settings?.libraryFolderPath || DEFAULT_LIBRARY_FOLDER_PATH;

    const bookInDb = await db.query.books.findFirst({
      where: eq(books.fileName, fileName),
    });

    if (!bookInDb) {
      set({
        error: {
          message: "Book not found!",
          detail:
            "The book you are trying to access doesn't exist in the local caching database",
        },
      });
      return;
    }

    try {
      const fileLower = (fileName || "").toLowerCase().trim();

      // PDF path (detect by extension)
      if (fileLower.endsWith(".pdf")) {
        // readFile to get Uint8Array
        const bytes = await readFile(`${currentLibraryPath}/${fileName}`, {
          baseDir: BaseDirectory.Document,
        });

        // Optionally extract metadata (title, author, pages)
        let pdfMeta = {
          title: bookInDb.title,
          author: bookInDb.author,
          pages: null,
        } as any;
        try {
          const md = await getPdfMetadataFromArrayBuffer(bytes);
          pdfMeta = {
            title: md.title ?? bookInDb.title,
            author: md.author ?? bookInDb.author,
            pages: md.pages ?? null,
            fileName,
          };
        } catch (mdErr) {
          // Non-fatal: keep fallback metadata from DB/filename
          pdfMeta = {
            title: bookInDb.title,
            author: bookInDb.author,
            fileName,
          };
        }

        const openPdf: OpenPdf = {
          type: "pdf",
          metadata: pdfMeta,
          fileBytes: bytes,
        };

        localStorage.setItem(STORE_KEYS.lastOpenedBook, fileName);
        set({ openBook: openPdf });
        return;
      }

      // Otherwise, assume EPUB (existing flow)
      const ep = await readFile(`${currentLibraryPath}/${fileName}`, {
        baseDir: BaseDirectory.Document,
      });

      const book = await loadEpubBook(ep);

      localStorage.setItem(STORE_KEYS.lastOpenedBook, fileName);

      // include discriminant type
      const openEpub: OpenEpub = {
        metadata: { ...book.metadata, fileName },
        book,
      };

      set({ openBook: openEpub });
    } catch (error: any) {
      set({
        error: {
          message: `Sorry, Couldn't open the book '${
            bookInDb?.title || "Unknown Title"
          }'`,
          detail:
            error?.message ||
            `It's probably deleted or that you have changed the path. Make sure the file exists inside 'Documents/${store.settings?.libraryFolderPath}'`,
        },
      });
    }
  },
  setOpenChapterHref: (href) => {
    set({ openChapterHref: href });
  },
  toggleSettingsDialog: (state) => {
    set({ isSettingsDialogOpen: state });
  },
}));
