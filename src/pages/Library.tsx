import { useEffect, useState } from "react";
import { readDir, BaseDirectory } from "@tauri-apps/plugin-fs";

import { collectEpubs, filterEpubFiles } from "@/lib/helpers/epub";
import type { LibraryEpub } from "@/lib/types/epub";
import useSettingsStore from "@/stores/useSettingsStore";

export function LibraryPage() {
  const [libraryBooks, setLibraryBooks] = useState<LibraryEpub[]>([]);

  const { settings, fetchSettings } = useSettingsStore((state) => state);

  useEffect(() => {
    fetchSettings();
    console.log("hello effect", settings);
    async function fetchLibraryBooks() {
      console.log("fetchhhhh");

      try {
        const entries = await readDir(settings?.libraryFolderPath || "books", {
          baseDir: BaseDirectory.Document,
        });

        let filteredFiles = filterEpubFiles(entries);

        const epubs = await collectEpubs(filteredFiles);

        console.log("eEPUBS METADATA", epubs);
      } catch (error) {
        console.log(error);
        throw new Error("Failed to read file");
      }
    }
    fetchLibraryBooks();
  }, [fetchSettings]);
  return (
    <div style={{ height: "100vh" }}>
      <p>Library</p>
      {libraryBooks.map((b) => (
        <p>{b.name}</p>
      ))}
    </div>
  );
}
