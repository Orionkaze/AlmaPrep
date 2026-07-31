import { notFound } from "next/navigation"
import { isKnownCategory } from "@/lib/programs"
import { isInterviewId } from "@/lib/interviewProtocol"

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
 * interview UUID for the /feedback child that the dashboard links to. The UUID
 * test comes first because it costs nothing — the category check has to consult
 * the question-bank index.
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

  if (!isInterviewId(decoded) && !isKnownCategory(decoded)) {
    notFound()
  }

  return <>{children}</>
}
