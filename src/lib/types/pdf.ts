export type PdfMetadata = {
  title?: string | null;
  author?: string | null;
  pages?: number | null;
  // other pdf metadata you might extract
  fileName?: string;
};

export type OpenPdf = {
  type: "pdf";
  metadata: PdfMetadata;
  // the raw bytes (Uint8Array) of the PDF; PdfReader will consume this
  fileBytes: Uint8Array;
};
