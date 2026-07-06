"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { signOut } from "next-auth/react"
import { User, ChevronDown, LogOut, CreditCard, UserRound } from "lucide-react"
import ModeToggle from "./ModeToggle"
import { NotificationBell } from "@/components/NotificationBell"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Practice", href: "/interview/setup" },
  { label: "Resume", href: "/dashboard/resume" },
  { label: "Progress", href: "/dashboard/profile" },
]

export default function AppHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  // Hide header on active interview session pages (full-screen IDE or live interview workspace)
  const isSetup = pathname === "/interview/setup"
  const isFeedback = pathname.endsWith("/feedback")
  const isReport = pathname.startsWith("/interview/report/")
  
  const isInterview = pathname.startsWith("/interview/") && !isSetup && !isFeedback && !isReport
  const isCodingSession = pathname.startsWith("/interview/session/")

  useEffect(() => {
    const checkAuth = async () => {
      // 1. Check for demo session cookie
      const isDemo = typeof document !== "undefined" && document.cookie.includes("mockmate-demo-session")
      if (isDemo) {
        setIsAuthenticated(true)
        setUserEmail("demo@mockmate.com")
        return
      }

      // 2. Check for Supabase session
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setIsAuthenticated(true)
        setUserEmail(session.user.email || null)
      } else {
        setIsAuthenticated(false)
        setUserEmail(null)
      }
    }

    checkAuth()

    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (session?.user) {
        setIsAuthenticated(true)
        setUserEmail(session.user.email || null)
      } else {
        const isDemo = typeof document !== "undefined" && document.cookie.includes("mockmate-demo-session")
        if (!isDemo) {
          setIsAuthenticated(false)
          setUserEmail(null)
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  if (isInterview || isCodingSession) {
    return null
  }

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard"
    return pathname.startsWith(href)
  }

  const handleLogout = async () => {
    const supabase = createClient()
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error("Supabase signOut error:", err)
    }
    document.cookie = "mockmate-demo-session=; path=/; max-age=0"
    await signOut({ redirect: false })
    window.location.href = "/login"
  }

  return (
    <header className="site-header">
      <div className="wrap">
        <nav className="nav" aria-label="App navigation">
          <Link href="/dashboard" className="brand">
            <svg className="mark" viewBox="0 0 80 80" aria-hidden="true">
              <rect width="80" height="80" rx="18" fill="#059669" />
              <path d="M40 12 L16 67 L29 67 L36 50 L44 50 L51 67 L64 67 Z" fill="white" />
              <rect x="30" y="40" width="20" height="8" fill="#059669" />
            </svg>
            Almaprep
          </Link>

          <button
            className="nav-toggle"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <span></span>
          </button>

          <ul className={`nav-links${mobileOpen ? " open" : ""}`}>
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  style={isActive(item.href) ? {
                    color: "var(--emerald-600)",
                    borderBottom: "2px solid var(--emerald)",
                    paddingBottom: "2px",
                  } : undefined}
                >
                  {item.label}
                </Link>
              </li>
            ))}

            {/* Theme Toggle */}
            <li className="flex items-center">
              <Tooltip>
                <TooltipTrigger render={
                  <div>
                    <ModeToggle />
                  </div>
                } />
                <TooltipContent className="bg-card text-card-foreground border border-border px-2 py-1 rounded text-xs z-50">
                  Toggle theme
                </TooltipContent>
              </Tooltip>
            </li>

            {/* Notification Bell */}
            {isAuthenticated && (
              <li className="flex items-center">
                <NotificationBell />
              </li>
            )}

            {/* Account dropdown */}
            {isAuthenticated && (
              <li className="nav-cta" style={{ position: "relative" }}>
                <DropdownMenu>
                  <DropdownMenuTrigger render={
                    <Button
                      variant="outline"
                      className="gap-1.5 py-2 h-9 border border-border hover:border-emerald bg-card hover:bg-muted text-foreground cursor-pointer text-xs font-semibold rounded-lg"
                    >
                      <User size={16} strokeWidth={1.75} />
                      <span>Account</span>
                      <ChevronDown size={14} strokeWidth={2} className="text-muted-foreground" />
                    </Button>
                  } />
                  <DropdownMenuContent align="end" className="z-50 bg-card text-card-foreground border border-border rounded-lg shadow-md p-3 min-w-[200px] flex flex-col text-left gap-1">
                    <div className="px-2.5 pb-2.5 border-b border-border flex flex-col gap-0.5 select-none">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Logged In</span>
                      <span className="text-xs font-semibold text-foreground truncate max-w-[160px]">{userEmail || "user@mockmate.com"}</span>
                    </div>
                    <div className="pt-1.5 space-y-0.5">
                      <DropdownMenuItem render={
                        <Link
                          href="/dashboard/profile"
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-md hover:bg-muted outline-none cursor-pointer text-foreground"
                        >
                          <UserRound size={16} strokeWidth={1.75} />
                          Profile
                        </Link>
                      } />
                      <DropdownMenuItem render={
                        <Link
                          href="/pricing"
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-md hover:bg-muted outline-none cursor-pointer text-foreground"
                        >
                          <CreditCard size={16} strokeWidth={1.75} />
                          Pricing
                        </Link>
                      } />
                      <DropdownMenuSeparator className="h-px bg-border my-1" />
                      <DropdownMenuItem
                        onClick={handleLogout}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-md text-red-500 hover:bg-red-500/10 hover:text-red-600 outline-none cursor-pointer"
                      >
                        <LogOut size={16} strokeWidth={1.75} />
                        Log out
                      </DropdownMenuItem>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </header>
  )
}
