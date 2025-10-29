import { AlignmentOptions, FontFamilyOptions } from "./types/settings";

export const STORE_KEYS = {
  libraryFolderPath: "library-folder-path",
  fontFamily: "font-family",
  textAlignment: "text-alignment",
  lastOpenedBook: "last-opened-book",
  lastOpenedPage: "last-opened-page",
};

// default store values
export const DEFAULT_LIBRARY_FOLDER_PATH = "books";
export const DEFAULT_TEXT_ALIGNMENT: AlignmentOptions = "justify";
export const DEFAULT_FONT_FAMILY: FontFamilyOptions = "Helvetica";

export const DATABASE_NAME = "ketav-local.db";
export const THEME_STORAGE_KEY = "vite-ui-theme";

export const BOOK_COVER_IMAGE_FOLDER = "covers";
