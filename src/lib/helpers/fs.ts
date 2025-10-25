/**
 * Updated sync-books helper that supports both EPUB and PDF files.
 *
 * - Scans the configured library folder (Tauri BaseDirectory.Document)
 * - Handles .epub files via existing collectEpubs/filterEpubFiles helpers
 * - Handles .pdf files using pdfjs-based helpers in src/lib/helpers/pdf.ts
 * - Saves generated cover images into the same cover-folder as before
 * - Registers books in the DB with the same registerBook() call
 *
 * Notes:
 * - This code runs in renderer (it uses @tauri-apps/plugin-fs). If you move it to a main/Rust side,
 *   adapt file-reading calls accordingly.
 */

import {
  BaseDirectory,
  create,
  exists,
  mkdir,
  readDir,
  readFile,
} from "@tauri-apps/plugin-fs";
import { BOOK_COVER_IMAGE_FOLDER } from "../constants";

import {
  collectEpubs,
  filterEpubFiles,
  generateBookId as generateEpubBookId,
} from "@/lib/helpers/epub";
import { registerBook } from "@/db/services/books.services";
import { Settings } from "../types/settings";
import {
  getPdfMetadataFromArrayBuffer,
  getPdfCoverImageFromArrayBuffer,
} from "./pdf";

export function getFileExtension(fileName: string): string | null {
  const parts = fileName.split(".");
  if (parts.length <= 1) return null; // no extension
  return parts.pop() || null; // return last part
}

export async function syncBooksInFileSystemWithDb({
  settings,
}: {
  settings: Settings | null;
}) {
  try {
    if (!settings?.libraryFolderPath) return;

    console.log("LIBRARY FOLDER", settings.libraryFolderPath);
    const entries = await readDir(settings.libraryFolderPath, {
      baseDir: BaseDirectory.Document,
    });

    // 1) Process EPUBs (existing flow)
    const filteredEpubFiles = filterEpubFiles(entries);
    const epubs = await collectEpubs(filteredEpubFiles);

    // Register EPUBs (same as before)
    for (const epub of epubs) {
      try {
        const bookId = generateEpubBookId({ ...epub });
        let imgPath = "";

        if (epub.coverBase64) {
          try {
            imgPath = await saveImage(epub.coverBase64, epub.fileName);
          } catch (error: any) {
            console.log("Failed to save EPUB cover image", error);
          }
        }

        await registerBook({
          title: epub.title || epub.fileName || "",
          author: epub.author || "",
          bookId,
          coverImagePath: imgPath,
          fileName: epub.fileName,
        });
      } catch (err) {
        console.error("Failed to register epub", epub.fileName, err);
      }
    }

    // 2) Process PDFs
    const pdfEntries = entries.filter((e) => {
      const name = (e.name || "").toLowerCase();
      return name.endsWith(".pdf");
    });

    for (const e of pdfEntries) {
      try {
        // readFile returns Uint8Array
        const binary = await readFile(
          `${settings.libraryFolderPath}/${e.name}`,
          {
            baseDir: BaseDirectory.Document,
          }
        );
        // generate metadata and cover
        const metadata = await getPdfMetadataFromArrayBuffer(binary);
        const coverBase64 = await getPdfCoverImageFromArrayBuffer(binary, {
          page: 1,
          scale: 1.5,
        });

        // generate a stable bookId (you may want to use pdf metadata or filename)
        const bookIdSeed = {
          title: metadata.title ?? e.name,
          author: metadata.author ?? "",
          cover: coverBase64 ?? "",
        };
        // Reuse the same generateBookId function so IDs are consistent with your existing scheme
        const bookId = generateEpubBookId(bookIdSeed as any);

        // save cover image to app storage
        let imgPath = "";
        if (coverBase64) {
          try {
            imgPath = await saveImage(coverBase64, e.name);
          } catch (error: any) {
            console.log("Failed to save PDF cover image", error);
          }
        }

        await registerBook({
          title: metadata.title ?? e.name,
          author: metadata.author ?? "",
          bookId,
          coverImagePath: imgPath,
          fileName: e.name,
        });
      } catch (err) {
        console.error("Failed to process PDF", e.name, err);
      }
    }
  } catch (error) {
    console.error("Failed to read library:", error);
  }
}

/**
 * saveImage, base64ToUint8Array, changeFileExtension, getExtensionFromBase64
 * Kept here to avoid circular imports; you can move these to a shared util file.
 */

export async function saveImage(base64Data: string, fileName: string) {
  const binary = base64ToUint8Array(base64Data);
  const imgExtension = getExtensionFromBase64(base64Data);

  let imgFileName = changeFileExtension(fileName, imgExtension).replace(
    / /g,
    "_"
  );
  const fullPath = `${BOOK_COVER_IMAGE_FOLDER}/${imgFileName}`;

  const coverDirExists = await exists(BOOK_COVER_IMAGE_FOLDER, {
    baseDir: BaseDirectory.AppData,
  });

  if (!coverDirExists) {
    await mkdir(BOOK_COVER_IMAGE_FOLDER, {
      baseDir: BaseDirectory.AppData,
    });
  }

  const file = await create(fullPath, { baseDir: BaseDirectory.AppData });
  await file.write(binary);
  await file.close();

  return fullPath;
}

function base64ToUint8Array(base64Data: string) {
  // Remove "data:image/...;base64," if present
  const base64 = base64Data.split(",")[1] ?? base64Data;
  // atob is available in the renderer
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

function changeFileExtension(fileName: string, newExt: string) {
  const baseName = fileName.replace(/\.[^/.]+$/, "");
  return `${baseName}.${newExt}`;
}

function getExtensionFromBase64(base64Data: string) {
  const match = base64Data.match(/^data:(image\/[a-zA-Z]+);base64,/);
  if (!match) return "jpg"; // default
  const mimeType = match[1]; // e.g., "image/png"
  return mimeType.split("/")[1]; // "png"
}
