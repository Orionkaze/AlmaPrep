import fs from "fs"
import path from "path"

export interface Question {
  id: string
  category: string
  subtopic: string
  program: string
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

const categoryMapping: Record<string, string> = {
  "accounting-finance-a": "Business & Law",
  "anthropology-a": "Humanities & Social Sciences",
  "archaeology-a": "Humanities & Social Sciences",
  "architecture-a": "Humanities & Social Sciences",
  "audiology-a": "Health & Medicine",
  "biology-a": "Sciences & Tech",
  "biomedical-science-a": "Sciences & Tech",
  "business-management-a": "Business & Law",
  "chemistry-a": "Sciences & Tech",
  "classics-a": "Humanities & Social Sciences",
  "computer-science-a": "Sciences & Tech",
  "criminology-a": "Humanities & Social Sciences",
  "dental-hygiene-a": "Health & Medicine",
  "dentistry-a": "Health & Medicine",
  "dentistry-b": "Health & Medicine",
  "development-studies-a": "Humanities & Social Sciences",
  "economics-a": "Business & Law",
  "english-literature-a": "Humanities & Social Sciences",
  "geography-a": "Humanities & Social Sciences",
  "history-a": "Humanities & Social Sciences",
  "immunology-a": "Sciences & Tech",
  "law-a": "Business & Law",
  "linguistics-a": "Humanities & Social Sciences",
  "marketing-a": "Business & Law",
  "mathematics-a": "Sciences & Tech",
  "mechanical-engineering-a": "Sciences & Tech",
  "medicine-a": "Health & Medicine",
  "medicine-b": "Health & Medicine",
  "midwifery-a": "Health & Medicine",
  "nursing-a": "Health & Medicine",
  "nutrition-dietetics-a": "Health & Medicine",
  "occupational-therapy-a": "Health & Medicine",
  "optometry-a": "Health & Medicine",
  "paramedic-science-a": "Health & Medicine",
  "pharmacology-a": "Health & Medicine",
  "pharmacy-a": "Health & Medicine",
  "philosophy-a": "Humanities & Social Sciences",
  "physics-a": "Sciences & Tech",
  "physiotherapy-a": "Health & Medicine",
  "politics-international-relations-a": "Humanities & Social Sciences",
  "psychology-a": "Humanities & Social Sciences",
  "public-health-a": "Health & Medicine",
  "public-policy-a": "Humanities & Social Sciences",
  "radiography-a": "Health & Medicine",
  "sociology-a": "Humanities & Social Sciences",
  "speech-language-therapy-a": "Health & Medicine",
  "theology-religious-studies-a": "Humanities & Social Sciences",
  "veterinary-science-a": "Health & Medicine"
}

// Memory cache for programs list to avoid hitting filesystem repeatedly
let cachedPrograms: ProgramInfo[] | null = null

export function getPrograms(): ProgramInfo[] {
  if (cachedPrograms) return cachedPrograms

  try {
    const programsDir = path.join(process.cwd(), "programs")
    const universalDir = path.join(process.cwd(), "universal")
    const programs: ProgramInfo[] = []

    // Helper function to load JSON files from a directory
    const loadFromDir = (dirPath: string, isUniversal: boolean) => {
      if (!fs.existsSync(dirPath)) {
        console.warn(`Directory not found at ${dirPath}`)
        return
      }

      const files = fs.readdirSync(dirPath)
      for (const file of files) {
        if (file.endsWith(".json")) {
          const filePath = path.join(dirPath, file)
          const fileContent = fs.readFileSync(filePath, "utf-8")
          const questions: Question[] = JSON.parse(fileContent)
          
          const programId = file.replace(".json", "")
          
          // Find program display name: either from first question's program field or dynamic cleaning
          let programName = questions[0]?.program || ""
          if (!programName) {
            programName = programId
              .split("-")
              .map(word => {
                if (word === "a" || word === "b") return `(${word.toUpperCase()})`
                if (word === "and") return "&"
                return word.charAt(0).toUpperCase() + word.slice(1)
              })
              .join(" ")
          } else {
            // If we have a vs b files (like medicine-a, medicine-b or dentistry-a, dentistry-b), append it
            const parts = programId.split("-")
            const suffix = parts[parts.length - 1]
            if (suffix === "a" || suffix === "b") {
              programName = `${programName} (${suffix.toUpperCase()})`
            }
          }

          const category = isUniversal ? "Universal" : (categoryMapping[programId] || "Other")

          programs.push({
            id: programId,
            name: programName,
            category,
            questionCount: questions.length
          })
        }
      }
    }

    loadFromDir(programsDir, false)
    loadFromDir(universalDir, true)

    // Sort alphabetically by name
    programs.sort((a, b) => a.name.localeCompare(b.name))
    cachedPrograms = programs
    return programs
  } catch (error) {
    console.error("Error reading programs directories:", error)
    return []
  }
}

export function getProgramQuestions(programId: string): Question[] {
  try {
    let filePath = path.join(process.cwd(), "programs", `${programId}.json`)
    if (!fs.existsSync(filePath)) {
      filePath = path.join(process.cwd(), "universal", `${programId}.json`)
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
