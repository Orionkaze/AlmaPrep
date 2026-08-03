import fs from "fs"
import os from "os"
import path from "path"

/**
 * Best-effort disk cache, used as a fallback when a Supabase read/write fails.
 *
 * On a serverless host the bundle directory is read-only, so writes under
 * process.cwd() always threw and this "local fallback" never actually existed
 * in production — it only logged. Everything therefore goes to the OS temp
 * directory when running on Vercel, which is writable (and per-instance and
 * ephemeral, which is what a cache wants anyway).
 */
const CACHE_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), "almaprep_cache")
  : path.join(process.cwd(), "data", "local_cache")

/** Ids are user ids today, but never let one escape the cache directory. */
function safeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_")
}

function getFilePath(type: string, id: string): string {
  return path.join(CACHE_DIR, safeSegment(type), `${safeSegment(id)}.json`)
}

export function writeLocalCache(type: string, id: string, data: Record<string, unknown>): boolean {
  try {
    const dir = path.join(CACHE_DIR, safeSegment(type))
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(getFilePath(type, id), JSON.stringify(data, null, 2), "utf8")
    return true
  } catch (err) {
    console.error(`Failed to write local cache for ${type}/${id}:`, err)
    return false
  }
}

export function readLocalCache(type: string, id: string): Record<string, unknown> | null {
  try {
    const filePath = getFilePath(type, id)
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf8")
      return JSON.parse(content)
    }
  } catch (err) {
    console.error(`Failed to read local cache for ${type}/${id}:`, err)
  }
  return null
}
