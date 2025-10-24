import { useEffect, useMemo, useRef, useState } from "react";
import type { Epub, TocEntry } from "epubix";
import { Button } from "./ui/button";
import { Settings, TableOfContents } from "lucide-react";
import { useReadingTracker } from "@/hooks/useReadingTimer";
import {
  buildTocSpineRanges,
  escapeHtml,
  generateBookId,
  prepareChapterHtml,
} from "@/lib/helpers/epub";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import useSettingsStore from "@/stores/useSettingsStore";
import { useReaderStore } from "@/stores/useReaderStore";
import { SettingsDialog } from "./dialogs/SettingsDialog";

interface ReaderProps {
  epub: Epub;
}

export default function EpubReader({ epub }: ReaderProps) {
  const [selectedHref, setSelectedHref] = useState<string | null>(null);
  const [htmlContent, setHtmlContent] = useState<string>("<div />");
  const tocRangesRef = useRef<Map<string, { start: number; end: number }>>(
    new Map()
  );

  const { settings } = useSettingsStore((store) => store);
  const toggleSettingsDialog = useReaderStore(
    (store) => store.toggleSettingsDialog
  );

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

  // load content for a given href (may include fragment)
  async function loadContentForHref(href: string | null) {
    if (!href) return;
    const myLoadId = ++loadCounterRef.current;

    // Free previous chapter resources early
    try {
      if (chapterCleanupRef.current) {
        await chapterCleanupRef.current().catch(() => {});
        chapterCleanupRef.current = null;
      }
    } catch {
      /* ignore cleanup errors */
    }

    // Clear UI immediately so previous book content (images) disappear
    setHtmlContent("<div />");

    try {
      // Resolve fragment (if any) from the passed href
      const fragment = ((): string | undefined => {
        try {
          const r = epub.resolveHref(href);
          return (
            r?.fragment ?? (href.includes("#") ? href.split("#")[1] : undefined)
          );
        } catch {
          return href.includes("#") ? href.split("#")[1] : undefined;
        }
      })();

      // Determine if this href corresponds to a TOC entry that maps to a spine range
      // (tocRangesRef is expected to be built elsewhere when the epub is loaded)
      let range: { start: number; end: number } | undefined;
      try {
        const ranges = tocRangesRef.current; // Map<string, {start,end}>
        // 1) direct key match
        if (ranges.has(href)) {
          range = ranges.get(href);
        } else {
          // 2) try to match by normalized path: resolve the clicked href and compare to resolved toc hrefs
          const resolvedClick = epub.resolveHref(href);
          const clickNorm = resolvedClick?.normalizedPath ?? href;
          for (const [tocHref, r] of ranges.entries()) {
            try {
              const resolvedToc = epub.resolveHref(tocHref);
              const tocNorm = resolvedToc?.normalizedPath ?? tocHref;
              if (tocNorm === clickNorm) {
                range = r;
                break;
              }
            } catch {
              // ignore and continue
            }
          }
        }
      } catch {
        // if anything fails while looking up ranges, treat as no-range (fallback to single chapter)
        range = undefined;
      }

      // Helper: prepare & set content from a single html string (calls prepareChapterHtml)
      const prepareAndSet = async (
        primaryHrefForBase: string,
        htmlString: string
      ) => {
        const { html, cleanup } = await prepareChapterHtml({
          epub,
          chapterHref: primaryHrefForBase,
          chapterHtml: htmlString,
        });

        // check for staleness
        if (myLoadId !== loadCounterRef.current) {
          await cleanup().catch(() => {});
          return false;
        }

        setHtmlContent(html);
        chapterCleanupRef.current = cleanup;
        return true;
      };

      // If we have a valid range and it actually covers at least one spine item, concat multiple spine items
      if (
        range &&
        typeof range.start === "number" &&
        typeof range.end === "number" &&
        range.end > range.start
      ) {
        // Defensive limit: avoid concatenating absurd numbers of chapters (protect memory)
        const MAX_CHAPTERS_TO_CONCAT = 50;
        const count = Math.min(range.end - range.start, MAX_CHAPTERS_TO_CONCAT);
        const endIndex = range.start + count;

        // Load & concatenate chapters in the range
        const chaptersHtml: string[] = [];
        const chapterHrefs: string[] = [];
        for (let i = range.start; i < endIndex; i++) {
          const ch = epub.chapters?.[i];
          if (!ch) continue;
          let content = ch.content;
          if (!content) {
            try {
              const resolved = epub.resolveHref(ch.href || "");
              if (resolved?.normalizedPath) {
                const buf = await epub.getFile(resolved.normalizedPath);
                if (buf) content = new TextDecoder().decode(buf);
              }
            } catch {
              // ignore and fallback
            }
          }
          if (!content) {
            content = `<div class="text-muted-foreground"><em>Unable to load chapter ${escapeHtml(
              ch.href || `#${i}`
            )}</em></div>`;
          }
          // wrap so we can distinguish chapter boundaries and scope later if needed
          chaptersHtml.push(
            `<div data-chapter-index="${i}" data-chapter-href="${escapeHtml(
              ch.href ?? ""
            )}">${content}</div>`
          );
          chapterHrefs.push(ch.href ?? "");
        }

        const combinedHtml = chaptersHtml.join("\n");
        const primaryHref = chapterHrefs[0] || href;

        // prepare (resolve resources, inject base, create blobs or use SW, etc.)
        const ok = await prepareAndSet(primaryHref, combinedHtml);
        if (!ok) return; // stale, cleanup already handled inside helper

        // after setting, scroll to fragment if needed
        if (fragment) {
          setTimeout(() => scrollToFragment(fragment), 50);
        } else {
          if (contentRef.current) contentRef.current.scrollTop = 0;
        }

        return;
      }

      // Fallback path: load a single chapter (existing behavior)
      // Try epub.getChapterByHref first (may already have parsed chapter.content)
      const chapterResult = epub.getChapterByHref(href) || {};
      const chapter = chapterResult.chapter;
      let content: string | undefined = chapter?.content;

      if (!content) {
        try {
          const resolved = epub.resolveHref(href);
          if (resolved?.normalizedPath) {
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

      const ok = await prepareAndSet(href, content);
      if (!ok) return; // stale and cleaned up

      // scroll to fragment if present
      if (fragment) {
        setTimeout(() => scrollToFragment(fragment), 50);
      } else {
        if (contentRef.current) contentRef.current.scrollTop = 0;
      }
    } catch (err) {
      // Ensure we clear the cleanup ref on error so next load starts fresh
      chapterCleanupRef.current = null;
      console.error("loadContentForHref failed:", err);
      // Optionally show fallback UI: keep the "Unable to load" message already set above
    }
  }

  useEffect(() => {
    tocRangesRef.current = buildTocSpineRanges(epub);
  }, [epub]);

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
        /*  const frag = rawHref.slice(1);
        scrollToFragment(frag); */
        return;
      }

      // Otherwise, treat as an EPUB href. Use the app loader so images/resources are resolved properly.
      // setSelectedHref accepts the raw href (relative or absolute inside EPUB) and loadContentForHref
      // will call epub.resolveHref to find the normalized path and load it.
      //setSelectedHref(rawHref);

      // If we're on small-screen drawer, close it after selection for better UX
      //if (drawerOpen) setDrawerOpen(false);
    };

    container.addEventListener("click", handleClick);
    return () => {
      container.removeEventListener("click", handleClick);
    };
  }, [contentRef, epub, drawerOpen]);

  // scroll to element inside rendered XHTML

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
      <SettingsDialog />
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
      <div className="flex-1 flex flex-col  h-full   ">
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

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              toggleSettingsDialog(true);
            }}
            className="text-primary hover:text-primary/80"
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </header>

        <div className="flex-1 p-6 bg-card  ">
          <div
            ref={contentRef}
            className="max-w-7xl mx-auto overflow-auto max-h-[81.4vh] font-serif leading-relaxed space-y-6 epub-reader-container"
            style={{ fontSize: `${fontSize}px` }}
          >
            <div
              dangerouslySetInnerHTML={{ __html: htmlContent }}
              style={{
                textAlign: settings?.textAlignment,
                fontFamily: settings?.fontFamily,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
