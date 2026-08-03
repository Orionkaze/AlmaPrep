/**
 * Human labels for interview categories.
 *
 * This was copy-pasted byte-for-byte into the interview page and its feedback
 * child, and the built-in track list a third time into the route layout.
 */
const CATEGORY_LABELS: Record<string, string> = {
  hr: "HR Interview",
  technical: "Technical Interview",
  mixed: "Mixed Interview",
}

export function getCategoryLabel(category: string): string {
  if (CATEGORY_LABELS[category]) return CATEGORY_LABELS[category]
  return category
    .split("-")
    .map((word) => {
      if (word === "a" || word === "b") return `(${word.toUpperCase()})`
      if (word === "and") return "&"
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(" ")
}
