import fs from "fs"
import path from "path"

export interface Question {
  id: string
  category: string
  subtopic: string
  program: string | null
  difficulty: string
  tags: string[]
  question: string
  lookingFor: string
  idealAnswer: {
    bullets: string[]
    modelAnswer: string
  }
  commonMistakes: string[]
  followUps: string[]
}

export interface ProgramInfo {
  id: string // e.g. "computer-science-a"
  name: string // e.g. "Computer Science"
  category: string // e.g. "Sciences & Tech"
  questionCount: number
}

/**
 * The question bank is ~3.8 MB across 76 JSON shards, shipped with the build
 * and never written at runtime — but it was read straight from disk on every
 * call. aiRouter asks for three shards per generated question, and each ask
 * re-read AND re-parsed index.json as well, so a single interview question cost
 * several synchronous readFileSync + JSON.parse round trips on the request
 * path, blocking the event loop each time.
 *
 * Everything below is memoised for the life of the process. Because the data is
 * immutable, there is nothing to invalidate.
 */
let cachedPrograms: ProgramInfo[] | null = null

type ShardEntry = { file?: string }

let cachedIndexShards: ShardEntry[] | null = null
const cachedShardQuestions = new Map<string, Question[]>()

function readIndexShards(): ShardEntry[] {
  if (cachedIndexShards) return cachedIndexShards
  try {
    const indexPath = path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "index.json")
    if (!fs.existsSync(indexPath)) {
      cachedIndexShards = []
      return cachedIndexShards
    }
    const indexData = JSON.parse(fs.readFileSync(indexPath, "utf-8"))
    cachedIndexShards = (indexData.shards || []) as ShardEntry[]
  } catch (error) {
    console.error("Error reading programs index:", error)
    cachedIndexShards = []
  }
  return cachedIndexShards
}

let cachedSampleQuestions: Question[] | null = null

/** data/sample.json, parsed once. */
function readSampleQuestions(): Question[] {
  if (cachedSampleQuestions) return cachedSampleQuestions
  try {
    const filePath = path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "sample.json")
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"))
      cachedSampleQuestions = (data.questions || []) as Question[]
    } else {
      cachedSampleQuestions = []
    }
  } catch (error) {
    console.error("Error reading sample questions:", error)
    cachedSampleQuestions = []
  }
  return cachedSampleQuestions
}

/** Parse one shard file at most once. Missing/broken files memoise as empty. */
function readShardQuestions(relativePath: string): Question[] {
  const hit = cachedShardQuestions.get(relativePath)
  if (hit) return hit

  let questions: Question[] = []
  try {
    const filePath = path.join(/*turbopackIgnore: true*/ process.cwd(), relativePath)
    if (fs.existsSync(filePath)) {
      questions = JSON.parse(fs.readFileSync(filePath, "utf-8")) as Question[]
    }
  } catch (error) {
    console.error(`Error reading question shard ${relativePath}:`, error)
  }
  cachedShardQuestions.set(relativePath, questions)
  return questions
}

export function getPrograms(): ProgramInfo[] {
  if (cachedPrograms) return cachedPrograms

  try {
    const shards = readIndexShards()
    const programs: ProgramInfo[] = []

    for (const shard of shards) {
      if (!shard.file) continue
      {
        const questions: Question[] = readShardQuestions(shard.file)
        const programId = path.basename(shard.file, ".json")
        const isUniversal = shard.file.startsWith("data/universal/")

        let baseName = questions[0]?.program || "";
        if (!baseName && questions[0]?.category && isUniversal) {
          baseName = questions[0].category;
        }
        
        let programName = baseName;
        if (!programName) {
          programName = programId
            .split("-")
            .map(word => {
              if (word === "a" || word === "b") return "";
              if (word === "and") return "&";
              return word.charAt(0).toUpperCase() + word.slice(1);
            })
            .filter(Boolean)
            .join(" ");
            
          baseName = programName;
        }

        // Add suffix for a/b variants
        const parts = programId.split("-");
        const suffix = parts[parts.length - 1];
        if (suffix === "a" || suffix === "b") {
          programName = `${programName} (${suffix.toUpperCase()})`;
        }

        const category = baseName || "Other";

        programs.push({
          id: programId,
          name: programName,
          category,
          questionCount: questions.length
        })
      }
    }

    // Sort alphabetically by name
    programs.sort((a, b) => a.name.localeCompare(b.name))
    cachedPrograms = programs
    return programs
  } catch (error) {
    console.error("Error reading programs index:", error)
    return []
  }
}

export function getProgramQuestions(programId: string): Question[] {
  try {
    const matchingShard = readIndexShards().find(
      (shard) => shard.file && path.basename(shard.file, ".json") === programId
    )
    if (matchingShard?.file) {
      const questions = readShardQuestions(matchingShard.file)
      if (questions.length > 0) return questions
    }

    // Fallback if index lookup failed or not found
    for (const dir of ["programs", "universal"]) {
      const relative = `data/${dir}/${programId}.json`
      const questions = readShardQuestions(relative)
      if (questions.length > 0) return questions
    }
    return []
  } catch (error) {
    console.error(`Error reading questions for program ${programId}:`, error)
    return []
  }
}

export function getSampleQuestions(category: string): Question[] {
  try {
    const questions = readSampleQuestions()
    
    if (category === "hr") {
      return questions.filter((q) => q.program === null)
    } else if (category === "technical") {
      return questions.filter((q) => q.program !== null)
    } else if (category === "mixed") {
      return questions
    }
    return []
  } catch (error) {
    console.error("Error reading sample questions:", error)
    return []
  }
}

/**
 * Combines program-specific questions and all matching universal questions
 * (matching the '-a' or '-b' suffix) to build a full question bank pool.
 */
export function getCombinedDomainQuestions(domainId: string): Question[] {
  const suffix = domainId.endsWith("-b") ? "-b" : "-a";
  const programQuestions = getProgramQuestions(domainId);
  
  const universalQuestions: Question[] = [];
  try {
    for (const shard of readIndexShards()) {
      if (shard.file && shard.file.startsWith("data/universal/") && shard.file.endsWith(`${suffix}.json`)) {
        universalQuestions.push(...readShardQuestions(shard.file));
      }
    }
  } catch (e) {
    console.error("Error assembling combined questions:", e);
  }

  return [...programQuestions, ...universalQuestions];
}

