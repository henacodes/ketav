import type { LibraryEpub, OpenEpub } from "@/lib/types/epub";
import { BaseDirectory, readFile } from "@tauri-apps/plugin-fs";
import { loadEpubBook } from "epubix";
import { create } from "zustand";
import useSettingsStore from "./useSettingsStore";
import { DEFAULT_LIBRARY_FOLDER_PATH } from "@/lib/constants";

interface ReaderStore {
  openBook: OpenEpub | null;
  openChapterHref: string | null;
  setOpenBook: (epubMetadata: LibraryEpub) => Promise<void>;
  setOpenChapterHref: (href: string) => void;
  loading: boolean;
  error: { message: string; detail?: string } | null;
}

export const useReaderStore = create<ReaderStore>((set, get) => ({
  loading: false,
  error: null,
  openBook: null,
  openChapterHref: null,
  setOpenBook: async (epubMetadata) => {
    const store = useSettingsStore.getState();
    let currentLibraryPath =
      store.settings?.libraryFolderPath || DEFAULT_LIBRARY_FOLDER_PATH;

    try {
      const ep = await readFile(
        `${currentLibraryPath}/${epubMetadata.fileName}`,
        {
          baseDir: BaseDirectory.Document,
        }
      );

      const book = await loadEpubBook(ep);

      set({ openBook: { metadata: epubMetadata, book } });
    } catch (error: any) {
      set({
        error: {
          message: "Sorry, Couldn't open the book",
          detail: error.message,
        },
      });
    }
  },
  setOpenChapterHref: (href) => {
    set({ openChapterHref: href });
  },
}));
