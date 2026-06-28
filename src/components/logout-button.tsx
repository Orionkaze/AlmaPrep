"use client"

import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faRightFromBracket } from "@fortawesome/free-solid-svg-icons"
import { signOut } from "next-auth/react"

export function LogoutButton() {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    // 1. Sign out of Supabase auth
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error("Supabase signOut error:", err)
    }

    // 2. Clear guest/demo cookie
    document.cookie = "mockmate-demo-session=; path=/; max-age=0"

    // 3. Sign out of NextAuth
    await signOut({ redirect: false })
    window.location.href = "/login"
  }

  return (
    <button
      onClick={handleLogout}
      className="inline-flex items-center gap-2 px-4 h-10 rounded-lg text-sm font-semibold border border-white/10 bg-white/5 hover:bg-white/10 hover:text-red-400 hover:border-red-500/20 transition-all cursor-pointer"
    >
      <FontAwesomeIcon icon={faRightFromBracket} />
      <span>Log Out</span>
    </button>
  )
}
