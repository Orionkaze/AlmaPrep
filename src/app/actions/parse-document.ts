"use server"

import pdfParse from "pdf-parse/lib/pdf-parse.js"
import mammoth from "mammoth"

export async function parseDocument(formData: FormData): Promise<{ success: boolean; text?: string; error?: string }> {
  try {
    const file = formData.get("file") as File | null
    if (!file) {
      return { success: false, error: "No file provided" }
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const filename = file.name.toLowerCase()
    
    let text = ""

    if (filename.endsWith(".pdf")) {
      const data = await pdfParse(buffer)
      text = data.text
    } else if (filename.endsWith(".docx")) {
      const data = await mammoth.extractRawText({ buffer })
      text = data.value
    } else if (filename.endsWith(".txt")) {
      text = buffer.toString("utf-8")
    } else {
      return { success: false, error: "Unsupported file format. Please upload .pdf, .docx, or .txt" }
    }

    if (!text.trim()) {
       return { success: false, error: "Could not extract text from the document" }
    }

    return { success: true, text: text.trim() }

  } catch (error: any) {
    console.error("Error parsing document:", error)
    return { success: false, error: error.message || "Failed to parse document" }
  }
}
