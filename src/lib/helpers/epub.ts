import { DirEntry } from "@tauri-apps/plugin-fs";
import { loadEpubMetadata, type EpubMetadata } from "epubix";
import { readFile, BaseDirectory } from "@tauri-apps/plugin-fs";
import { getSettings } from "./settings";
import type { LibraryEpub } from "../types/epub";

export function filterEpubFiles(files: DirEntry[]) {
  return files.filter((file) => file.isFile && file.name.endsWith(".epub"));
}

export async function collectEpubs(files: DirEntry[]) {
  let epubs: LibraryEpub[] = [];

  const settings = await getSettings();

  for (const file of files) {
    const ep = await readFile(`${settings.libraryFolderPath}/${file.name}`, {
      baseDir: BaseDirectory.Document,
    });

    const epubMetadata = await loadEpubMetadata(ep);

    epubs.push(epubMetadata);
  }

  return epubs;
}
