// Quick shim for epubix until the package ships real .d.ts files.
// Keep this in your app's source (src/) and remove once the library publishes types.

declare module "epubix" {
  export type EpubChapter = {
    id?: string;
    title?: string;
    href?: string;
    content?: string;
  };

  export type TocEntry = {
    title?: string;
    href?: string;
    children?: TocEntry[];
  };

  export type EpubBook = {
    metadata?: Record<string, any>;
    chapters: EpubChapter[];
    resources?: Record<string, any>;
    toc: TocEntry[];
    opfFolder?: string;
  };

  export type ResolveHrefResult = {
    chapterIndex?: number;
    fragment?: string;
    normalizedPath: string;
  };

  export type GetChapterByHrefResult = {
    chapter?: EpubChapter;
    fragment?: string;
  };

  export class Epub {
    metadata: EpubBook["metadata"];
    chapters: EpubBook["chapters"];
    resources: EpubBook["resources"];
    toc: EpubBook["toc"];
    opfFolder?: string;

    resolveHref(href: string): ResolveHrefResult;
    getChapterByHref(href: string): GetChapterByHrefResult;

    getChapter(identifier: string | number): EpubChapter | undefined;
    getFile(path: string): Promise<ArrayBuffer | null>;
    getCoverImageData(): Promise<string | null>;
  }

  export function loadEpubBook(
    source: File | Blob | ArrayBuffer | Uint8Array
  ): Promise<Epub>;
  export function loadEpubMetadata(
    source: File | Blob | ArrayBuffer | Uint8Array
  ): Promise<any>;

  const _default: {
    loadEpubBook: typeof loadEpubBook;
    loadEpubMetadata: typeof loadEpubMetadata;
    Epub: typeof Epub;
  };

  export default _default;
}
