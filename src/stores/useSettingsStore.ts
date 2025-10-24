import { getSettings } from "@/lib/helpers/settings";
import { Settings } from "@/lib/types/settings";
import { create } from "zustand";
import { load } from "@tauri-apps/plugin-store";
import {
  DEFAULT_FONT_FAMILY,
  DEFAULT_LIBRARY_FOLDER_PATH,
  DEFAULT_TEXT_ALIGNMENT,
  STORE_KEYS,
} from "@/lib/constants";

interface SettingsStore {
  settings: Settings | null;
  fetchSettings: () => Promise<void>;
  updateSetting: <K extends keyof Settings>(
    key: K,
    value: Settings[K]
  ) => Promise<void>;
}

const defaultSettings = {
  libraryFolderPath: DEFAULT_LIBRARY_FOLDER_PATH,
  textAlignment: DEFAULT_TEXT_ALIGNMENT,
  fontFamily: DEFAULT_FONT_FAMILY,
};

const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: defaultSettings,
  fetchSettings: async () => {
    const settings = await getSettings();
    console.log("FETCHED SETTINGS", settings);
    set({ settings });
  },

  updateSetting: async (key, value) => {
    try {
      const store = await load("settings.json");
      await store.set(STORE_KEYS[key], { value });
      await store.save();

      const current = get().settings ?? defaultSettings;

      set({
        settings: {
          ...current,
          [key]: value,
        },
      });
    } catch (err) {
      console.error(`Failed to update setting "${String(key)}":`, err);
    }
  },
}));

export default useSettingsStore;
