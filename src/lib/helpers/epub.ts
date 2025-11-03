import { DirEntry } from "@tauri-apps/plugin-fs";
import { Epub, EpubMetadata, loadEpubMetadata, TocEntry } from "epubix";
import { readFile, BaseDirectory } from "@tauri-apps/plugin-fs";
import { getSettings } from "./settings";
import type { LibraryEpub } from "../types/epub";

export function filterEpubFiles(files: DirEntry[]) {
  return files.filter((file) => file.isFile && file.name.endsWith(".epub"));
}

export function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function collectEpubs(files: DirEntry[]) {
  let epubs: LibraryEpub[] = [];

  const settings = await getSettings();

  for (const file of files) {
    try {
      const ep = await readFile(`${settings.libraryFolderPath}/${file.name}`, {
        baseDir: BaseDirectory.Document,
      });

      const epubMetadata = await loadEpubMetadata(ep);

      epubs.push({ ...epubMetadata, fileName: file.name });
    } catch (error) {
      console.log("FAILED AT", file.name);
    }
  }

  return epubs;
}

type BookIdParams = EpubMetadata & { fileName?: string; pages?: number };

export function generateBookId({
  title,
  author,
  cover,
  fileName,
  pages,
}: BookIdParams): string {
  title = (title || `${fileName}`) + `${cover || ""}` + `${pages || ""}`; // fallback to chapter and TOC length
  author = author || "";
  const normalize = (str: string) =>
    str
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

  const cleanAuthor = normalize(author);
  const cleanTitle = normalize(title);

  const combined = `${cleanAuthor}_${cleanTitle}`;

  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash * 31 + combined.charCodeAt(i)) >>> 0;
  }
  const shortHash = hash.toString(16).slice(0, 6);

  return `${combined}_${shortHash}`;
}

export function trimBookTitle(title: string, maxLength = 50): string {
  if (title.length <= maxLength) return title;

  // Trim to max length
  let trimmed = title.slice(0, maxLength);

  // Avoid cutting words in half — trim back to last space if possible
  const lastSpace = trimmed.lastIndexOf(" ");
  if (lastSpace > 0) trimmed = trimmed.slice(0, lastSpace);

  // Append ellipsis to show it was shortened
  return trimmed + "…";
}
/**
 * prepare-chapter-html.ts
 *
 * Enhanced prepareChapterHtml that optionally disables EPUB stylesheet/style-blocks
 * while preserving resource access (images/fonts/etc).
 *
 * - By default this function preserves app behavior: it resolves resource URLs,
 *   creates blob/object URLs (or posts to SW if you extend it) and rewrites img/src/srcset/style URLs.
 * - New option `disableStyles` (boolean):
 *   - if true: removes all <style> blocks and <link rel="stylesheet"> nodes from the parsed chapter
 *     so EPUB CSS cannot leak into your app UI. The function still scans those removed CSS blocks
 *     for url(...) references and fetches those assets so they remain available (e.g. for pre-caching).
 *   - inline style attributes are left intact by default so background images and sizing still render.
 *     If you want to remove inline style attributes too, pass `removeInlineStyles: true`.
 *
 * Note: this implementation assumes `epub.resolveHref` and `epub.getFile` are available on the Epub instance.
 * It uses the same object-url caching / refcount pattern as before.
 */

type ResourceUsage = {
  normalizedPath: string;
  mediaType?: string | null;
  node: Element | null; // may be null for style-blocks we've removed
  attr: string; // "src" | "srcset" | "style" | "href" | "style-block" | etc.
  original: string;
  descriptor?: string | null; // for srcset candidates
  fragment?: string | null;
};

type PrepareResult = {
  html: string;
  cleanup: () => Promise<void>;
  missing: string[]; // normalized paths attempted but not found in zip
};

