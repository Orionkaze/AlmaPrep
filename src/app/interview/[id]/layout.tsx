import { notFound } from "next/navigation"
import { getPrograms } from "@/lib/programs"

/** Tracks that aren't program shards but are valid interview categories. */
const BUILT_IN_TRACKS = new Set(["hr", "technical", "mixed"])

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Validate the `[id]` segment before any child renders.
 *
 * The interview page took whatever was in the URL as its category — so
 * /interview/anything ran a real interview against an empty question bank
 * (leaving the vetted fallback with nothing to offer if the LLMs failed) and
 * wrote that arbitrary string into interviews.category, where the dashboard
 * then displayed it.
 *
 * The segment serves two shapes: a category for the interview itself, and an
 * interview UUID for the /feedback child that the dashboard links to. Both are
 * accepted; nothing else is.
 */
export default async function InterviewCategoryLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const decoded = decodeURIComponent(id)

  const isKnownCategory =
    BUILT_IN_TRACKS.has(decoded) || getPrograms().some((p) => p.id === decoded)

  if (!isKnownCategory && !UUID_RE.test(decoded)) {
    notFound()
  }

  return <>{children}</>
}
