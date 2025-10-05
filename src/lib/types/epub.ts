export type SupportedEbooks = "epub";

export interface LibraryEpub {
  coverImage: string | null;
  name: string;
  type: SupportedEbooks;
}
