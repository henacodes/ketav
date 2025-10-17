import type { EpubMetadata } from "epubix";
import { Epub } from "epubix";
export type SupportedEbooks = "epub";

export type LibraryEpub = EpubMetadata & {
  fileName: string;
};

export type OpenEpub = {
  metadata: LibraryEpub;
  book: Epub;
};
