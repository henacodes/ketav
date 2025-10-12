import { useEffect, useMemo, useRef, useState } from "react";
import type { Epub, TocEntry } from "epubix";
import { Button } from "./ui/button";
import { Bookmark } from "lucide-react";
import { useReadingTracker } from "@/hooks/useReadingTimer";
import { generateBookId } from "@/lib/helpers/epub";

interface ReaderProps {
  epub: Epub;
}

export default function EpubReader({ epub }: ReaderProps) {
  const [selectedHref, setSelectedHref] = useState<string | null>(null);
  const [htmlContent, setHtmlContent] = useState<string>("<div />");
  useReadingTracker({ bookId: generateBookId(epub) });

  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});
  const contentRef = useRef<HTMLDivElement | null>(null);

  const [fontSize, setFontSize] = useState(18);

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

      setHtmlContent(content);

      // scroll to fragment if present
      if (fragment) {
        setTimeout(() => scrollToFragment(fragment), 50);
      } else {
        if (contentRef.current) contentRef.current.scrollTop = 0;
      }
    } finally {
    }
  }

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
      <ul className="space-y-1 m-0 p-0 list-none  ">
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

  return (
    <div className="flex h-full">
      {/* Sidebar TOC (left) */}
      <aside className="w-72 border-r border-border bg-card overflow-auto">
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

      {/* Viewer */}
      <div className="flex-1 flex flex-col">
        <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
          <div className="flex items-center gap-3">
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
            className="text-primary hover:text-primary/80"
          >
            <Bookmark className="w-4 h-4 mr-2" />
            Bookmark
          </Button>
        </header>

        <div className="flex-1  h-11 p-6 bg-card  ">
          <div
            ref={contentRef}
            className="max-w-7xl mx-auto  overflow-auto max-h-[80vh] font-serif leading-relaxed space-y-6   "
            style={{ fontSize: `${fontSize}px` }}
          >
            <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
          </div>
        </div>
      </div>
    </div>
  );
}
