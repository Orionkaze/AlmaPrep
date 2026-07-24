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

// Memory cache for programs list to avoid hitting filesystem repeatedly
let cachedPrograms: ProgramInfo[] | null = null

export function getPrograms(): ProgramInfo[] {
  if (cachedPrograms) return cachedPrograms

  try {
    const indexPath = path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "index.json")
    if (!fs.existsSync(indexPath)) {
      console.warn(`index.json not found at ${indexPath}`)
      return []
    }

    const indexContent = fs.readFileSync(indexPath, "utf-8")
    const indexData = JSON.parse(indexContent)
    const shards = indexData.shards || []
    const programs: ProgramInfo[] = []

    for (const shard of shards) {
      if (!shard.file) continue
      const filePath = path.join(/*turbopackIgnore: true*/ process.cwd(), shard.file)

      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, "utf-8")
        const questions: Question[] = JSON.parse(fileContent)
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
      } else {
        console.warn(`Shard file not found: ${filePath}`)
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
    const indexPath = path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "index.json")
    if (fs.existsSync(indexPath)) {
      const indexContent = fs.readFileSync(indexPath, "utf-8")
      const indexData = JSON.parse(indexContent)
      const shards = indexData.shards || []
      
      // Try to find matching shard
      const matchingShard = shards.find((shard: { file?: string }) => {
        if (!shard.file) return false
        const id = path.basename(shard.file, ".json")
        return id === programId
      })

      if (matchingShard) {
        const filePath = path.join(/*turbopackIgnore: true*/ process.cwd(), matchingShard.file)
        if (fs.existsSync(filePath)) {
          const fileContent = fs.readFileSync(filePath, "utf-8")
          return JSON.parse(fileContent) as Question[]
        }
      }
    }

    // Fallback if index lookup failed or not found
    let filePath = path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "programs", `${programId}.json`)
    if (!fs.existsSync(filePath)) {
      filePath = path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "universal", `${programId}.json`)
      if (!fs.existsSync(filePath)) {
        return []
      }
    }
    const fileContent = fs.readFileSync(filePath, "utf-8")
    return JSON.parse(fileContent) as Question[]
  } catch (error) {
    console.error(`Error reading questions for program ${programId}:`, error)
    return []
  }
}

export function getSampleQuestions(category: string): Question[] {
  try {
    const filePath = path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "sample.json")
    if (!fs.existsSync(filePath)) {
      return []
    }
    const fileContent = fs.readFileSync(filePath, "utf-8")
    const data = JSON.parse(fileContent)
    const questions = (data.questions || []) as Question[]
    
    if (category === "hr") {
      return questions.filter(q => q.program === null)
    } else if (category === "technical") {
      return questions.filter(q => q.program !== null)
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
    const indexPath = path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "index.json");
    if (fs.existsSync(indexPath)) {
      const indexContent = fs.readFileSync(indexPath, "utf-8");
      const indexData = JSON.parse(indexContent);
      const shards = indexData.shards || [];
      
      for (const shard of shards) {
        if (shard.file && shard.file.startsWith("data/universal/") && shard.file.endsWith(`${suffix}.json`)) {
          const filePath = path.join(/*turbopackIgnore: true*/ process.cwd(), shard.file);
          if (fs.existsSync(filePath)) {
            try {
              const fileContent = fs.readFileSync(filePath, "utf-8");
              const list = JSON.parse(fileContent) as Question[];
              universalQuestions.push(...list);
            } catch (err) {
              console.error(`Error reading universal shard ${shard.file}:`, err);
            }
          }
        }
      }
    }
  } catch (e) {
    console.error("Error reading index.json for combined questions:", e);
  }

  return [...programQuestions, ...universalQuestions];
}

