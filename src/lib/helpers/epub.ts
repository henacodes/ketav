import { DirEntry } from "@tauri-apps/plugin-fs";
import { EpubMetadata, loadEpubMetadata } from "epubix";
import { readFile, BaseDirectory } from "@tauri-apps/plugin-fs";
import { getSettings } from "./settings";
import type { LibraryEpub } from "../types/epub";
import { Epub } from "epubix";

export function filterEpubFiles(files: DirEntry[]) {
  return files.filter((file) => file.isFile && file.name.endsWith(".epub"));
}

export async function collectEpubs(files: DirEntry[]) {
  let epubs: LibraryEpub[] = [];

  const settings = await getSettings();

  for (const file of files) {
    try {
      const ep = await readFile(`${settings.libraryFolderPath}/${file.name}`, {
        baseDir: BaseDirectory.Document,
      });

      const epubMetadata = await loadEpubMetadata(ep);

      epubs.push({ ...epubMetadata, fileName: file.name });
    } catch (error) {
      console.log("FAILED AT", file.name);
    }
  }

  return epubs;
}

type BookIdParams = EpubMetadata & { fileName?: string };

export function generateBookId({
  title,
  author,
  cover,
  fileName,
}: BookIdParams): string {
  title = title || `${cover}` + `${fileName}`; // fallback to chapter and TOC length
  author = author || "";
  const normalize = (str: string) =>
    str
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

  const cleanAuthor = normalize(author);
  const cleanTitle = normalize(title);

  const combined = `${cleanAuthor}_${cleanTitle}`;

  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash * 31 + combined.charCodeAt(i)) >>> 0;
  }
  const shortHash = hash.toString(16).slice(0, 6);

  return `${combined}_${shortHash}`;
}
