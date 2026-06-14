"use server"

import { getPrograms, ProgramInfo } from "@/lib/programs"

export async function getAllPrograms(): Promise<ProgramInfo[]> {
  try {
    return getPrograms()
  } catch (error) {
    console.error("Failed to fetch programs:", error)
    return []
  }
}
