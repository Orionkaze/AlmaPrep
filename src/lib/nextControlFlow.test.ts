import { describe, it, expect } from "vitest"
import { isNextControlFlowError, rethrowIfNextControlFlow } from "./nextControlFlow"

describe("isNextControlFlowError", () => {
  // Swallowing this one made getCurrentUser report "no user" during static
  // rendering, and buried real errors under "[getCurrentUser] Unexpected
  // failure" on every build.
  it("recognises the dynamic-rendering signal", () => {
    expect(isNextControlFlowError({ digest: "DYNAMIC_SERVER_USAGE" })).toBe(true)
  })

  it("recognises redirect and notFound", () => {
    expect(isNextControlFlowError({ digest: "NEXT_REDIRECT;replace;/login;307;" })).toBe(true)
    expect(isNextControlFlowError({ digest: "NEXT_NOT_FOUND" })).toBe(true)
  })

  it("leaves ordinary errors alone", () => {
    expect(isNextControlFlowError(new Error("connection refused"))).toBe(false)
    expect(isNextControlFlowError({ digest: 12345 })).toBe(false)
    expect(isNextControlFlowError(null)).toBe(false)
    expect(isNextControlFlowError(undefined)).toBe(false)
    expect(isNextControlFlowError("NEXT_REDIRECT")).toBe(false)
  })
})

describe("rethrowIfNextControlFlow", () => {
  it("re-throws a control-flow signal untouched", () => {
    const signal = Object.assign(new Error("redirect"), { digest: "NEXT_REDIRECT;push;/x;307;" })
    expect(() => rethrowIfNextControlFlow(signal)).toThrow(signal)
  })

  it("returns quietly for anything else, so the caller can handle it", () => {
    expect(() => rethrowIfNextControlFlow(new Error("db down"))).not.toThrow()
  })
})
