"use server"

import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { getCurrentUser } from "@/lib/getCurrentUser"
import { createAdminClient } from "@/lib/supabase/admin"
import { friendlyProfileError, validateUsername } from "@/lib/profileValidation"

export async function checkUsernameAvailability(username: string): Promise<{ available: boolean; error?: string }> {
  try {
    const invalid = validateUsername(username)
    if (invalid) return { available: false, error: invalid }

    const user = await getCurrentUser()
    if (user.isDemo) {
      // In demo mode, check if the username is already taken in the mock user list
      const cookieStore = await cookies()
      const mockUserCookie = cookieStore.get("mockmate-demo-user")?.value
      if (mockUserCookie) {
        try {
          const parsed = JSON.parse(decodeURIComponent(mockUserCookie))
          if (parsed.username && parsed.username.toLowerCase() === username.trim().toLowerCase()) {
            return { available: true }
          }
        } catch {}
      }
      return { available: true }
    }

    if (!user.userId) {
      return { available: false, error: "Not authenticated" }
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("username", username.trim())
      .maybeSingle()

    if (error) {
      console.error("Error checking username availability:", error)
      return { available: false, error: "Database lookup failed" }
    }

    // If it is taken by the current user themselves, it is available to re-use
    if (data && data.id === user.userId) {
      return { available: true }
    }

    return { available: !data }
  } catch (e) {
    console.error("checkUsernameAvailability failed:", e)
    return { available: false, error: "An unexpected error occurred" }
  }
}

export async function createUserProfile(
  username: string,
  avatarUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser()
    if (user.isDemo) {
      const cookieStore = await cookies()
      const email = user.email || "guest@almaprep.com"
      cookieStore.set("mockmate-demo-user", JSON.stringify({ email, username, avatar_url: avatarUrl }), { path: "/", maxAge: 604800 })
      return { success: true }
    }

    if (!user.userId) {
      return { success: false, error: "Not authenticated" }
    }

    const invalid = validateUsername(username)
    if (invalid) return { success: false, error: invalid }

    const supabase = await createClient()

    // Upsert, not insert: onboarding can legitimately be reached twice (skip
    // then return, or a transient profile read that sent the user back here),
    // and a plain insert failed the second time with a duplicate-key error.
    // subscription_tier is deliberately omitted on conflict — it is set once at
    // creation and only the service role may change it thereafter.
    const { error } = await supabase
      .from("users")
      .upsert(
        {
          id: user.userId,
          username: username.trim(),
          avatar_url: avatarUrl,
        },
        { onConflict: "id" }
      )

    if (error) {
      console.error("Error creating user profile in Supabase:", error)
      return { success: false, error: friendlyProfileError(error) }
    }

    const { revalidatePath } = await import("next/cache")
    revalidatePath("/dashboard")
    revalidatePath("/onboarding")

    return { success: true }
  } catch (e) {
    console.error("createUserProfile failed:", e)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function updateUserProfile(
  username: string,
  avatarUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser()
    if (user.isDemo) {
      const cookieStore = await cookies()
      const email = user.email || "guest@almaprep.com"
      cookieStore.set("mockmate-demo-user", JSON.stringify({ email, username, avatar_url: avatarUrl }), { path: "/", maxAge: 604800 })
      return { success: true }
    }

    if (!user.userId) {
      return { success: false, error: "Not authenticated" }
    }

    const supabase = await createClient()

    const invalid = validateUsername(username)
    if (invalid) return { success: false, error: invalid }

    const { error } = await supabase
      .from("users")
      .update({
        username: username.trim(),
        avatar_url: avatarUrl,
      })
      .eq("id", user.userId)

     if (error) {
      console.error("Error updating user profile in Supabase:", error)
      return { success: false, error: friendlyProfileError(error) }
    }

    const { revalidatePath } = await import("next/cache")
    revalidatePath("/dashboard")
    revalidatePath("/dashboard/profile")

    return { success: true }
  } catch (e) {
    console.error("updateUserProfile failed:", e)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function clearAllUserData(): Promise<{ success: boolean; error?: string }> {
  try {
    const cookieStore = await cookies()
    
    // Clear demo/guest cookies
    cookieStore.delete("mockmate-demo-session")
    cookieStore.delete("mockmate-demo-user")
    cookieStore.delete("mockmate-demo-resume")

    // Clear Supabase database data if authenticated
    const user = await getCurrentUser()

    if (!user.isDemo && user.userId) {
      const supabase = await createClient()
      const userId = user.userId

      // Order matters: interview_reports references interview_sessions, and
      // both hang off auth.users (NOT public.users) with no ON DELETE CASCADE,
      // so deleting the profile row never touched them. Submitted code, agent
      // transcripts and hiring recommendations used to survive "delete my data"
      // entirely. Everything else cascades from public.users, but is listed
      // explicitly so this function stops depending on FK definitions it does
      // not own.
      const deletions: Array<[string, PromiseLike<{ error: { message: string } | null }>]> = [
        ["interview_reports", supabase.from("interview_reports").delete().eq("user_id", userId)],
        ["interview_sessions", supabase.from("interview_sessions").delete().eq("user_id", userId)],
        ["coding_solutions", supabase.from("coding_solutions").delete().eq("user_id", userId)],
        ["behavioral_analysis", supabase.from("behavioral_analysis").delete().eq("user_id", userId)],
        ["github_analysis", supabase.from("github_analysis").delete().eq("user_id", userId)],
        ["activity_log", supabase.from("activity_log").delete().eq("user_id", userId)],
        ["user_badges", supabase.from("user_badges").delete().eq("user_id", userId)],
        ["notifications", supabase.from("notifications").delete().eq("user_id", userId)],
        ["interviews", supabase.from("interviews").delete().eq("user_id", userId)],
        ["interview_usage", supabase.from("interview_usage").delete().eq("user_id", userId)],
        ["users", supabase.from("users").delete().eq("id", userId)],
      ]

      const failed: string[] = []
      for (const [table, query] of deletions) {
        const { error } = await query
        if (error) {
          console.error(`clearAllUserData: failed to delete ${table}`, error)
          failed.push(table)
        }
      }

      // Remove the auth account itself. Without the service-role key we can
      // only clear the data and sign out — say so rather than reporting a
      // deletion that did not happen.
      const admin = createAdminClient()
      if (admin) {
        const { error: authErr } = await admin.auth.admin.deleteUser(userId)
        if (authErr) {
          console.error("clearAllUserData: failed to delete auth user", authErr.message)
          failed.push("account")
        }
      } else {
        console.warn(
          "clearAllUserData: no service-role client — data cleared but the account still exists"
        )
        failed.push("account")
      }

      await supabase.auth.signOut()

      if (failed.length > 0) {
        return {
          success: false,
          error: `Your data was cleared, but these could not be removed: ${failed.join(", ")}. Please contact support.`,
        }
      }
    }

    return { success: true }
  } catch (e) {
    console.error("clearAllUserData failed:", e)
    return { success: false, error: "An unexpected error occurred" }
  }
}

export async function updateGithubAutosave(enabled: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser()
    if (user.isDemo) {
      return { success: true }
    }

    if (!user.userId) {
      return { success: false, error: "Not authenticated" }
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from("users")
      .update({
        github_autosave: enabled
      })
      .eq("id", user.userId)

    if (error) {
      console.error("Error updating github_autosave in Supabase:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (e) {
    console.error("updateGithubAutosave failed:", e)
    return { success: false, error: "An unexpected error occurred" }
  }
}



