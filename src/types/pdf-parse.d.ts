declare module "pdf-parse" {
  const pdfParse: (
    dataBuffer: Buffer,
    options?: Record<string, unknown>
  ) => Promise<{
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: Record<string, unknown> | null;
    text: string;
    version: string;
  }>;
  export default pdfParse;
}
