import { loadEpubMetadata } from "epubix";
import { Epub } from "epubix";
export type SupportedEbooks = "epub";

type BaseLibraryEpub = Awaited<ReturnType<typeof loadEpubMetadata>>;

export type LibraryEpub = BaseLibraryEpub & {
  fileName: string; // path to the EPUB file
};

export type OpenEpub = {
  metadata: LibraryEpub;
  book: Epub;
};
