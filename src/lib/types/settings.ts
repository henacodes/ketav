export type AlignmentOptions = "left" | "center" | "justify";
export type FontFamilyOptions =
  | "Helvetica"
  | "Lexend"
  | "SegoeUI"
  | "Robot"
  | "RobotoCondensed"
  | "Comfortaa";

export interface Settings {
  libraryFolderPath: string;
  textAlignment: AlignmentOptions;
  fontFamily: FontFamilyOptions;
}
