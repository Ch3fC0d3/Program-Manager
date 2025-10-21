declare module 'pdf-parse' {
  import { Buffer } from 'buffer'

  interface PDFInfo {
    numpages: number
    numrender: number
    info: Record<string, any>
    metadata: Record<string, any> | null
    version: string
  }

  interface PDFParseResult {
    numpages: number
    numrender: number
    info: Record<string, any>
    metadata: Record<string, any> | null
    text: string
    version: string
  }

  type PDFParse = (data: Buffer | Uint8Array | ArrayBuffer | string, options?: Record<string, any>) => Promise<PDFParseResult>

  const pdfParse: PDFParse
  export default pdfParse
}
