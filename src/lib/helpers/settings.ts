import { load } from "@tauri-apps/plugin-store";
import { DEFAULT_LIBRARY_FOLDER_PATH, STORE_KEYS } from "../constants";
import { Settings } from "../types/settings";

export async function getSettings(): Promise<Settings> {
  const store = await load("settings.json");
  let libraryFolderPath = await store.get<{ value: string }>(
    STORE_KEYS.libraryFolderPath
  );

  if (!libraryFolderPath?.value) {
    await store.set(STORE_KEYS.libraryFolderPath, DEFAULT_LIBRARY_FOLDER_PATH);
    libraryFolderPath = { value: DEFAULT_LIBRARY_FOLDER_PATH };
  }

  await store.save();

  return {
    libraryFolderPath: libraryFolderPath.value,
  };
}
