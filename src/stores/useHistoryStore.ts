import { STORE_KEYS } from "@/lib/constants";
import { History, LastOpenedPage } from "@/lib/types/history";
import { create } from "zustand";
import { load, Store } from "@tauri-apps/plugin-store";

interface HistoryStore {
  history: History;
  addLastOpenedPage: (params: {
    fileName: string;
    pageNum: number;
  }) => Promise<void>;
  findLastOpenedPage: (fileName: string) => number | null;
  loadHistory: () => Promise<void>;
  setLastOpenedBook: (fileName: string) => Promise<void>;
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  history: { lastOpenedPages: [], lastOpenedBookFileName: "" },

  loadHistory: async () => {
    const store: Store = await load("history.json");

    const lastOpenedBook = await store.get<{ fileName: string }>(
      STORE_KEYS.lastOpenedBook
    );
    const pages = await store.get<{ lastOpenedPages: LastOpenedPage[] }>(
      STORE_KEYS.lastOpenedPage
    );

    set({
      history: {
        lastOpenedBookFileName: lastOpenedBook?.fileName || "",
        lastOpenedPages: pages?.lastOpenedPages || [],
      },
    });
  },

  addLastOpenedPage: async ({ fileName, pageNum }) => {
    const { history } = get();
    const store: Store = await load("history.json");

    const filtered: LastOpenedPage[] = history.lastOpenedPages.filter(
      (record) => !Object.prototype.hasOwnProperty.call(record, fileName)
    );

    const updatedPages: LastOpenedPage[] = [
      ...filtered,
      { [fileName]: pageNum },
    ];

    // Save each key separately
    await store.set(STORE_KEYS.lastOpenedBook, { fileName });
    await store.set(STORE_KEYS.lastOpenedPage, {
      lastOpenedPages: updatedPages,
    });
    await store.save();

    set({
      history: {
        lastOpenedBookFileName: fileName,
        lastOpenedPages: updatedPages,
      },
    });
  },

  findLastOpenedPage: (fileName) => {
    const { history } = get();
    const record = history.lastOpenedPages.find((r) =>
      Object.prototype.hasOwnProperty.call(r, fileName)
    );
    return record ? record[fileName] ?? null : null;
  },
  setLastOpenedBook: async (fileName: string) => {
    const store = await load("history.json");
    await store.set(STORE_KEYS.lastOpenedBook, { fileName });
    await store.save();
    set((state) => ({
      history: { ...state.history, lastOpenedBookFileName: fileName },
    }));
  },
}));
