import {
  BaseDirectory,
  create,
  exists,
  mkdir,
  readDir,
} from "@tauri-apps/plugin-fs";
import { BOOK_COVER_IMAGE_FOLDER } from "../constants";
import useSettingsStore from "@/stores/useSettingsStore";

import {
  collectEpubs,
  filterEpubFiles,
  generateBookId,
} from "@/lib/helpers/epub";
import { registerBook } from "@/db/services/books.services";
import { Settings } from "../types/settings";

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

    const filteredFiles = filterEpubFiles(entries);
    const epubs = await collectEpubs(filteredFiles);

    epubs.forEach(async (epub) => {
      const bookId = generateBookId({ ...epub });
      // console.log("book ", ep.title, bookId);
      let imgPath = "";

      if (epub.coverBase64) {
        try {
          imgPath = await saveImage(epub.coverBase64, epub.fileName);
          console.log("image path", imgPath);
        } catch (error: any) {
          console.log("Failed to save the image", error);
        }
      }

      console.log("file name", epub.fileName);
      await registerBook({
        title: epub.title || "",
        author: epub.author || "",
        bookId,
        coverImagePath: imgPath,
        fileName: epub.fileName,
      });
    });
  } catch (error) {
    console.error("Failed to read library:", error);
  }
}

export async function saveImage(base64Data: string, fileName: string) {
  const binary = base64ToUint8Array(base64Data);
  const imgExtension = getExtensionFromBase64(base64Data);

  let imgFileName = changeFileExtension(fileName, imgExtension).replace(
    " ",
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
