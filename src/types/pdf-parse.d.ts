declare module "pdf-parse" {
  const pdfParse: (dataBuffer: Buffer, options?: any) => Promise<{
    numpages: number;
    numrender: number;
    info: any;
    metadata: any;
    text: string;
    version: string;
  }>;
  export default pdfParse;
}
