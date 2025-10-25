/* "use client";

import { useEffect, useState } from "react";
import { Link } from "react-router";
import EpubReader from "@/components/EpubReader";
import { useReaderStore } from "@/stores/useReaderStore";
import { BookAlert, MoveRight, AlertTriangle } from "lucide-react";
import { STORE_KEYS } from "@/lib/constants";

export function HomePage() {
  const { openBook, error, setOpenBook } = useReaderStore();

  const [lastOpenedBookFileName, setLastOpenedBookFilename] = useState<
    string | null
  >(null);

  useEffect(() => {
    const stored =
      typeof window !== "undefined"
        ? localStorage.getItem(STORE_KEYS.lastOpenedBook)
        : null;
    setLastOpenedBookFilename(stored);
  }, []);

  useEffect(() => {
    if (!openBook?.book && lastOpenedBookFileName) {
      setOpenBook(lastOpenedBookFileName);
    }
    // only depend on the pieces we care about
  }, [lastOpenedBookFileName, openBook?.book, setOpenBook]);

  // If a book is already open, render the reader immediately
  if (openBook?.book) {
    return (
      <div className="h-[87vh]">
        <EpubReader epub={openBook.book} />
      </div>
    );
  }

  // Render empty state / error
  const renderErrorBody = () => {
    if (!error) return null;
    const message = error instanceof Error ? error.message : String(error);
    // some errors might include detail property
    const detail =
      error && typeof error === "object" && "detail" in (error as any)
        ? (error as any).detail
        : undefined;

    return (
      <>
        <div className="flex justify-center mb-3 text-destructive">
          <AlertTriangle size={80} />
        </div>
        <h2 className="text-xl font-semibold mb-2">Error</h2>
        <p className="text-muted-foreground">{message}</p>
        {detail && (
          <p className="text-sm text-muted-foreground mt-1 mx-5">{detail}</p>
        )}
      </>
    );
  };

  return (
    <div className="bg-card h-[93vh] flex items-center justify-center">
      <div className="text-center">
        {error ? (
          renderErrorBody()
        ) : (
          <>
            <div className="flex justify-center mb-3">
              <BookAlert size={100} />
            </div>
            <p className="flex items-center justify-center">
              You don’t have any open book. Please go over to
              <Link
                className="mx-2 text-primary flex items-center hover:border-b border-accent"
                to="/library"
              >
                <span>Library</span>
                <MoveRight size={15} className="mx-2" />
              </Link>
              to open one.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
 */

import * as pdfjsLib from "pdfjs-dist";
import "pdfjs-dist/build/pdf.worker.mjs";

import { Document, Page, pdfjs } from "react-pdf";
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();
type PdfMetadata = {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creationDate?: string;
  modDate?: string;
  pages: number;
};

async function getPdfMetadata(file: File): Promise<PdfMetadata> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await (pdfjsLib as any).getDocument({ data: arrayBuffer })
    .promise;

  const { info, metadata } = await pdf.getMetadata().catch(() => ({
    info: {},
    metadata: null,
  }));

  return {
    title: info?.Title,
    author: info?.Author,
    subject: info?.Subject,
    keywords: info?.Keywords,
    creator: info?.Creator,
    producer: info?.Producer,
    creationDate: info?.CreationDate,
    modDate: info?.ModDate,
    pages: pdf.numPages,
  };
}

export async function getPdfCoverImage(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await (pdfjsLib as any).getDocument({ data: arrayBuffer })
    .promise;

  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1.5 });

  // Create an offscreen canvas
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d")!;
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvasContext: context, viewport }).promise;

  // Return as base64 JPEG string
  return canvas.toDataURL("image/jpeg", 0.9);
}

import React, { useState } from "react";

export function HomePage() {
  const [meta, setMeta] = useState<any>(null);
  const [cover, setCover] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number>(0);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setFile(e.target.files?.[0] || null);
    if (!file) return;
    const result = await getPdfMetadata(file);

    console.log("FILE NAME", file.name);
    setMeta(result);
    const img = await getPdfCoverImage(file);
    setCover(img);
  }
  function onLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  return (
    <div>
      <p>hello</p>
      <input type="file" accept="application/pdf" onChange={handleFile} />
      {cover && <img src={cover} alt="PDF cover" style={{ width: "200px" }} />}
      {meta && <pre>{JSON.stringify(meta, null, 2)}</pre>}

      {file && (
        <Document
          file={file}
          onLoadSuccess={onLoadSuccess}
          loading={<p>Loading PDF...</p>}
        >
          {Array.from({ length: numPages }, (_, i) => (
            <Page key={i} pageNumber={i + 1} />
          ))}
        </Document>
      )}
    </div>
  );
}
