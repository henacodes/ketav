import { BaseDirectory, create, exists, mkdir } from "@tauri-apps/plugin-fs";
import { BOOK_COVER_IMAGE_FOLDER } from "../constants";

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
