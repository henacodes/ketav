import { useEffect, useMemo, useRef, useState } from "react";
import type { Epub, TocEntry } from "epubix";
import { Button } from "./ui/button";
import { Bookmark, TableOfContents } from "lucide-react";
import { useReadingTracker } from "@/hooks/useReadingTimer";
import { generateBookId, prepareChapterHtml } from "@/lib/helpers/epub";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

interface ReaderProps {
  epub: Epub;
}

export default function EpubReader({ epub }: ReaderProps) {
  const [selectedHref, setSelectedHref] = useState<string | null>(null);
  const [htmlContent, setHtmlContent] = useState<string>("<div />");
  useReadingTracker({
    bookId: generateBookId({
      title: epub.metadata.title,
      author: epub.metadata.author,
      cover: epub.metadata.cover,
    }),
  });

  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});
  const contentRef = useRef<HTMLDivElement | null>(null);

  const [fontSize, setFontSize] = useState(18);

  const chapterCleanupRef = useRef<(() => Promise<void>) | null>(null);
  const loadCounterRef = useRef(0);

  // drawer state for small screens
  const [drawerOpen, setDrawerOpen] = useState(false);

  // When the epub instance changes (opening a different book), immediately:
  //  - mark any in-flight loads stale
  //  - run the previous chapter cleanup (revoke blobs / decrement refs)
  //  - clear the displayed HTML so old images don't remain visible
  //  - clear selectedHref so firstTocHref effect can set the new initial href
  useEffect(() => {
    let mounted = true;
    (async () => {
      // make any in-flight loads stale
      loadCounterRef.current++;

      // cleanup previous chapter resources (if any)
      if (chapterCleanupRef.current) {
        try {
          await chapterCleanupRef.current();
        } catch {
          // ignore cleanup errors
        }
        chapterCleanupRef.current = null;
      }

      // clear UI immediately so previous book content (images) disappear
      if (mounted) {
        setHtmlContent("<div />");
        setSelectedHref(null);
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [epub]);

  // stable key for TOC items based on tree path
  const tocKey = (path: string, idx: number) =>
    path ? `${path}-${idx}` : `${idx}`;

  // find first href to auto-open
  const firstTocHref = useMemo(() => {
    if (!epub?.toc || epub.toc.length === 0) return null;
    const findFirstHref = (entries: TocEntry[]): string | null => {
      for (const e of entries) {
        if (e.href) return e.href;
        if (e.children && e.children.length > 0) {
          const found = findFirstHref(e.children);
          if (found) return found;
        }
      }
      return null;
    };
    return findFirstHref(epub.toc) || null;
  }, [epub]);

  // load content for a given href (may include fragment)
  async function loadContentForHref(href: string | null) {
    if (!href) return;
    const myLoadId = ++loadCounterRef.current;

    // call previous cleanup before starting new load to free resources early
    try {
      if (chapterCleanupRef.current) {
        await chapterCleanupRef.current().catch(() => {});
        chapterCleanupRef.current = null;
      }
    } catch {
      /* ignore cleanup errors */
    }

    // clear current UI immediately so the previous book's images don't remain visible
    setHtmlContent("<div />");

    try {
      const result = epub.getChapterByHref(href) || {};
      const chapter = result.chapter;
      const fragment =
        result.fragment ||
        (href.includes("#") ? href.split("#")[1] : undefined);

      let content: string | undefined = chapter?.content;

      if (!content) {
        try {
          const resolved = epub.resolveHref(href);
          if (resolved && resolved.normalizedPath) {
            const fileBuffer = await epub.getFile(resolved.normalizedPath);
            if (fileBuffer) content = new TextDecoder().decode(fileBuffer);
          }
        } catch {
          // ignore
        }
      }

      if (!content) {
        content = `<div class="text-muted-foreground"><em>Unable to load content for ${escapeHtml(
          href
        )}</em></div>`;
      }

      const { html, cleanup } = await prepareChapterHtml({
        epub,
        chapterHref: href,
        chapterHtml: content,
      });

      if (myLoadId !== loadCounterRef.current) {
        // stale: run cleanup and do not set the html
        await cleanup().catch(() => {});
        return;
      }

      // set content and register cleanup
      setHtmlContent(html);
      chapterCleanupRef.current = cleanup;

      // scroll to fragment if present
      if (fragment) {
        setTimeout(() => scrollToFragment(fragment), 50);
      } else {
        if (contentRef.current) contentRef.current.scrollTop = 0;
      }
    } catch {
      chapterCleanupRef.current = null;
    }
  }

  // Intercept clicks inside the rendered EPUB content so links (including the TOC page)
  // that point to relative EPUB resources/chapter hrefs are handled by the app.
  // This prevents the browser from attempting to navigate relative to the page origin
  // (which would break resources) and lets us resolve hrefs via epub.resolveHref/getChapterByHref.
  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    function isExternalHref(href: string) {
      // treat schemes like http:, https:, mailto:, tel:, data:, blob:, file: as external
      return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(href);
    }

    const handleClick = (ev: MouseEvent) => {
      const target = ev.target as HTMLElement | null;
      if (!target) return;
      const anchor = target.closest("a") as HTMLAnchorElement | null;
      if (!anchor) return;
      const rawHref = anchor.getAttribute("href");
      if (!rawHref) return;

      // allow user to open in new tab/window
      if (
        anchor.target === "_blank" ||
        ev.metaKey ||
        ev.ctrlKey ||
        ev.shiftKey
      ) {
        return;
      }

      // external links - let browser handle them
      if (isExternalHref(rawHref)) {
        return;
      }

      // Prevent default navigation and handle internally
      ev.preventDefault();

      // fragment-only link (same document)
      if (rawHref.startsWith("#")) {
        const frag = rawHref.slice(1);
        scrollToFragment(frag);
        return;
      }

      // Otherwise, treat as an EPUB href. Use the app loader so images/resources are resolved properly.
      // setSelectedHref accepts the raw href (relative or absolute inside EPUB) and loadContentForHref
      // will call epub.resolveHref to find the normalized path and load it.
      setSelectedHref(rawHref);

      // If we're on small-screen drawer, close it after selection for better UX
      if (drawerOpen) setDrawerOpen(false);
    };

    container.addEventListener("click", handleClick);
    return () => {
      container.removeEventListener("click", handleClick);
    };
  }, [contentRef, epub, drawerOpen]);

  // escape fallback HTML
  function escapeHtml(s: string) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // scroll to element inside rendered XHTML
  function scrollToFragment(fragmentId: string) {
    if (!contentRef.current) return;
    const doc = contentRef.current;
    try {
      const target = doc.querySelector(
        `#${CSS.escape(fragmentId)}`
      ) as HTMLElement | null;
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    } catch {
      // CSS.escape may throw if not supported; fall back to naive selector
      const t = doc.querySelector(`#${fragmentId}`) as HTMLElement | null;
      if (t) {
        t.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
    const alt = doc.querySelector(
      `[name="${fragmentId}"]`
    ) as HTMLElement | null;
    if (alt) alt.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function toggleExpand(key: string) {
    setExpandedKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function onSelectHref(href?: string) {
    if (!href) return;
    setSelectedHref(href);
    // if the drawer is open (small screen), close it after selecting
    if (drawerOpen) setDrawerOpen(false);
  }

  useEffect(() => {
    if (!selectedHref && firstTocHref) setSelectedHref(firstTocHref);
  }, [firstTocHref, selectedHref]);

  useEffect(() => {
    loadContentForHref(selectedHref);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedHref]);

  function renderToc(
    entries: TocEntry[],
    path = "",
    rendered = new Set<string>()
  ) {
    return (
      <ul className="space-y-1 m-0 p-0 list-none">
        {entries.map((entry, idx) => {
          const key = tocKey(path, idx);
          const hasChildren = !!(entry.children && entry.children.length > 0);
          const isExpanded = !!expandedKeys[key];
          const isSelected = selectedHref === entry.href;

          return (
            <li key={key} className="list-none">
              <div className="flex items-center gap-2 px-3">
                {hasChildren ? (
                  <button
                    aria-label={isExpanded ? "Collapse" : "Expand"}
                    onClick={() => toggleExpand(key)}
                    className="w-6 h-6 inline-flex items-center justify-center text-sm text-muted-foreground hover:text-foreground"
                  >
                    {isExpanded ? "▾" : "▸"}
                  </button>
                ) : (
                  <span className="w-6" />
                )}

                {entry.href ? (
                  <button
                    onClick={() => onSelectHref(entry.href)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                      isSelected
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm leading-snug">
                        {entry.title}
                      </span>
                      <span className="text-xs mt-0.5 shrink-0" />
                    </div>
                  </button>
                ) : (
                  <div className="px-3 py-2.5 text-sm text-foreground">
                    {entry.title || "Untitled"}
                  </div>
                )}
              </div>

              {hasChildren && isExpanded && (
                <div className="pl-4">
                  {renderToc(entry.children!, key, rendered)}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  useEffect(() => {
    return () => {
      // increment loadCounter so any in-flight loads know they're stale
      loadCounterRef.current++;
      if (chapterCleanupRef.current) {
        // call and don't await blocking unmount; fire-and-forget but handle errors
        chapterCleanupRef.current().catch(() => {});
        chapterCleanupRef.current = null;
      }
    };
  }, []);

  return (
    <div className="flex h-full">
      {/* Sidebar TOC (left) - hidden on small screens */}
      <aside className="w-72 border-r border-border bg-card overflow-auto hidden md:block">
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4">
          <h2 className="text-sm font-semibold text-foreground">
            Table of Contents
          </h2>
        </div>

        <nav className="p-4 space-y-1 overflow-auto max-h-[85vh]">
          {epub.toc && epub.toc.length > 0 ? (
            renderToc(epub.toc)
          ) : (
            <div className="px-4 py-3 text-muted-foreground">
              No Table of Contents
            </div>
          )}
        </nav>
      </aside>

      {/* Drawer for small screens */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="bg-card border-border">
          <DrawerHeader>
            <DrawerTitle>Table of Contents</DrawerTitle>
          </DrawerHeader>

          <nav className="p-4 space-y-1 overflow-auto max-h-[70vh]">
            {epub.toc && epub.toc.length > 0 ? (
              renderToc(epub.toc)
            ) : (
              <div className="px-4 py-3 text-muted-foreground">
                No Table of Contents
              </div>
            )}
          </nav>
        </DrawerContent>
      </Drawer>

      {/* Viewer */}
      <div className="flex-1 flex flex-col">
        <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            {/* Drawer open button visible on small screens */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open table of contents"
            >
              <TableOfContents className="w-5 h-5" />
            </Button>

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
              onClick={() => setFontSize(Math.min(28, fontSize + 2))}
            >
              +
            </Button>

            <div className="ml-4">
              <strong className="text-foreground">
                {epub.metadata?.title || "untitled"}
              </strong>
            </div>
          </div>

          {/*    <Button
            variant="ghost"
            size="sm"
            className="text-primary hover:text-primary/80"
          >
            <Bookmark className="w-4 h-4 mr-2" />
            Bookmark
          </Button> */}
        </header>

        <div className="flex-1 p-6 bg-card">
          <div
            ref={contentRef}
            className="max-w-7xl mx-auto overflow-auto max-h-[81.4vh] font-serif leading-relaxed space-y-6 epub-reader-container"
            style={{ fontSize: `${fontSize}px` }}
          >
            <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
          </div>
        </div>
      </div>
    </div>
  );
}
