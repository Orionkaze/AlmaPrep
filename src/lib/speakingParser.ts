/**
 * Pure JavaScript speaking analysis parser.
 * Extracts filler words, sentence complexity, hesitation patterns, and overused words from transcripts.
 */

const FILLER_WORDS = [
  "um",
  "uh",
  "like",
  "you know",
  "basically",
  "literally",
  "actually",
  "so",
  "right",
  "kind of",
  "sort of",
];

const HESITATION_PHRASES = [
  "i think",
  "i guess",
  "maybe",
  "not sure",
  "probably",
  "possibly",
  "kind of",
  "sort of",
];

// Standard English stop words + common programming domain terms (which should not be counted as overused)
const STOP_WORDS = new Set([
  // Articles & Prepositions
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "from", "up", "about", "into", "over", "after",
  // Pronouns
  "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them", "my", "your", "his", "their", "our", "its", "this", "that", "these", "those",
  // Verbs & Auxiliaries
  "is", "am", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "can", "will", "would", "should", "could", "get", "got", "go", "went", "say", "said", "use", "used", "make", "made",
  // Domain Terms (Programming context to avoid false overused flags)
  "function", "array", "return", "code", "class", "variable", "program", "method", "const", "let", "var", "import", "export", "object", "type", "string", "number", "boolean", "null", "undefined", "true", "false", "loop", "data", "database", "api", "project", "development", "developer", "application"
]);

export interface SpeakingMetrics {
  wordCount: number;
  fillerCount: number;
  fillerWords: Record<string, number>;
  avgWordsPerSentence: number;
  overusedWords: string[];
  hesitationPhrases: Record<string, number>;
}

export function parseSpeakingMetrics(text: string): SpeakingMetrics {
  const normalizedText = text.toLowerCase().trim();
  if (!normalizedText) {
    return {
      wordCount: 0,
      fillerCount: 0,
      fillerWords: {},
      avgWordsPerSentence: 0,
      overusedWords: [],
      hesitationPhrases: {},
    };
  }

  // 1. Word count & individual words cleaning
  // Replace punctuation with spaces for word counts
  const cleanWords = normalizedText
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const wordCount = cleanWords.length;

  // 2. Filler words analysis
  const fillerWords: Record<string, number> = {};
  let fillerCount = 0;

  FILLER_WORDS.forEach((filler) => {
    // For single word fillers vs multi-word fillers (e.g. "you know")
    const isMultiWord = filler.includes(" ");
    let count = 0;

    if (isMultiWord) {
      // Use regex to count multi-word phrases
      const regex = new RegExp(`\\b${filler}\\b`, "g");
      const matches = normalizedText.match(regex);
      count = matches ? matches.length : 0;
    } else {
      // Count single words
      count = cleanWords.filter((w) => w === filler).length;
    }

    if (count > 0) {
      fillerWords[filler] = count;
      fillerCount += count;
    }
  });

  // 3. Sentence complexity (words per sentence)
  const sentences = normalizedText.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  let avgWordsPerSentence = wordCount;
  if (sentences.length > 0) {
    const totalSentenceWords = sentences.reduce((sum, s) => {
      const words = s.split(/\s+/).filter(Boolean);
      return sum + words.length;
    }, 0);
    avgWordsPerSentence = Math.round(totalSentenceWords / sentences.length);
  }

  // 4. Vocabulary repetition (excluding stop words and domain words)
  const wordFreq: Record<string, number> = {};
  cleanWords.forEach((word) => {
    if (word.length > 2 && !STOP_WORDS.has(word) && !FILLER_WORDS.includes(word)) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  });

  const overusedWords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([word]) => word);

  // 5. Hesitation Phrases (e.g. "i think", "maybe")
  const hesitationPhrases: Record<string, number> = {};
  HESITATION_PHRASES.forEach((phrase) => {
    const regex = new RegExp(`\\b${phrase}\\b`, "g");
    const matches = normalizedText.match(regex);
    const count = matches ? matches.length : 0;
    if (count > 0) {
      // Capitalize for display readability (e.g. "I think", "Maybe")
      const displayPhrase = phrase
        .split(" ")
        .map((w) => (w === "i" ? "I" : w.charAt(0).toUpperCase() + w.slice(1)))
        .join(" ");
      hesitationPhrases[displayPhrase] = count;
    }
  });

  return {
    wordCount,
    fillerCount,
    fillerWords,
    avgWordsPerSentence,
    overusedWords,
    hesitationPhrases,
  };
}
