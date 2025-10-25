/**
 * Lightweight PDF helpers for use in the renderer (Tauri/Electron/web).
 *
 * Exposes helpers that accept an ArrayBuffer (or Uint8Array) and:
 * - extract a small set of metadata (title, author, pages, dates)
 * - render the first page to a JPEG data URL (thumbnail / cover)
 *
 * Notes:
 * - This file uses pdfjs-dist. It purposely keeps a very small surface (no React).
 * - It returns data URLs for cover images (so sync-books.ts can call saveImage()).
 */

import * as pdfjsLib from "pdfjs-dist";
// If your bundler needs worker configured, do it once globally in your app bootstrap:
// import workerSrc from "pdfjs-dist/build/pdf.worker.entry";
// pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc as unknown as string;

export type PdfMetadata = {
  title?: string | null;
  author?: string | null;
  subject?: string | null;
  keywords?: string | null;
  creator?: string | null;
  producer?: string | null;
  creationDate?: string | null;
  modDate?: string | null;
  pages: number;
};

function toArrayBuffer(u8: Uint8Array | ArrayBuffer): ArrayBuffer {
  if (u8 instanceof ArrayBuffer) return u8;
  return new Uint8Array(u8).buffer;
}

/**
 * Extract minimal metadata from a PDF ArrayBuffer.
 */
export async function getPdfMetadataFromArrayBuffer(
  buf: Uint8Array | ArrayBuffer
): Promise<PdfMetadata> {
  const arrayBuffer = toArrayBuffer(buf);
  const loadingTask = (pdfjsLib as any).getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  try {
    const md = await pdf
      .getMetadata()
      .catch(() => ({ info: {}, metadata: null }));
    const info = md?.info ?? {};
    return {
      title: info?.Title ?? null,
      author: info?.Author ?? null,
      subject: info?.Subject ?? null,
      keywords: info?.Keywords ?? null,
      creator: info?.Creator ?? null,
      producer: info?.Producer ?? null,
      creationDate: info?.CreationDate ?? null,
      modDate: info?.ModDate ?? null,
      pages: pdf.numPages,
    };
  } finally {
    try {
      await pdf.destroy();
    } catch {
      /* ignore */
    }
  }
}

/**
 * Render the first PDF page (or page=1) to a JPEG data URL.
 * Returns a string like "data:image/jpeg;base64,...."
 *
 * scale controls resolution; 1.0 is native, 1.5..2.0 produce sharper thumbnails.
 */
export async function getPdfCoverImageFromArrayBuffer(
  buf: Uint8Array | ArrayBuffer,
  { page = 1, scale = 1.5 }: { page?: number; scale?: number } = {}
): Promise<string> {
  const arrayBuffer = toArrayBuffer(buf);
  const loadingTask = (pdfjsLib as any).getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  try {
    const pdfPage = await pdf.getPage(page);
    const viewport = pdfPage.getViewport({ scale });
    // create canvas
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context not available");

    // size canvas for device pixel ratio to improve sharpness on high-DPI screens
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(viewport.width * dpr);
    canvas.height = Math.round(viewport.height * dpr);
    canvas.style.width = `${Math.round(viewport.width)}px`;
    canvas.style.height = `${Math.round(viewport.height)}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, viewport.width, viewport.height);

    await pdfPage.render({ canvasContext: ctx, viewport }).promise;

    // encode as JPEG (smaller than PNG), quality 0.85
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    return dataUrl;
  } finally {
    try {
      await pdf.destroy();
    } catch {
      /* ignore */
    }
  }
}
