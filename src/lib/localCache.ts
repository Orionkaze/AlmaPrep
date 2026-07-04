import fs from "fs"
import path from "path"

const CACHE_DIR = path.join(process.cwd(), "data", "local_cache")

function getFilePath(type: string, id: string): string {
  return path.join(CACHE_DIR, type, `${id}.json`)
}

export function writeLocalCache(type: string, id: string, data: any): boolean {
  try {
    const dir = path.join(CACHE_DIR, type)
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

export function readLocalCache(type: string, id: string): any | null {
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
