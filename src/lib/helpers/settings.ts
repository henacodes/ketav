import { load } from "@tauri-apps/plugin-store";
import {
  DEFAULT_FONT_FAMILY,
  DEFAULT_LIBRARY_FOLDER_PATH,
  DEFAULT_TEXT_ALIGNMENT,
  STORE_KEYS,
} from "../constants";
import {
  AlignmentOptions,
  FontFamilyOptions,
  Settings,
} from "../types/settings";

export async function getSettings(): Promise<Settings> {
  const store = await load("settings.json");
  let libraryFolderPath = await store.get<{ value: string }>(
    STORE_KEYS.libraryFolderPath
  );
  let textAlignment = await store.get<{ value: AlignmentOptions }>(
    STORE_KEYS.textAlignment
  );

  let fontFamily = await store.get<{ value: FontFamilyOptions }>(
    STORE_KEYS.fontFamily
  );

  if (!libraryFolderPath?.value) {
    await store.set(STORE_KEYS.libraryFolderPath, DEFAULT_LIBRARY_FOLDER_PATH);
    libraryFolderPath = { value: DEFAULT_LIBRARY_FOLDER_PATH };
  }

  if (!textAlignment?.value) {
    await store.set(STORE_KEYS.textAlignment, DEFAULT_TEXT_ALIGNMENT);
    textAlignment = { value: DEFAULT_TEXT_ALIGNMENT };
  }
  if (!fontFamily?.value) {
    await store.set(STORE_KEYS.fontFamily, DEFAULT_TEXT_ALIGNMENT);
    fontFamily = { value: DEFAULT_FONT_FAMILY };
  }

  await store.save();

  return {
    libraryFolderPath: libraryFolderPath.value,
    textAlignment: textAlignment.value,
    fontFamily: fontFamily.value,
  };
}
