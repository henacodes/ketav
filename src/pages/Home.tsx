"use client";

import { useEffect, useState } from "react";
import { Link } from "react-router";
import EpubReader from "@/components/EpubReader";
import PdfReader from "@/components/PdfReader";
import { useReaderStore } from "@/stores/useReaderStore";
import { BookAlert, MoveRight, AlertTriangle } from "lucide-react";
import { STORE_KEYS } from "@/lib/constants";
import { getFileExtension } from "@/lib/helpers/fs";

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
    if (!openBook && lastOpenedBookFileName) {
      setOpenBook(lastOpenedBookFileName);
    }
    // only depend on the pieces we care about
  }, [lastOpenedBookFileName, openBook, setOpenBook]);

  // determine extension from the stored metadata filename (if available)
  const fileName =
    openBook?.metadata && (openBook.metadata as any).fileName
      ? (openBook.metadata as any).fileName
      : null;
  const ext = fileName ? getFileExtension(fileName) : null;

  // If an EPUB is open, render the EPUB reader
  if (ext === "epub" && (openBook as any)?.book) {
    return (
      <div className="h-[87vh]">
        <EpubReader epub={(openBook as any).book} />
      </div>
    );
  }

  // If a PDF is open, render the PDF reader
  if (ext === "pdf" && (openBook as any)?.fileBytes) {
    return (
      <div className="h-[87vh]">
        <PdfReader
          data={(openBook as any).fileBytes}
          // pass optional pages if available in metadata
          //  pages={(openBook?.metadata as any)?.pages}
          fileName={(openBook?.metadata as any)?.fileName}
        />
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
