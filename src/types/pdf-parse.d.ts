declare module "pdf-parse/lib/pdf-parse.js" {
  interface PdfParseOptions {
    pagerender?: (pageData: unknown) => string | Promise<string>;
    max?: number;
    version?: string;
    [key: string]: unknown;
  }

  interface PdfParseInfo {
    PDFFormatVersion?: string;
    Title?: string;
    Author?: string;
    [key: string]: unknown;
  }

  interface PdfParseMetadata {
    [key: string]: unknown;
  }

  const pdfParse: (dataBuffer: Buffer, options?: PdfParseOptions) => Promise<{
    numpages: number;
    numrender: number;
    info: PdfParseInfo;
    metadata: PdfParseMetadata | null;
    text: string;
    version: string;
  }>;
  export default pdfParse;
}
