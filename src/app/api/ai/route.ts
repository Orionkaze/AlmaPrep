import { NextRequest, NextResponse } from "next/server"
import { getUserTier } from "@/lib/entitlements"
import { checkInterviewAllowance } from "@/lib/quota"
import { executeAIRouting } from "@/lib/aiRouter"
import { isRateLimited } from "@/lib/rateLimit"

export async function POST(req: NextRequest) {
  try {
    // Tier is read from the database, never from the request body. It used to
    // arrive as `userTier` in the JSON payload, so any caller could send "pro"
    // and both skip the monthly quota and get the premium model.
    const { tier, userId, isDemo } = await getUserTier()

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { prompt, task } = await req.json()

    if (!prompt || !task) {
      return new NextResponse("Bad Request: Missing required parameters", { status: 400 })
    }

    if (await isRateLimited(`chat:${userId}`)) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429 }
      )
    }

    // Quota: only a *new* interview consumes an allowance. Everything else
    // (follow-up questions, feedback) belongs to an interview already counted.
    //
    // This routes through checkInterviewAllowance so there is one quota
    // implementation rather than two — this handler used to keep its own
    // hardcoded "3 per month" counter, writing to interview_usage with the anon
    // client, a path the tier-hardening migration has since closed off via RLS.
    // Enforcement requires PAYWALL_ENABLED=true; see config/plans.ts.
    if (!isDemo && task === "next_question" && isNewInterview(prompt)) {
      const allowance = await checkInterviewAllowance(userId, tier, Date.now(), true)
      if (!allowance.allowed) {
        return NextResponse.json(
          {
            error: `You've used all ${allowance.limit} free interviews this month. Upgrade to Pro for unlimited access.`,
          },
          { status: 429 }
        )
      }
    }

    const { text, source } = await executeAIRouting(prompt, task, tier, userId)

    return NextResponse.json({ result: text, source })
  } catch (error) {
    console.error("[api/ai] Error in API Route handler:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    )
  }
}

/** A "next_question" call with no history behind it starts a new interview. */
function isNewInterview(prompt: string): boolean {
  try {
    const parsed = JSON.parse(prompt)
    return (parsed.previousMessages || []).length === 0
  } catch {
    return false
  }
}
