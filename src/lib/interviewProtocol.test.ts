import { describe, it, expect } from "vitest"
import { isClosingMessage, stripEndMarker, INTERVIEW_END_MARKER } from "./interviewProtocol"

describe("isClosingMessage", () => {
  it("detects the marker", () => {
    expect(isClosingMessage(`Great talking to you. ${INTERVIEW_END_MARKER}`)).toBe(true)
  })

  // These are the questions that used to end an interview halfway through,
  // because the old check matched the words "feedback" and "analyze".
  it("does not fire on ordinary interview questions", () => {
    const stockQuestions = [
      "Tell me about a time you received difficult feedback.",
      "How do you give feedback to a teammate?",
      "Analyze this situation for me: your project is late.",
      "Walk me through how you would analyze a dataset.",
      "What feedback have your teachers given you?",
    ]
    for (const q of stockQuestions) {
      expect(isClosingMessage(q)).toBe(false)
    }
  })
})

describe("stripEndMarker", () => {
  it("removes the marker and surrounding whitespace", () => {
    expect(stripEndMarker(`Thanks for your time. ${INTERVIEW_END_MARKER}`)).toBe(
      "Thanks for your time."
    )
  })

  it("leaves an ordinary message untouched", () => {
    expect(stripEndMarker("What is your greatest strength?")).toBe(
      "What is your greatest strength?"
    )
  })

  it("removes the marker even if the model repeats it", () => {
    const text = `${INTERVIEW_END_MARKER} Bye. ${INTERVIEW_END_MARKER}`
    expect(stripEndMarker(text)).toBe("Bye.")
    expect(stripEndMarker(text)).not.toContain(INTERVIEW_END_MARKER)
  })
})
