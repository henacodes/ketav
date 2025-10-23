import { DirEntry } from "@tauri-apps/plugin-fs";
import { Epub, EpubMetadata, loadEpubMetadata } from "epubix";
import { readFile, BaseDirectory } from "@tauri-apps/plugin-fs";
import { getSettings } from "./settings";
import type { LibraryEpub } from "../types/epub";

export function filterEpubFiles(files: DirEntry[]) {
  return files.filter((file) => file.isFile && file.name.endsWith(".epub"));
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

type BookIdParams = EpubMetadata & { fileName?: string };

export function generateBookId({
  title,
  author,
  cover,
  fileName,
}: BookIdParams): string {
  title = title || `${cover}` + `${fileName}`; // fallback to chapter and TOC length
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

// Note: Ensure DOM lib is available in tsconfig (lib: ["dom", ...])

type ResourceUsage = {
  normalizedPath: string;
  mediaType?: string | null;
  // location info to update DOM in-place
  node: Element;
  attr: string; // "src" | "srcset" | "style" | "href" | etc.
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
}): Promise<PrepareResult> {
  const { epub, chapterHtml, cache = new Map(), preferBlobUrl = true } = opts;

  // Helper: simple extension -> mime map fallback
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
    return null;
  };

  // Parse HTML (use text/html to be tolerant)
  const parser = new DOMParser();
  // Some chapters are XHTML; using text/html is more forgiving and keeps innerHTML roundtrip manageable
  const doc = parser.parseFromString(chapterHtml, "text/html");

  // Build a list of usages to resolve later
  const usages: ResourceUsage[] = [];

  // Normalize access to epub.resources for mediaType lookup (best-effort)
  const resourcesIndex: Record<string, { mediaType?: string } | undefined> =
    (epub as any).resources && typeof (epub as any).resources === "object"
      ? (epub as any).resources
      : {};

  // Helper to record a usage for later blob creation
  function recordUsage(
    normalizedPath: string,
    node: Element,
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

  // Resolve raw URL via epub.resolveHref, returning normalizedPath + fragment, or null if external/fragment-only
  function tryResolve(raw: string): {
    normalizedPath: string | null;
    fragment?: string | null;
  } {
    if (!raw) return { normalizedPath: null };
    const trimmed = raw.trim();

    // Leave data: and blob: and other absolute schemes untouched
    if (
      trimmed.startsWith("data:") ||
      trimmed.startsWith("blob:") ||
      trimmed.startsWith("file:") ||
      /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)
    ) {
      return { normalizedPath: null };
    }

    // fragments only (#...)
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
        // If resolveHref didn't provide normalizedPath, we still may have a path-like value; attempt to guess by using opfFolder prefix
        const fallback = (epub as any).opfFolder
          ? ((epub as any).opfFolder + trimmed).replace(/\/{2,}/g, "/")
          : trimmed;
        return { normalizedPath: fallback, fragment: undefined };
      }
    } catch {
      // As a last resort, attempt naive join with opfFolder or use raw
      const fallback = (epub as any).opfFolder
        ? ((epub as any).opfFolder + trimmed).replace(/\/{2,}/g, "/")
        : trimmed;
      return { normalizedPath: fallback, fragment: undefined };
    }
  }

  // Utility: parse srcset into candidates
  function parseSrcset(
    srcset: string
  ): Array<{ url: string; descriptor?: string }> {
    // Simplified parse: split by commas and trim; this will work for typical srcset usage
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

  // CSS url(...) regex
  const cssUrlRegex = /url\(\s*(['"]?)(.*?)\1\s*\)/gi;

  // 1) Scan <img>
  const imgNodes = Array.from(doc.querySelectorAll("img"));
  for (const img of imgNodes) {
    const src = img.getAttribute("src") || "";
    if (src) {
      const { normalizedPath, fragment } = tryResolve(src);
      if (normalizedPath) {
        // only record if not absolute/external (tryResolve returns null for those)
        recordUsage(normalizedPath, img, "src", src, null, fragment ?? null);
      }
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

  // 2) <picture> and <source> (src and srcset)
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

  // 3) <video>, <audio>, <track>, <source> already handled above for <source>; also poster attribute
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
    // also inner <source> tags are caught earlier by sourceNodes
  }

  // 4) <link rel="stylesheet" href>
  const linkNodes = Array.from(
    doc.querySelectorAll(
      'link[rel="stylesheet"], link[rel="style"], link[rel="preload"][as="style"]'
    )
  );
  for (const l of linkNodes) {
    const href = l.getAttribute("href");
    if (href) {
      const { normalizedPath } = tryResolve(href);
      if (normalizedPath)
        recordUsage(normalizedPath, l, "href", href, null, null);
    }
  }

  // 5) style attributes (inline)
  const styledNodes = Array.from(doc.querySelectorAll<HTMLElement>("[style]"));
  for (const node of styledNodes) {
    const style = node.getAttribute("style") || "";
    let match: RegExpExecArray | null;
    cssUrlRegex.lastIndex = 0;
    while ((match = cssUrlRegex.exec(style)) !== null) {
      const rawUrl = match[2];
      const { normalizedPath, fragment } = tryResolve(rawUrl);
      if (normalizedPath) {
        recordUsage(
          normalizedPath,
          node,
          "style",
          rawUrl,
          null,
          fragment ?? null
        );
      }
    }
  }

  // 6) <style> blocks content
  const styleBlocks = Array.from(doc.querySelectorAll("style"));
  for (const s of styleBlocks) {
    const css = s.textContent || "";
    let match: RegExpExecArray | null;
    cssUrlRegex.lastIndex = 0;
    while ((match = cssUrlRegex.exec(css)) !== null) {
      const rawUrl = match[2];
      const { normalizedPath, fragment } = tryResolve(rawUrl);
      if (normalizedPath) {
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

  // 7) object / embed / iframe data/src
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

  // Deduplicate usages per normalizedPath but keep nodes for rewriting
  const byPath = new Map<string, ResourceUsage[]>();
  for (const u of usages) {
    if (!u.normalizedPath) continue;
    const arr = byPath.get(u.normalizedPath) || [];
    arr.push(u);
    byPath.set(u.normalizedPath, arr);
  }

  // For each normalizedPath, fetch file (if available) and create object URL (or data URI fallback)
  const createdUrls: Map<string, string> = new Map(); // normalizedPath -> objectUrl
  const toRevoke: string[] = []; // objectUrls we created in this call (not existing cached ones)
  const missingPaths: string[] = [];

  for (const [normalizedPath, usageList] of byPath.entries()) {
    // Skip if the resolved path looks absolute/external (we only recorded normalizedPaths we want to fetch)
    try {
      const cached = cache.get(normalizedPath);
      if (cached && cached.objectUrl) {
        // bump refCount for usages
        cached.refCount += usageList.length;
        createdUrls.set(normalizedPath, cached.objectUrl);
        continue;
      }

      // Attempt to get file from epub
      let fileBuffer: ArrayBuffer | null = null;
      try {
        fileBuffer = await epub.getFile(normalizedPath);
      } catch {
        fileBuffer = null;
      }

      if (!fileBuffer) {
        // try alternative lookups: sometimes normalizedPath lacks opfFolder or encoding differs

        // Try decodeURIComponent/encodeURIComponent variants
        try {
          const decoded = decodeURIComponent(normalizedPath);
          if (decoded !== normalizedPath) {
            fileBuffer = await epub.getFile(decoded);
          }
        } catch {
          // ignore
        }

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
            if (fileBuffer) {
              // Normalize to candidate so cache keys match actual zip entry path
              // But be careful: we should use the actual zip entry path as the key
            }
          } catch {
            // ignore
          }
        }

        if (!fileBuffer) {
          missingPaths.push(normalizedPath);
          // leave original references as-is by not creating an object URL
          continue;
        }
      }

      // Determine mediaType
      const mediaTypeCandidate =
        resourcesIndex[normalizedPath]?.mediaType ??
        mimeFromExt(normalizedPath) ??
        null;

      // Create blob and object URL (prefer blob)
      let objectUrl: string;
      if (preferBlobUrl) {
        const blob = new Blob([fileBuffer!], {
          type: mediaTypeCandidate ?? undefined,
        });
        objectUrl = URL.createObjectURL(blob);
        toRevoke.push(objectUrl);
      } else {
        // fallback to data URI (for very small files). We'll base64 encode the ArrayBuffer.
        const bytes = new Uint8Array(fileBuffer!);
        let binary = "";
        for (let i = 0; i < bytes.byteLength; i++)
          binary += String.fromCharCode(bytes[i]);
        const base64 = btoa(binary);
        objectUrl = `data:${
          mediaTypeCandidate ?? "application/octet-stream"
        };base64,${base64}`;
        // data URIs don't need revocation
      }

      // cache it
      cache.set(normalizedPath, {
        objectUrl,
        refCount: usageList.length,
        mediaType: mediaTypeCandidate ?? undefined,
      });
      createdUrls.set(normalizedPath, objectUrl);
    } catch (err) {
      // If creating object URL fails, mark missing and continue
      missingPaths.push(normalizedPath);
      console.error(
        "prepareChapterHtml: error creating blob for",
        normalizedPath,
        err
      );
      continue;
    }
  }

  // Now perform in-place replacement in the parsed DOM for each usage
  for (const [normalizedPath, usageList] of byPath.entries()) {
    const objectUrl = createdUrls.get(normalizedPath);
    if (!objectUrl) {
      // skip rewriting missing resources
      continue;
    }

    for (const u of usageList) {
      try {
        // preserve fragment if present
        const frag = u.fragment ? `#${u.fragment}` : "";
        if (
          u.attr === "src" ||
          u.attr === "href" ||
          u.attr === "poster" ||
          u.attr === "data"
        ) {
          (u.node as Element).setAttribute(u.attr, objectUrl + frag);
        } else if (u.attr === "srcset") {
          // For srcset, we need to rewrite only the candidate(s) referencing this normalizedPath.
          // We'll rebuild the whole srcset by parsing the current attribute and replacing matching original urls.
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
                // leave as original candidate
                return c.descriptor ? `${c.url} ${c.descriptor}` : c.url;
              }
            })
            .join(", ");
          (u.node as Element).setAttribute("srcset", rebuilt);
        } else if (u.attr === "style") {
          // Replace url(...) occurrences in the inline style attribute that match the original
          const styleVal = (u.node as Element).getAttribute("style") || "";
          const newStyle = styleVal.replace(
            cssUrlRegex,
            (match, quote, urlInside) => {
              // If this urlInside resolves to our normalizedPath, replace
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
          // Replace inside the style block textContent
          const s = u.node as HTMLStyleElement;
          const css = s.textContent || "";
          const newCss = css.replace(cssUrlRegex, (match, quote, urlInside) => {
            const resolved = tryResolve(urlInside).normalizedPath;
            if (resolved === normalizedPath) {
              const q = quote || "";
              return `url(${q}${objectUrl + frag}${q})`;
            }
            return match;
          });
          s.textContent = newCss;
        } else {
          // Generic fallback for unknown attrs: set attribute to objectUrl
          (u.node as Element).setAttribute(u.attr, objectUrl + frag);
        }
      } catch (e) {
        // If any replacement fails, continue - do not throw
        console.warn("prepareChapterHtml: failed to rewrite node", u, e);
      }
    }
  }

  // Serialize back to HTML fragment. We want the inner content, not a full <html> wrapper.
  // If the original content was a fragment, we preserved it under doc.body.
  const containerHtml = doc.body
    ? doc.body.innerHTML
    : doc.documentElement?.outerHTML ?? chapterHtml;

  // Build cleanup: decrement cache refcounts and revoke any objectUrls created in this call
  let cleaned = false;
  async function cleanup() {
    if (cleaned) return;
    cleaned = true;

    // Decrement refCounts for usages we incremented
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
      } else {
        // leave in cache
      }
    }

    // Also revoke object URLs that were created by this call but not tracked in cache for some reason
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
