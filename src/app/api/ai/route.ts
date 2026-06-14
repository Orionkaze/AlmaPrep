import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { executeAIRouting } from "@/lib/aiRouter"
import { cookies } from "next/headers"

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const hasDemoCookie = cookieStore.has("mockmate-demo-session")

    let userId = null
    let userEmail = null

    if (hasDemoCookie) {
      userId = "demo-user-id"
      const demoUserCookie = cookieStore.get("mockmate-demo-user")?.value
      if (demoUserCookie) {
        try {
          const parsed = JSON.parse(demoUserCookie)
          userEmail = parsed.email || "luffy@goingmerry.org"
        } catch (e) {
          userEmail = "luffy@goingmerry.org"
        }
      } else {
        userEmail = "luffy@goingmerry.org"
      }
    } else {
      // 1. Authenticate the user
      // First, check NextAuth session
      const session = await getServerSession(authOptions)
      userId = (session?.user as any)?.id
      userEmail = session?.user?.email

      // Fallback: If no NextAuth session, check Supabase auth to support standard auth users
      if (!userId) {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          userId = user.id
          userEmail = user.email
        }
      }
    }

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // 2. Extract request body
    const { prompt, task, userTier } = await req.json()

    if (!prompt || !task || !userTier) {
      return new NextResponse("Bad Request: Missing required parameters", { status: 400 })
    }

    // 3. Implement Rate Limiting for Free Tier
    let count = 0
    let isNewInterview = false

    if (!hasDemoCookie) {
      const currentMonth = new Date().toISOString().substring(0, 7) // "YYYY-MM"
      const supabase = await createClient()
      const { data: usageRow } = await supabase
        .from("interview_usage")
        .select("count")
        .eq("user_id", userId)
        .eq("month", currentMonth)
        .maybeSingle()

      count = usageRow?.count || 0

      // Check if this request is initiating a new interview session
      if (task === "next_question") {
        try {
          const parsed = JSON.parse(prompt)
          const previousMessages = parsed.previousMessages || []
          if (previousMessages.length === 0) {
            isNewInterview = true
          }
        } catch (e) {
          // Fallback if prompt parsing fails
        }
      }

      if (userTier === "free") {
        // If they are starting a new interview and have already completed/started 3 this month, block them.
        if (isNewInterview && count >= 3) {
          return new NextResponse(
            JSON.stringify({ error: "You've used all 3 free interviews this month. Upgrade to Pro for unlimited access." }),
            { status: 429, headers: { "Content-Type": "application/json" } }
          )
        }

        // If starting a new interview session and under the limit, increment the count
        if (isNewInterview) {
          const { error: upsertError } = await supabase
            .from("interview_usage")
            .upsert({
              user_id: userId,
              month: currentMonth,
              count: count + 1,
            })

          if (upsertError) {
            console.error("[api/ai] Failed to increment interview usage count:", upsertError.message)
          }
        }
      }
    }

    // 4. Run multi-AI routing
    const result = await executeAIRouting(prompt, task, userTier, userId)

    return NextResponse.json({ result })
  } catch (error: any) {
    console.error("[api/ai] Error in API Route handler:", error)
    return new NextResponse(
      JSON.stringify({ error: error?.message || "Internal Server Error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
