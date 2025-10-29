export type LastOpenedPage = Record<string, number>;

export interface History {
  // last opened pages of different pdf books
  lastOpenedPages: LastOpenedPage[];
  lastOpenedBookFileName: string;
}
