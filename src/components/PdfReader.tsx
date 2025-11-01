import React, { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { PdfHeader } from "./PdfReaderHeader";
import { Theme } from "./theme-provider";
import { THEME_STORAGE_KEY } from "@/lib/constants";
import { useReadingTracker } from "@/hooks/useReadingTimer";
import { generateBookId } from "@/lib/helpers/epub";
import { OpenPdf } from "@/lib/types/pdf";
import { useHistoryStore } from "@/stores/useHistoryStore";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

type PdfReaderProps = {
  data: ArrayBuffer | Uint8Array | File | string;
  initialPage?: number;
  pageWindow?: number;
  fileName?: string;
  openBook: OpenPdf;
};

export default function PdfReader({
  data,
  openBook,
  initialPage = 1,
  pageWindow = 1,
  fileName = "document.pdf",
}: PdfReaderProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [fileData, setFileData] = useState<File | string | ArrayBuffer | null>(
    null
  );
  const [currentTheme, setCurrentTheme] = useState<Theme>("light");
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1);

  const { addLastOpenedPage, findLastOpenedPage } = useHistoryStore();

  useReadingTracker({
    bookId: generateBookId({
      ...Object.fromEntries(
        Object.entries(openBook.metadata).map(([key, value]) => [
          key,
          value ?? undefined,
        ])
      ),
      fileName: openBook.metadata.fileName,
    }),
  });

  // Load file data
  useEffect(() => {
    if (data instanceof File) {
      const reader = new FileReader();
      reader.onload = () => setFileData(reader.result as ArrayBuffer);
      reader.readAsArrayBuffer(data);
    } else if (data instanceof Uint8Array) {
      setFileData(new Uint8Array(data).buffer);
    } else {
      setFileData(data as string | ArrayBuffer);
    }
  }, [data]);

  // Track container width
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current)
        setContainerWidth(containerRef.current.clientWidth);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Load theme
  useEffect(() => {
    const theme = localStorage.getItem(THEME_STORAGE_KEY);
    setCurrentTheme(theme === "dark" ? "dark" : "light");
  }, []);

  // Load last opened page from store
  useEffect(() => {
    if (!fileName) return;
    (async () => {
      const savedPage = findLastOpenedPage(fileName);
      if (savedPage) setCurrentPage(savedPage);
    })();
  }, [fileName]);

  // Save current page to store whenever it changes
  useEffect(() => {
    if (!fileName) return;
    addLastOpenedPage({ fileName, pageNum: currentPage });
  }, [currentPage, fileName]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  const startPage = currentPage;
  const endPage = currentPage;

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100vh",
        overflowY: "auto",
        background: currentTheme === "dark" ? "#111" : "#fff",
      }}
    >
      <PdfHeader
        onGoToPage={(pageNum) => setCurrentPage(pageNum)}
        currentPage={currentPage}
        numPages={numPages}
        zoom={zoom}
        onPrev={() => setCurrentPage((p) => Math.max(p - 1, 1))}
        onNext={() => setCurrentPage((p) => Math.min(p + 1, numPages))}
        onZoomIn={() => setZoom((z) => Math.min(z + 0.1, 1))}
        onZoomOut={() => setZoom((z) => Math.max(z - 0.1, 0.25))}
      />

      {fileData && (
        <Document
          className={currentTheme === "dark" ? "pdf-dark" : ""}
          file={fileData}
          onLoadSuccess={onDocumentLoadSuccess}
        >
          {Array.from({ length: endPage - startPage + 1 }, (_, i) => (
            <div
              key={startPage + i}
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Page pageNumber={startPage + i} width={containerWidth * zoom} />
            </div>
          ))}
        </Document>
      )}
    </div>
  );
}
