"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { signOut } from "next-auth/react"
import { User, ChevronDown, LogOut, CreditCard, UserRound } from "lucide-react"
import ModeToggle from "./ModeToggle"
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

  // Hide header on interview session pages (full-screen IDE workspace)
  if (pathname.startsWith("/interview/session/") || pathname.startsWith("/interview/report/")) {
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
                <TooltipTrigger asChild>
                  <div>
                    <ModeToggle />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-card text-card-foreground border border-border px-2 py-1 rounded text-xs z-50">
                  Toggle theme
                </TooltipContent>
              </Tooltip>
            </li>

            {/* Account dropdown */}
            <li className="nav-cta" style={{ position: "relative" }}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="gap-1.5 py-2 h-9 border border-border hover:border-emerald bg-card hover:bg-muted text-foreground cursor-pointer text-xs font-semibold rounded-lg"
                  >
                    <User size={16} strokeWidth={1.75} />
                    <span>Account</span>
                    <ChevronDown size={14} strokeWidth={2} className="text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-50 bg-card text-card-foreground border border-border rounded-lg shadow-md p-1 min-w-[180px]">
                  <DropdownMenuItem asChild>
                    <Link
                      href="/dashboard/profile"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-md hover:bg-muted outline-none cursor-pointer"
                    >
                      <UserRound size={16} strokeWidth={1.75} />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/pricing"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-md hover:bg-muted outline-none cursor-pointer"
                    >
                      <CreditCard size={16} strokeWidth={1.75} />
                      Pricing
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="h-px bg-border my-1" />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-md text-red-500 hover:bg-red-500/10 hover:text-red-600 outline-none cursor-pointer"
                  >
                    <LogOut size={16} strokeWidth={1.75} />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  )
}
