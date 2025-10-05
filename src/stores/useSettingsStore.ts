import { getSettings } from "@/lib/helpers/settings";
import { Settings } from "@/lib/types/settings";
import { create } from "zustand";
import { load } from "@tauri-apps/plugin-store";
import { STORE_KEYS } from "@/lib/constants";

interface SettingsStore {
  settings: Settings | null;
  fetchSettings: () => Promise<void>;
  updateLibraryFolderPath: (path: string) => Promise<void>;
}

const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: {
    libraryFolderPath: "",
  },

  fetchSettings: async function () {
    const settings = await getSettings();
    set({ settings });
  },

  updateLibraryFolderPath: async (path: string) => {
    const store = await load("settings.json");
    await store.set(STORE_KEYS.libraryFolderPath, { value: path });
    await store.save();

    // Update local Zustand state too
    const current = get().settings;
    set({
      settings: {
        ...current,
        libraryFolderPath: path,
      },
    });
  },
}));

export default useSettingsStore;
