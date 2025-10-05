import { loadEpubMetadata } from "epubix";

export type SupportedEbooks = "epub";

export type LibraryEpub = Awaited<ReturnType<typeof loadEpubMetadata>>;
