import { Epub, TocEntry } from "epubix";
import { ChevronDown, ChevronRightIcon } from "lucide-react";
import { useState } from "react";

export default function TestReader({ epub }: { epub: Epub }) {
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(
    new Set(["1"])
  );

  console.log(epub);

  const toggleChapter = (href: string) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(href)) {
      newExpanded.delete(href);
    } else {
      newExpanded.add(href);
    }
    setExpandedChapters(newExpanded);
  };

  const renderTocEntries = (
    entries: TocEntry[],
    depth = 0
  ): React.ReactNode => {
    return entries.map((entry, index) => {
      const hasChildren = entry.children && entry.children.length > 0;
      //W  console.log(entry.href);
      const isExpanded = entry.href ? expandedChapters.has(entry.href) : false;
      const isActive = entry.href === "#1"; // You can make this dynamic based on current page

      return (
        <div
          key={entry.href || `entry-${depth}-${index}`}
          style={{ marginLeft: depth > 0 ? "1.5rem" : 0 }}
        >
          <button
            className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
              isActive
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
            onClick={() =>
              entry.href && hasChildren && toggleChapter(entry.href)
            }
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-1">
                {hasChildren && (
                  <span className="shrink-0">
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRightIcon className="w-3.5 h-3.5" />
                    )}
                  </span>
                )}
                <span className="text-sm leading-snug">{entry.title}</span>
              </div>
            </div>
          </button>

          {/* Recursively render children if expanded */}
          {hasChildren && isExpanded && (
            <div className="mt-1 space-y-1">
              {renderTocEntries(entry.children!, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return <div>{renderTocEntries(epub.toc)}</div>;
}
