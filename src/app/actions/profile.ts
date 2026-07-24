"use server"

import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { getCurrentUser } from "@/lib/getCurrentUser"

export async function createUserProfile(
  username: string,
  avatarUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser()
    if (user.isDemo) {
      const cookieStore = await cookies()
      const demoUserCookie = cookieStore.get("mockmate-demo-user")?.value
      let email = user.email || "guest@almaprep.com"
      cookieStore.set("mockmate-demo-user", JSON.stringify({ email, username, avatar_url: avatarUrl }), { path: "/", maxAge: 604800 })
      return { success: true }
    }

    if (!user.userId) {
      return { success: false, error: "Not authenticated" }
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from("users")
      .insert({
        id: user.userId,
        username,
        avatar_url: avatarUrl,
        subscription_tier: "free",
      })

    if (error) {
      console.error("Error creating user profile in Supabase:", error)
      return { success: false, error: error.message }
    }

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
      const demoUserCookie = cookieStore.get("mockmate-demo-user")?.value
      let email = user.email || "guest@almaprep.com"
      cookieStore.set("mockmate-demo-user", JSON.stringify({ email, username, avatar_url: avatarUrl }), { path: "/", maxAge: 604800 })
      return { success: true }
    }

    if (!user.userId) {
      return { success: false, error: "Not authenticated" }
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from("users")
      .update({
        username,
        avatar_url: avatarUrl,
      })
      .eq("id", user.userId)

    if (error) {
      console.error("Error updating user profile in Supabase:", error)
      return { success: false, error: error.message }
    }

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
      
      // 1. Delete interviews (which cascade deletes messages and feedback)
      const { error: interviewErr } = await supabase
        .from("interviews")
        .delete()
        .eq("user_id", userId)
      if (interviewErr) {
        console.error("clearAllUserData: failed to delete interviews", interviewErr)
      }

      // 2. Delete interview usage stats
      const { error: usageErr } = await supabase
        .from("interview_usage")
        .delete()
        .eq("user_id", userId)
      if (usageErr) {
        console.error("clearAllUserData: failed to delete usage", usageErr)
      }

      // 3. Delete user profile record
      const { error: profileErr } = await supabase
        .from("users")
        .delete()
        .eq("id", userId)
      if (profileErr) {
        console.error("clearAllUserData: failed to delete profile", profileErr)
      }

      // 4. Sign out from Supabase Auth
      await supabase.auth.signOut()
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



