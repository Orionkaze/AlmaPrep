import { describe, it, expect } from "vitest"
import { parseSpeakingMetrics } from "./speakingParser"

describe("parseSpeakingMetrics", () => {
  it("returns zeroed metrics for empty input", () => {
    const m = parseSpeakingMetrics("   ")
    expect(m.wordCount).toBe(0)
    expect(m.overusedWords).toEqual([])
  })

  // It used to return the top three words unconditionally, so a short answer
  // where nothing repeated still produced three "overused" words — and the
  // coaching feedback told the candidate to stop using them.
  it("reports no overused words when nothing repeats", () => {
    const m = parseSpeakingMetrics(
      "Yesterday I migrated our billing service onto a queue and measured throughput carefully."
    )
    expect(m.overusedWords).toEqual([])
  })

  it("reports a word only once it genuinely repeats", () => {
    const m = parseSpeakingMetrics(
      "The pipeline broke. The pipeline needed retries. The pipeline recovered after retries."
    )
    expect(m.overusedWords).toContain("pipeline")
  })

  // Browser speech recognition returns unpunctuated text, in which case the
  // whole answer looks like one enormous sentence and the "average" was just
  // the word count.
  it("does not invent a sentence length for unpunctuated speech", () => {
    const m = parseSpeakingMetrics("so i built a scheduler and then i tested it and it worked")
    expect(m.avgWordsPerSentence).toBe(0)
  })

  it("measures sentence length when punctuation is present", () => {
    const m = parseSpeakingMetrics("I built it. I tested it.")
    expect(m.avgWordsPerSentence).toBe(3)
  })

  it("counts filler words and hesitation phrases", () => {
    const m = parseSpeakingMetrics("Um, I think it was, you know, basically fine.")
    expect(m.fillerCount).toBeGreaterThan(0)
    expect(m.fillerWords).toHaveProperty("um")
    expect(Object.keys(m.hesitationPhrases)).toContain("I Think")
  })
})
