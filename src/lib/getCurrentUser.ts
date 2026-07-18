import { cookies } from "next/headers"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

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
}> {
  try {
    const cookieStore = await cookies()
    if (cookieStore.has("mockmate-demo-session")) {
      let email = "guest@almaprep.com"
      const demoUserCookie = cookieStore.get("mockmate-demo-user")?.value
      if (demoUserCookie) {
        try {
          email = JSON.parse(demoUserCookie).email || email
        } catch {
          // keep default
        }
      }
      return { userId: "demo-user-id", email, isDemo: true }
    }

    // Supabase auth (the primary session for standard users).
    try {
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        return { userId: user.id, email: user.email ?? null, isDemo: false }
      }
    } catch (err) {
      console.error("[getCurrentUser] Supabase auth lookup failed:", err)
    }

    // NextAuth fallback (Google users bridged into Supabase).
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string } | undefined)?.id ?? null
    if (userId) {
      return { userId, email: session?.user?.email ?? null, isDemo: false }
    }

    return { userId: null, email: null, isDemo: false }
  } catch (err) {
    console.error("[getCurrentUser] Unexpected failure:", err)
    return { userId: null, email: null, isDemo: false }
  }
}
