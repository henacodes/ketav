import type { OpenEpub } from "@/lib/types/epub";
import { BaseDirectory, readFile } from "@tauri-apps/plugin-fs";
import { loadEpubBook } from "epubix";
import { create } from "zustand";
import useSettingsStore from "./useSettingsStore";
import { DEFAULT_LIBRARY_FOLDER_PATH, STORE_KEYS } from "@/lib/constants";
import { db } from "@/db";
import { books } from "@/db/schema";
import { eq } from "drizzle-orm";

interface ReaderStore {
  openBook: OpenEpub | null;
  openChapterHref: string | null;
  isSettingsDialogOpen: boolean;
  setOpenBook: (fileName: string) => Promise<void>;
  setOpenChapterHref: (href: string) => void;
  toggleSettingsDialog: (state: boolean) => void;
  loading: boolean;
  error: { message: string; detail?: string } | null;
}

export const useReaderStore = create<ReaderStore>((set) => ({
  loading: false,
  error: null,
  openBook: null,
  openChapterHref: null,
  isSettingsDialogOpen: false,
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
            "The book you are tring to access doesnt exist in the local caching database",
        },
      });
    }

    try {
      const ep = await readFile(`${currentLibraryPath}/${fileName}`, {
        baseDir: BaseDirectory.Document,
      });

      const book = await loadEpubBook(ep);

      localStorage.setItem(STORE_KEYS.lastOpenedBook, fileName);

      set({ openBook: { metadata: { ...book.metadata, fileName }, book } });
    } catch (error: any) {
      set({
        error: {
          message: `Sorry, Couldn't open the book '${
            bookInDb?.title || "Unknown Title"
          }'`,
          detail:
            error.message ||
            `Its probably deleted or that you have since changed the path to somewhere else. \n Make sure the file exists inside 'Documents/${store.settings?.libraryFolderPath}' `,
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
