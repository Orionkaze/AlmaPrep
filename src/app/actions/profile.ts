"use server"

import { createClient } from "@/lib/supabase/server"

export async function createUserProfile(
  username: string,
  avatarUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
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
