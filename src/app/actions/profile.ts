"use server"

import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

export async function createUserProfile(
  username: string,
  avatarUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const cookieStore = await cookies()
    const hasDemoCookie = cookieStore.has("mockmate-demo-session")
    if (hasDemoCookie) {
      const demoUserCookie = cookieStore.get("mockmate-demo-user")?.value
      let email = "guest@almaprep.com"
      if (demoUserCookie) {
        try {
          email = JSON.parse(demoUserCookie).email || email
        } catch (e) {}
      }
      cookieStore.set("mockmate-demo-user", JSON.stringify({ email, username, avatar_url: avatarUrl }), { path: "/", maxAge: 604800 })
      return { success: true }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Not authenticated" }
    }

    const { error } = await supabase
      .from("users")
      .insert({
        id: user.id,
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
    const cookieStore = await cookies()
    const hasDemoCookie = cookieStore.has("mockmate-demo-session")
    if (hasDemoCookie) {
      const demoUserCookie = cookieStore.get("mockmate-demo-user")?.value
      let email = "guest@almaprep.com"
      if (demoUserCookie) {
        try {
          email = JSON.parse(demoUserCookie).email || email
        } catch (e) {}
      }
      cookieStore.set("mockmate-demo-user", JSON.stringify({ email, username, avatar_url: avatarUrl }), { path: "/", maxAge: 604800 })
      return { success: true }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Not authenticated" }
    }

    const { error } = await supabase
      .from("users")
      .update({
        username,
        avatar_url: avatarUrl,
      })
      .eq("id", user.id)

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


