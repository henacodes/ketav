import { getSettings } from "@/lib/helpers/settings";
import { Settings } from "@/lib/types/settings";
import { create } from "zustand";

interface SettingsStore {
  settings: Settings | null;

  fetchSettings: () => Promise<void>;
}

const useSettingsStore = create<SettingsStore>((set) => ({
  settings: {
    libraryFolderPath: "",
  },
  fetchSettings: async () => {
    const settings = await getSettings();
    set({ settings });
  },
}));

export default useSettingsStore;
