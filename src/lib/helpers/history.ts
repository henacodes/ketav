import { load } from "@tauri-apps/plugin-store";
import { History, LastOpenedPage } from "../types/history";
import { STORE_KEYS } from "../constants";

export async function getHistory(): Promise<History> {
  const store = await load("history.json");

  let lastOpenedBookFileName = await store.get<{ fileName: string }>(
    STORE_KEYS.lastOpenedBook
  );

  let result = await store.get<{ lastOpenedPages: LastOpenedPage[] }>(
    STORE_KEYS.lastOpenedPage
  );

  return {
    lastOpenedBookFileName: lastOpenedBookFileName?.fileName || "",
    lastOpenedPages: result?.lastOpenedPages || [],
  };
}
