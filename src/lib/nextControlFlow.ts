/**
 * Next.js signals several control-flow decisions by throwing.
 *
 *  - `redirect()`  → digest "NEXT_REDIRECT;..."
 *  - `notFound()`  → digest "NEXT_NOT_FOUND"
 *  - reading cookies/headers while a route is being statically rendered →
 *    a DynamicServerError with digest "DYNAMIC_SERVER_USAGE", which is how
 *    Next decides to render that route dynamically instead.
 *
 * A broad `catch` around any of those swallows the signal. In our case
 * getCurrentUser() caught the dynamic-usage error and reported "no user",
 * which both filled the build log with "[getCurrentUser] Unexpected failure"
 * — hiding genuine errors — and risked a route being cached with
 * signed-out content. Anything matching this must be re-thrown.
 */
export function isNextControlFlowError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false

  const { digest, name, message } = err as {
    digest?: unknown
    name?: unknown
    message?: unknown
  }

  if (typeof digest === "string") {
    if (
      digest === "DYNAMIC_SERVER_USAGE" ||
      digest === "NEXT_NOT_FOUND" ||
      digest.startsWith("NEXT_REDIRECT")
    ) {
      return true
    }
  }

  // Belt and braces on the dynamic-rendering signal: Next has tagged it by
  // name and by message in different versions, and misclassifying it is what
  // makes a route silently render as signed-out.
  return (
    name === "DynamicServerError" ||
    (typeof message === "string" && message.includes("Dynamic server usage"))
  )
}

/** Re-throw Next's own signals; return everything else to be handled. */
export function rethrowIfNextControlFlow(err: unknown): void {
  if (isNextControlFlowError(err)) throw err
}
