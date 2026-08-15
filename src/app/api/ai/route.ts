import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/getCurrentUser"
import { executeAIRouting } from "@/lib/aiRouter"
import { getUserTier } from "@/lib/entitlements"
import { checkInterviewAllowance } from "@/lib/quota"
import { isRateLimited } from "@/lib/rateLimit"

/**
 * Generic LLM passthrough for the interview flow.
 *
 * Two things this route deliberately does NOT do any more:
 *
 * 1. Count its own quota. It used to SELECT interview_usage, compare, then
 *    UPSERT count + 1 — the exact read-then-write race that
 *    migrations/2026-07-30_atomic_interview_usage.sql exists to close, and a
 *    second copy of an accounting rule that already lives in lib/quota.ts. It
 *    now calls checkInterviewAllowance, which does the check and the increment
 *    in one statement behind a lock.
 *
 * 2. Trust the caller about whether an interview is starting. The old code
 *    decided that from `JSON.parse(prompt).previousMessages.length === 0`,
 *    which is client-supplied: a caller that always sent a non-empty array was
 *    never counted at all, and the free-tier cap simply did not apply to it.
 *    Quota is consumed where a session is really created —
 *    /api/interview/start and actions/interview.ts — and this route only
 *    *checks* the remaining allowance without consuming it.
 *
 * Every call is rate limited per user, the same as the other LLM-touching
 * paths, so a signed-in caller cannot sit in a loop spending model budget.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, isDemo } = await getCurrentUser()

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    if (await isRateLimited(`ai-route:${userId}`)) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment and try again." },
        { status: 429 }
      )
    }

    const { prompt, task } = await req.json()

    if (!prompt || !task) {
      return new NextResponse("Bad Request: Missing required parameters", { status: 400 })
    }

    if (!isDemo && userId !== "demo-user-id") {
      const { tier } = await getUserTier()
      // consume: false — see the note above. This is a read of the allowance,
      // not a claim on it.
      const allowance = await checkInterviewAllowance(userId, tier, Date.now(), false)
      if (!allowance.allowed) {
        return NextResponse.json(
          { error: "You've used all your free interviews this month. Upgrade to Pro for unlimited access." },
          { status: 429 }
        )
      }
    }

    const { text, source } = await executeAIRouting(prompt, task, userId)

    return NextResponse.json({ result: text, source })
  } catch (error) {
    console.error("[api/ai] Error in API Route handler:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    )
  }
}