export async function prepareChapterHtml(opts: {
  epub: Epub;
  chapterHref: string;
  chapterHtml: string;
  cache?: Map<
    string,
    { objectUrl: string; refCount: number; mediaType?: string | null }
  >;
  preferBlobUrl?: boolean; // default true
  // New options:
  disableStyles?: boolean; // default false. If true, remove <style> and <link rel=stylesheet> nodes.
  removeInlineStyles?: boolean; // default false. If true, remove inline `style` attributes as well.
}): Promise<PrepareResult> {
  const {
    epub,
    chapterHtml,
    cache = new Map(),
    preferBlobUrl = true,
    disableStyles = true,
    removeInlineStyles = false,
  } = opts;

  // simple extension -> mime map fallback
  const mimeFromExt = (path: string | undefined): string | null => {
    if (!path) return null;
    const p = path.split("?")[0].split("#")[0].toLowerCase();
    if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
    if (p.endsWith(".png")) return "image/png";
    if (p.endsWith(".gif")) return "image/gif";
    if (p.endsWith(".webp")) return "image/webp";
    if (p.endsWith(".avif")) return "image/avif";
    if (p.endsWith(".svg") || p.endsWith(".svgz")) return "image/svg+xml";
    if (p.endsWith(".css")) return "text/css";
    if (p.endsWith(".mp4")) return "video/mp4";
    if (p.endsWith(".mp3")) return "audio/mpeg";
    if (p.endsWith(".woff")) return "font/woff";
    if (p.endsWith(".woff2")) return "font/woff2";
    if (p.endsWith(".ttf")) return "font/ttf";
    return "application/octet-stream";
  };

  // Parse HTML (use text/html to be tolerant)
  const parser = new DOMParser();
  const doc = parser.parseFromString(chapterHtml, "text/html");

  // We'll collect resource usages here
  const usages: ResourceUsage[] = [];

  // Best-effort manifest lookup
  const resourcesIndex: Record<string, { mediaType?: string } | undefined> =
    (epub as any).resources && typeof (epub as any).resources === "object"
      ? (epub as any).resources
      : {};

  // Helper to record a usage
  function recordUsage(
    normalizedPath: string,
    node: Element | null,
    attr: string,
    original: string,
    descriptor?: string | null,
    fragment?: string | null
  ) {
    if (!normalizedPath) return;
    usages.push({
      normalizedPath,
      mediaType: resourcesIndex[normalizedPath]?.mediaType ?? null,
      node,
      attr,
      original,
      descriptor,
      fragment: fragment ?? null,
    });
  }

  // Try to resolve a raw href/url to epub normalized path + fragment using epub.resolveHref,
  // with safe fallbacks
  function tryResolve(raw: string): {
    normalizedPath: string | null;
    fragment?: string | null;
  } {
    if (!raw) return { normalizedPath: null };
    const trimmed = raw.trim();

    // absolute schemes: leave alone; not an internal resource
    if (
      trimmed.startsWith("data:") ||
      trimmed.startsWith("blob:") ||
      trimmed.startsWith("file:") ||
      /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)
    ) {
      return { normalizedPath: null };
    }

    if (trimmed.startsWith("#")) {
      return { normalizedPath: null, fragment: trimmed.slice(1) };
    }

    try {
      const resolved = epub.resolveHref(trimmed);
      if (resolved && resolved.normalizedPath) {
        return {
          normalizedPath: resolved.normalizedPath,
          fragment: resolved.fragment,
        };
      } else {
        const fallback = (epub as any).opfFolder
          ? ((epub as any).opfFolder + trimmed).replace(/\/{2,}/g, "/")
          : trimmed;
        return { normalizedPath: fallback, fragment: undefined };
      }
    } catch {
      const fallback = (epub as any).opfFolder
        ? ((epub as any).opfFolder + trimmed).replace(/\/{2,}/g, "/")
        : trimmed;
      return { normalizedPath: fallback, fragment: undefined };
    }
  }

  // parse srcset helper
  function parseSrcset(
    srcset: string
  ): Array<{ url: string; descriptor?: string }> {
    return srcset
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((token) => {
        const parts = token.split(/\s+/);
        const url = parts.shift() || "";
        const descriptor = parts.join(" ") || undefined;
        return { url, descriptor };
      });
  }

  const cssUrlRegex = /url\(\s*(['"]?)(.*?)\1\s*\)/gi;

  // If disableStyles is true, we will:
  // - scan <style> blocks and <link rel=stylesheet> for url(...) references
  // - record those usages so we can fetch the referenced files
  // - then remove the style/link nodes from the DOM so CSS doesn't apply globally
  if (disableStyles) {
    // scan and remove <style> blocks
    const styleBlocks = Array.from(doc.querySelectorAll("style"));
    for (const s of styleBlocks) {
      const css = s.textContent || "";
      let match: RegExpExecArray | null;
      cssUrlRegex.lastIndex = 0;
      while ((match = cssUrlRegex.exec(css)) !== null) {
        const rawUrl = match[2];
        const { normalizedPath, fragment } = tryResolve(rawUrl);
        if (normalizedPath) {
          // Node is null because we're removing the style block; keep attr "style-block" to fetch it
          recordUsage(
            normalizedPath,
            null,
            "style-block",
            rawUrl,
            null,
            fragment ?? null
          );
        }
      }
      // remove the style block so CSS doesn't leak
      s.parentNode?.removeChild(s);
    }

    // scan and remove <link rel="stylesheet"> nodes (and similar)
    const linkSelectors = [
      'link[rel="stylesheet"]',
      'link[rel="style"]',
      'link[rel="preload"][as="style"]',
    ].join(", ");
    const linkNodes = Array.from(doc.querySelectorAll(linkSelectors));
    for (const l of linkNodes) {
      const href = l.getAttribute("href") || "";
      if (href) {
        const { normalizedPath } = tryResolve(href);
        if (normalizedPath) {
          recordUsage(normalizedPath, null, "href", href, null, null);
        }
      }
      // remove link so stylesheet is not applied
      l.parentNode?.removeChild(l);
    }
  }

  // 1) Scan <img> etc (unchanged)
  const imgNodes = Array.from(doc.querySelectorAll("img"));
  for (const img of imgNodes) {
    const src = img.getAttribute("src") || "";
    if (src) {
      const { normalizedPath, fragment } = tryResolve(src);
      if (normalizedPath)
        recordUsage(normalizedPath, img, "src", src, null, fragment ?? null);
    }
    const srcset = img.getAttribute("srcset");
    if (srcset) {
      const candidates = parseSrcset(srcset);
      for (const c of candidates) {
        const { normalizedPath, fragment } = tryResolve(c.url);
        if (normalizedPath) {
          recordUsage(
            normalizedPath,
            img,
            "srcset",
            c.url,
            c.descriptor ?? null,
            fragment ?? null
          );
        }
      }
    }
  }

  // 2) picture/source
  const sourceNodes = Array.from(doc.querySelectorAll("source"));
  for (const s of sourceNodes) {
    const src = s.getAttribute("src");
    if (src) {
      const { normalizedPath, fragment } = tryResolve(src);
      if (normalizedPath)
        recordUsage(normalizedPath, s, "src", src, null, fragment ?? null);
    }
    const ss = s.getAttribute("srcset");
    if (ss) {
      const candidates = parseSrcset(ss);
      for (const c of candidates) {
        const { normalizedPath, fragment } = tryResolve(c.url);
        if (normalizedPath)
          recordUsage(
            normalizedPath,
            s,
            "srcset",
            c.url,
            c.descriptor ?? null,
            fragment ?? null
          );
      }
    }
  }

  // 3) media tags and poster
  const mediaNodes = Array.from(doc.querySelectorAll("video, audio"));
  for (const m of mediaNodes) {
    const src = m.getAttribute("src");
    if (src) {
      const { normalizedPath, fragment } = tryResolve(src);
      if (normalizedPath)
        recordUsage(normalizedPath, m, "src", src, null, fragment ?? null);
    }
    const poster = m.getAttribute("poster");
    if (poster) {
      const { normalizedPath, fragment } = tryResolve(poster);
      if (normalizedPath)
        recordUsage(
          normalizedPath,
          m,
          "poster",
          poster,
          null,
          fragment ?? null
        );
    }
  }

  // 4) link nodes already handled if disableStyles; but if disableStyles=false we still need to record them
  if (!disableStyles) {
    const linkNodes = Array.from(
      doc.querySelectorAll(
        'link[rel="stylesheet"], link[rel="style"], link[rel="preload"][as="style"]'
      )
    );
    for (const l of linkNodes) {
      const href = l.getAttribute("href") || "";
      if (href) {
        const { normalizedPath } = tryResolve(href);
        if (normalizedPath)
          recordUsage(normalizedPath, l, "href", href, null, null);
      }
    }
  }

  // 5) inline style attributes: we will keep them by default (so background images still render),
  //    but if removeInlineStyles=true we will strip the attribute entirely.
  const styledNodes = Array.from(doc.querySelectorAll<HTMLElement>("[style]"));
  for (const node of styledNodes) {
    const style = node.getAttribute("style") || "";
    // gather url(...) references from inline styles for later fetching/rewrite
    let match: RegExpExecArray | null;
    cssUrlRegex.lastIndex = 0;
    while ((match = cssUrlRegex.exec(style)) !== null) {
      const rawUrl = match[2];
      const { normalizedPath, fragment } = tryResolve(rawUrl);
      if (normalizedPath)
        recordUsage(
          normalizedPath,
          node,
          "style",
          rawUrl,
          null,
          fragment ?? null
        );
    }

    if (removeInlineStyles) {
      node.removeAttribute("style");
    }
  }

  // 6) style blocks already handled when disableStyles=true; if not disabled, collect urls for rewriting
  if (!disableStyles) {
    const styleBlocks = Array.from(doc.querySelectorAll("style"));
    for (const s of styleBlocks) {
      const css = s.textContent || "";
      let match: RegExpExecArray | null;
      cssUrlRegex.lastIndex = 0;
      while ((match = cssUrlRegex.exec(css)) !== null) {
        const rawUrl = match[2];
        const { normalizedPath, fragment } = tryResolve(rawUrl);
        if (normalizedPath)
          recordUsage(
            normalizedPath,
            s,
            "style-block",
            rawUrl,
            null,
            fragment ?? null
          );
      }
    }
  }

  // 7) object / embed / iframe
  const objectNodes = Array.from(doc.querySelectorAll("object, embed, iframe"));
  for (const n of objectNodes) {
    const attr = n.tagName.toLowerCase() === "object" ? "data" : "src";
    const raw = n.getAttribute(attr);
    if (raw) {
      const { normalizedPath, fragment } = tryResolve(raw);
      if (normalizedPath)
        recordUsage(normalizedPath, n, attr, raw, null, fragment ?? null);
    }
  }

  // Deduplicate usages by normalizedPath
  const byPath = new Map<string, ResourceUsage[]>();
  for (const u of usages) {
    if (!u.normalizedPath) continue;
    const arr = byPath.get(u.normalizedPath) || [];
    arr.push(u);
    byPath.set(u.normalizedPath, arr);
  }

  // Create object URLs (or data URIs) for each resource we need
  const createdUrls = new Map<string, string>();
  const toRevoke: string[] = [];
  const missingPaths: string[] = [];

  for (const [normalizedPath, usageList] of byPath.entries()) {
    try {
      const cached = cache.get(normalizedPath);
      if (cached && cached.objectUrl) {
        cached.refCount += usageList.length;
        createdUrls.set(normalizedPath, cached.objectUrl);
        continue;
      }

      let fileBuffer: ArrayBuffer | null = null;
      try {
        fileBuffer = await epub.getFile(normalizedPath);
      } catch {
        fileBuffer = null;
      }

      if (!fileBuffer) {
        // try decodeURIComponent fallback
        try {
          const decoded = decodeURIComponent(normalizedPath);
          if (decoded !== normalizedPath) {
            fileBuffer = await epub.getFile(decoded);
          }
        } catch {
          // ignore
        }

        // try prefixing with opfFolder
        if (
          !fileBuffer &&
          (epub as any).opfFolder &&
          !normalizedPath.startsWith((epub as any).opfFolder)
        ) {
          const candidate = ((epub as any).opfFolder + normalizedPath).replace(
            /\/{2,}/g,
            "/"
          );
          try {
            fileBuffer = await epub.getFile(candidate);
            // if found, we should treat candidate as canonical key (but keep original normalizedPath in usages)
            if (fileBuffer) {
              // override normalizedPath var? No — keep cache key consistent using candidate
              // Here we'll set createdUrls with the candidate as key to avoid double fetches
              // But map key is still normalizedPath - that's fine for most cases.
            }
          } catch {
            // ignore
          }
        }

        if (!fileBuffer) {
          missingPaths.push(normalizedPath);
          continue;
        }
      }

      const mediaTypeCandidate =
        resourcesIndex[normalizedPath]?.mediaType ??
        mimeFromExt(normalizedPath) ??
        undefined;

      let objectUrl: string;
      if (preferBlobUrl) {
        const blob = new Blob([fileBuffer!], { type: mediaTypeCandidate });
        objectUrl = URL.createObjectURL(blob);
        toRevoke.push(objectUrl);
      } else {
        // data URI fallback
        const bytes = new Uint8Array(fileBuffer!);
        let binary = "";
        for (let i = 0; i < bytes.byteLength; i++)
          binary += String.fromCharCode(bytes[i]);
        const base64 = btoa(binary);
        objectUrl = `data:${
          mediaTypeCandidate ?? "application/octet-stream"
        };base64,${base64}`;
      }

      cache.set(normalizedPath, {
        objectUrl,
        refCount: usageList.length,
        mediaType: mediaTypeCandidate,
      });
      createdUrls.set(normalizedPath, objectUrl);
    } catch (err) {
      missingPaths.push(normalizedPath);
      console.error(
        "prepareChapterHtml: error creating blob for",
        normalizedPath,
        err
      );
      continue;
    }
  }

  // Now rewrite references in the DOM for the usages that map to createdUrls
  for (const [normalizedPath, usageList] of byPath.entries()) {
    const objectUrl = createdUrls.get(normalizedPath);
    if (!objectUrl) continue;

    for (const u of usageList) {
      try {
        const frag = u.fragment ? `#${u.fragment}` : "";
        if (
          u.attr === "src" ||
          u.attr === "href" ||
          u.attr === "poster" ||
          u.attr === "data"
        ) {
          if (u.node)
            (u.node as Element).setAttribute(u.attr, objectUrl + frag);
        } else if (u.attr === "srcset") {
          if (!u.node) continue;
          const current = (u.node as Element).getAttribute("srcset") || "";
          const candidates = parseSrcset(current);
          const rebuilt = candidates
            .map((c) => {
              const resolvedCandidate = tryResolve(c.url).normalizedPath;
              if (resolvedCandidate === normalizedPath) {
                return `${objectUrl + (u.fragment ? `#${u.fragment}` : "")}${
                  c.descriptor ? " " + c.descriptor : ""
                }`;
              } else {
                return c.descriptor ? `${c.url} ${c.descriptor}` : c.url;
              }
            })
            .join(", ");
          (u.node as Element).setAttribute("srcset", rebuilt);
        } else if (u.attr === "style") {
          // inline style attribute: rewrite url(...) to objectUrl
          const styleVal = (u.node as Element).getAttribute("style") || "";
          const newStyle = styleVal.replace(
            cssUrlRegex,
            (match, quote, urlInside) => {
              const resolved = tryResolve(urlInside).normalizedPath;
              if (resolved === normalizedPath) {
                const q = quote || "";
                return `url(${q}${objectUrl + frag}${q})`;
              }
              return match;
            }
          );
          (u.node as Element).setAttribute("style", newStyle);
        } else if (u.attr === "style-block") {
          // style-block may have been removed if disableStyles=true; if node exists, rewrite, otherwise skip
          if (u.node) {
            const s = u.node as HTMLStyleElement;
            const css = s.textContent || "";
            const newCss = css.replace(
              cssUrlRegex,
              (match, quote, urlInside) => {
                const resolved = tryResolve(urlInside).normalizedPath;
                if (resolved === normalizedPath) {
                  const q = quote || "";
                  return `url(${q}${objectUrl + frag}${q})`;
                }
                return match;
              }
            );
            s.textContent = newCss;
          } else {
            // nothing to rewrite because style block was removed (we fetched resource for caching)
          }
        } else {
          // generic fallback
          if (u.node)
            (u.node as Element).setAttribute(u.attr, objectUrl + frag);
        }
      } catch (e) {
        console.warn("prepareChapterHtml: failed to rewrite node", u, e);
      }
    }
  }

  // Serialize back to HTML fragment. We want the inner content, not a full <html> wrapper.
  const containerHtml = doc.body
    ? doc.body.innerHTML
    : doc.documentElement?.outerHTML ?? chapterHtml;

  // Build cleanup function that decrements cache refcounts and revokes any object URLs created here
  let cleaned = false;
  async function cleanup() {
    if (cleaned) return;
    cleaned = true;

    for (const [normalizedPath, usageList] of byPath.entries()) {
      const cached = cache.get(normalizedPath);
      if (!cached) continue;
      cached.refCount = Math.max(0, cached.refCount - usageList.length);
      if (cached.refCount === 0) {
        try {
          if (cached.objectUrl && cached.objectUrl.startsWith("blob:")) {
            URL.revokeObjectURL(cached.objectUrl);
          }
        } catch {
          // ignore
        }
        cache.delete(normalizedPath);
      }
    }

    for (const url of toRevoke) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    }
  }

  return {
    html: containerHtml,
    cleanup,
    missing: missingPaths,
  };
}

export function buildTocSpineRanges(epub: Epub) {
  // flatten TOC entries into an array of hrefs in TOC order
  const flatten = (entries: TocEntry[] | undefined, out: string[] = []) => {
    if (!entries) return out;
    for (const e of entries) {
      if (e.href) out.push(e.href);
      if (e.children && e.children.length) flatten(e.children, out);
    }
    return out;
  };
  const tocHrefs = flatten(epub.toc || []);

  // build map from normalizedPath -> chapterIndex for the spine
  const pathToIndex = new Map<string, number>();
  (epub.chapters || []).forEach((ch, idx) => {
    if (ch && ch.href) {
      const resolved = epub.resolveHref(ch.href);
      if (resolved && resolved.normalizedPath) {
        pathToIndex.set(resolved.normalizedPath, idx);
      } else {
        // fallback: use the raw href if normalizedPath missing
        pathToIndex.set(ch.href, idx);
      }
    }
  });

  // compute start indices for each toc href by resolving the href and finding the chapter index
  const tocEntriesWithIndex: Array<{
    href: string;
    startIndex: number | null;
  }> = tocHrefs.map((href) => {
    try {
      const r = epub.resolveHref(href);
      const normalized = r && r.normalizedPath ? r.normalizedPath : href;
      const idx = pathToIndex.has(normalized)
        ? pathToIndex.get(normalized)!
        : null;
      return { href, startIndex: idx };
    } catch {
      return { href, startIndex: null };
    }
  });

  // now create ranges: for entries with valid startIndex, end is next valid startIndex, else spine length
  const ranges = new Map<string, { start: number; end: number }>();
  const spineLength = (epub.chapters || []).length;
  // build array of only valid starts preserving order
  const validStarts = tocEntriesWithIndex
    .map((e) => ({ href: e.href, startIndex: e.startIndex }))
    .filter((e) => e.startIndex !== null) as Array<{
    href: string;
    startIndex: number;
  }>;

  for (let i = 0; i < validStarts.length; i++) {
    const { href, startIndex } = validStarts[i];
    // find next valid start index greater than this startIndex; if none, use spineLength
    let end = spineLength;
    for (let j = i + 1; j < validStarts.length; j++) {
      const nextStart = validStarts[j].startIndex;
      if (typeof nextStart === "number" && nextStart > startIndex) {
        end = nextStart;
        break;
      }
    }
    ranges.set(href, { start: startIndex, end });
  }

  return ranges; // Map<href, {start,end}>
}
export async function loadSpineRangeContent(
  epub: Epub,
  start: number,
  end: number
) {
  const chaptersHtml: string[] = [];
  const chapterHrefs: string[] = [];
  for (let i = start; i < end; i++) {
    const ch = epub.chapters?.[i];
    if (!ch) continue;
    // prefer the already-parsed content if available on chapter.content
    let content = ch.content;
    if (!content) {
      // try to resolve and fetch raw file
      try {
        const resolved = epub.resolveHref(ch.href || "");
        if (resolved && resolved.normalizedPath) {
          const buf = await epub.getFile(resolved.normalizedPath);
          if (buf) content = new TextDecoder().decode(buf);
        }
      } catch {
        // ignore, fallback below
      }
    }
    if (!content)
      content = `<div class="text-muted-foreground"><em>Unable to load chapter ${escapeHtml(
        ch.href || `#${i}`
      )}</em></div>`;
    // wrap in container so fragments and later DOM queries are scoped
    const wrapper = `<div data-chapter-index="${i}" data-chapter-href="${escapeHtml(
      ch.href || ""
    )}">${content}</div>`;
    chaptersHtml.push(wrapper);
    chapterHrefs.push(ch.href || "");
  }
  const combined = chaptersHtml.join("\n");
  return { combinedHtml: combined, chapterHrefs };
}
