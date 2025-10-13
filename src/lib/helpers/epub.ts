import { DirEntry } from "@tauri-apps/plugin-fs";
import { loadEpubMetadata } from "epubix";
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

      console.log("Load epub metadata", epubMetadata);

      epubs.push({ ...epubMetadata, fileName: file.name });
    } catch (error) {
      console.log("FAILED AT", file.name);
    }
  }

  console.log("epubsss", epubs);

  return epubs;
}
/* 
export function filterTocByChapters(
  toc: TocEntry[],
  chapters: EpubChapter[]
): TocEntry[] {
  const cleanHref = (href: string) => href.split("#")[0];
  const seen = new Set<string>();

  // Process recursively but from last to first so earlier duplicates are removed
  const processToc = (entries: TocEntry[]): TocEntry[] => {
    const result: TocEntry[] = [];

    for (let i = entries.length - 1; i >= 0; i--) {
      const entry = entries[i];
      const href = cleanHref(entry.href);
      const hasChapter = chapters.some((c) => c.href === href);

      let children: TocEntry[] | undefined;
      if (entry.children && entry.children.length > 0) {
        children = processToc(entry.children);
      }

      // Only keep if not seen, has chapter, or has children
      if (
        !seen.has(href) &&
        (hasChapter || (children && children.length > 0))
      ) {
        seen.add(href);
        result.unshift({ ...entry, href, children });
      }
    }

    return result;
  };

  return processToc(toc);
} */

export function generateBookId(book: Epub): string {
  const title =
    book.metadata?.title || `${book.chapters.length}` + `${book.toc.length}`; // fallback to chapter and TOC length
  const author = book.metadata?.author || "";
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
