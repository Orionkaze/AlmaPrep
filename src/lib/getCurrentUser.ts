import { cookies } from "next/headers"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { verifyJWT } from "@/lib/jwt"

/**
 * Resolve the current request's user, collapsing the demo-cookie → Supabase →
 * NextAuth ladder that is currently duplicated across ~8 call sites.
 *
 * NEW CODE ONLY for now — the existing call sites are intentionally left alone;
 * sweeping all of them is a separate, higher-risk change. This helper never
 * throws: on any failure it reports "no user" so callers can fail closed.
 *
 * Order note: demo → Supabase → NextAuth. Some legacy sites check NextAuth
 * first; this matches the majority (aiRouter, interview actions) and is the
 * deliberate standard going forward.
 */
export async function getCurrentUser(): Promise<{
  userId: string | null
  email: string | null
  isDemo: boolean
  username?: string
  avatarUrl?: string
}> {
  try {
    const cookieStore = await cookies()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const isMockMode = !supabaseUrl || 
      supabaseUrl.includes("mock-supabase-project-id") || 
      supabaseUrl.includes("evdfkeikrrsdthnekrrz")

    if (isMockMode) {
      const mockSessionCookie = cookieStore.get("mockmate-mock-session")?.value
      if (mockSessionCookie) {
        const secret = process.env.NEXTAUTH_SECRET || "3c8c7c90b6a2df33be1eb8b4c5384666f7f2d3a3c2a1e64d38c642b918fbd8f0"
        const payload = await verifyJWT(mockSessionCookie, secret)
        if (payload) {
          const demoUserCookie = cookieStore.get("mockmate-demo-user")?.value
          let username = payload.email?.split("@")[0] || "User"
          let avatarUrl = "user-tie"
          if (demoUserCookie) {
            try {
              const parsed = JSON.parse(demoUserCookie)
              username = parsed.username || username
              avatarUrl = parsed.avatar_url || avatarUrl
            } catch (e) {}
          }
          return {
            userId: payload.userId || "demo-user-id",
            email: payload.email,
            isDemo: true,
            username,
            avatarUrl
          }
        }
      }

      // Check for simple demo cookie fallback if no mock JWT
      const hasDemoCookie = cookieStore.has("mockmate-demo-session")
      if (hasDemoCookie) {
        const demoUserCookie = cookieStore.get("mockmate-demo-user")?.value
        let username = "User"
        let avatarUrl = "user-tie"
        let email = "guest@almaprep.com"
        if (demoUserCookie) {
          try {
            const parsed = JSON.parse(demoUserCookie)
            username = parsed.username || parsed.email?.split("@")[0] || username
            avatarUrl = parsed.avatar_url || avatarUrl
            email = parsed.email || email
          } catch (e) {}
        }
        return {
          userId: "demo-user-id",
          email,
          isDemo: true,
          username,
          avatarUrl
        }
      }
    }

    // Supabase auth (the primary session for standard users).
    try {
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        return {
          userId: user.id,
          email: user.email ?? null,
          isDemo: false,
          username: user.user_metadata?.username || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "User",
          avatarUrl: user.user_metadata?.avatar_url || "user-tie"
        }
      }
    } catch (err) {
      console.error("[getCurrentUser] Supabase auth lookup failed:", err)
    }

    // NextAuth fallback (Google users bridged into Supabase).
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string } | undefined)?.id ?? null
    if (userId) {
      return {
        userId,
        email: session?.user?.email ?? null,
        isDemo: false,
        username: session?.user?.name || session?.user?.email?.split("@")[0] || "User",
        avatarUrl: (session?.user as any)?.avatar_url || session?.user?.image || "user-tie"
      }
    }

    return { userId: null, email: null, isDemo: false }
  } catch (err) {
    console.error("[getCurrentUser] Unexpected failure:", err)
    return { userId: null, email: null, isDemo: false }
  }
}
