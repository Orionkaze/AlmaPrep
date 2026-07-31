"use server"

import pdfParse from "pdf-parse"
import mammoth from "mammoth"
import { getCurrentUser } from "@/lib/getCurrentUser"
import { isRateLimited } from "@/lib/rateLimit"

/** Resumes are text documents. 5 MB is generous for one and cheap to reject. */
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

export async function parseDocument(formData: FormData): Promise<{ success: boolean; text?: string; error?: string }> {
  try {
    // This is a server action, i.e. a public endpoint. Without these checks
    // anyone could stream arbitrary files into pdf-parse as fast as they liked.
    const { userId } = await getCurrentUser()
    if (!userId) {
      return { success: false, error: "Not authenticated" }
    }
    if (await isRateLimited(`parse-document:${userId}`)) {
      return { success: false, error: "Too many uploads. Please wait a minute and try again." }
    }

    const file = formData.get("file") as File | null
    if (!file) {
      return { success: false, error: "No file provided" }
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return {
        success: false,
        error: `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. Please upload a document under 5 MB.`,
      }
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

  } catch (error) {
    console.error("Error parsing document:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to parse document" }
  }
}
