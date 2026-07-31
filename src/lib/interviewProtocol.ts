/**
 * Shared constants for the interviewer conversation. Deliberately free of
 * server-only imports so both the aiRouter prompt and the client page can use
 * it.
 */

/**
 * Sentinel the interviewer appends to its closing message.
 *
 * The client used to decide an interview was over by testing whether the
 * question contained "feedback" or "analyze" — which fires on "Tell me about a
 * time you received difficult feedback", a stock HR question, ending the
 * session mid-way and generating a report from a partial transcript. An
 * explicit marker cannot be triggered by the subject matter.
 */
export const INTERVIEW_END_MARKER = "<<INTERVIEW_COMPLETE>>"

/** True when the interviewer signalled that this was its closing message. */
export function isClosingMessage(text: string): boolean {
  return text.includes(INTERVIEW_END_MARKER)
}

/** The message as the candidate should see it, marker removed. */
export function stripEndMarker(text: string): string {
  return text.split(INTERVIEW_END_MARKER).join("").trim()
}

/**
 * True when a route segment is an interview id rather than a category.
 *
 * The feedback page decided this with `id.length >= 36` in four places, which
 * accepts any long string; the route layout used a proper pattern. One test.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isInterviewId(segment: string | null | undefined): boolean {
  return typeof segment === "string" && UUID_RE.test(segment)
}
