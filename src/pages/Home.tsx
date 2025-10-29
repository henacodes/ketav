"use client";

import { useEffect } from "react";
import { Link } from "react-router";
import EpubReader from "@/components/EpubReader";
import PdfReader from "@/components/PdfReader";
import { useReaderStore } from "@/stores/useReaderStore";
import { BookAlert, MoveRight, AlertTriangle } from "lucide-react";
import { getFileExtension } from "@/lib/helpers/fs";
import { OpenPdf } from "@/lib/types/pdf";
import { useHistoryStore } from "@/stores/useHistoryStore";

export function HomePage() {
  const { openBook, error, setOpenBook } = useReaderStore();
  const { history, loadHistory } = useHistoryStore();

  // Load last opened book from store on mount
  useEffect(() => {
    (async () => {
      if (!openBook && history.lastOpenedBookFileName) {
        console.log("historyhistory", history);
        setOpenBook(history.lastOpenedBookFileName);
      }
    })();
  }, [loadHistory, history]);

  // Determine filename and extension from openBook
  const fileName =
    openBook?.metadata && (openBook.metadata as any).fileName
      ? (openBook.metadata as any).fileName
      : null;
  const ext = fileName ? getFileExtension(fileName) : null;

  // EPUB reader
  if (ext === "epub" && (openBook as any)?.book) {
    return (
      <div className="h-[87vh]">
        <EpubReader epub={(openBook as any).book} />
      </div>
    );
  }

  // PDF reader
  if (ext === "pdf" && (openBook as any)?.fileBytes) {
    return (
      <div className="h-[87vh]">
        <PdfReader
          data={(openBook as any).fileBytes}
          openBook={openBook as OpenPdf}
          fileName={fileName || undefined}
        />
      </div>
    );
  }

  // Render empty/error state
  const renderErrorBody = () => {
    if (!error) return null;
    const message = error instanceof Error ? error.message : String(error);
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
