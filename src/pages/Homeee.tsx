"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Bookmark, Type } from "lucide-react";
import { useReaderStore } from "@/stores/useReaderStore";
import type { TocEntry } from "epubix";
import { filterTocByChapters } from "@/lib/helpers/epub";

export function HomePage() {
  const [fontSize, setFontSize] = useState(18);
  const [tableOfContents, setTableOfContents] = useState<TocEntry[]>([]);

  const { openBook, openChapterHref, setOpenChapterHref } = useReaderStore();

  const headingSizes: Record<string, string> = {
    h1: "text-4xl",
    h2: "text-3xl",
    h3: "text-2xl",
    h4: "text-xl",
    h5: "text-lg",
    h6: "text-base",
  };

  const paragraphClasses = [
    "text-muted-foreground",
    "font-serif",
    "leading-relaxed",
    "mb-6",
    "text-foreground",
  ];

  const openChapter = useMemo(() => {
    if (!openBook || !openChapterHref) return null;
    return openBook.book.chapters.find((c) => c.href === openChapterHref);
  }, [openBook, openChapterHref]);

  console.log("open chapter", openChapter);
  const transformedHtml = useMemo(() => {
    if (!openChapter || !openChapter.content) return "";
    const parser = new DOMParser();
    const doc = parser.parseFromString(openChapter.content, "text/html");

    // Add paragraph classes
    doc
      .querySelectorAll("p")
      .forEach((p) => p.classList.add(...paragraphClasses));

    // Add heading classes
    Object.entries(headingSizes).forEach(([tag, size]) => {
      doc.querySelectorAll(tag).forEach((el) => {
        el.classList.add(
          "font-serif",
          "font-bold",
          "mb-2",
          "text-foreground",
          size
        );
      });
    });

    return doc.body.innerHTML;
  }, [openChapter]);

  useEffect(() => {
    if (!openBook) return;
    console.log("openBookopenBook", openBook);

    const toc = filterTocByChapters(openBook.book.toc, openBook.book.chapters);
    setTableOfContents(toc);
    console.log("TOCCCCCCCCCCCCCC");
    //setOpenChapterHref(toc[0].href);
  }, [openBook]);

  return (
    <div className="flex flex-col h-full">
      {/* Reading Controls */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
          >
            <Type className="w-4 h-4 mr-2" />
            Font Size
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 bg-transparent"
              onClick={() => setFontSize(Math.max(14, fontSize - 2))}
            >
              -
            </Button>
            <span className="text-sm text-muted-foreground w-8 text-center">
              {fontSize}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 bg-transparent"
              onClick={() => setFontSize(Math.min(24, fontSize + 2))}
            >
              +
            </Button>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="text-primary hover:text-primary/80"
        >
          <Bookmark className="w-4 h-4 mr-2" />
          Bookmark
        </Button>
      </div>

      <div className="flex-1 overflow-auto flex">
        {/* Main Book Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-8 py-12">
            <div
              className="font-serif leading-relaxed space-y-6 text-foreground"
              style={{ fontSize: `${fontSize}px` }}
            >
              <div
                className="overflow-auto max-h-[67vh]" // <-- scrollable container
                dangerouslySetInnerHTML={{ __html: transformedHtml }}
              />
            </div>
            {/* Page Navigation */}
            <div className="flex items-center justify-between mt-16 pt-8 border-t border-border">
              <Button
                variant="ghost"
                className="text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              <Button
                variant="ghost"
                className="text-muted-foreground hover:text-foreground"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
        {/* Table of Contents Sidebar */}
        <aside className="w-72 border-l border-border bg-card overflow-auto">
          <div className="sticky top-0 bg-card border-b border-border px-6 py-4">
            <h2 className="text-sm font-semibold text-foreground">
              Table of Contents
            </h2>
          </div>
          <nav className="p-4 space-y-1 overflow-auto max-h-[75vh]  ">
            {tableOfContents.map((content) => (
              <button
                onClick={() => {
                  const cleanHref = content.href.split("#")[0];
                  setOpenChapterHref(cleanHref);
                }}
                key={content.href}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                  openChapterHref === content.href
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm leading-snug">{content.title}</span>
                  <span className="text-xs mt-0.5 shrink-0"></span>
                </div>
              </button>
            ))}
          </nav>
        </aside>
      </div>
    </div>
  );
}
