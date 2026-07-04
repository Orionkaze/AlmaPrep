"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { signOut } from "next-auth/react"
import { User, ChevronDown, LogOut, CreditCard, UserRound } from "lucide-react"

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
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLLIElement>(null)

  // Hide header on interview session pages (full-screen IDE workspace)
  if (pathname.startsWith("/interview/session/")) {
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

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

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

            {/* Account dropdown */}
            <li className="nav-cta" ref={dropdownRef} style={{ position: "relative" }}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="btn btn-ghost"
                style={{ gap: "6px", paddingTop: "8px", paddingBottom: "8px" }}
              >
                <User size={18} strokeWidth={1.75} />
                <span>Account</span>
                <ChevronDown
                  size={14}
                  strokeWidth={2}
                  style={{
                    transition: "transform 0.15s ease",
                    transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                />
              </button>

              {dropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 8px)",
                    minWidth: "180px",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    boxShadow: "var(--shadow)",
                    zIndex: 100,
                    padding: "6px 0",
                  }}
                >
                  <Link
                    href="/dashboard/profile"
                    onClick={() => { setDropdownOpen(false); setMobileOpen(false) }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px 16px",
                      fontSize: "0.92rem",
                      fontWeight: 500,
                      color: "var(--text)",
                      textDecoration: "none",
                      transition: "background 0.12s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-tint)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <UserRound size={16} strokeWidth={1.75} />
                    Profile
                  </Link>
                  <Link
                    href="/pricing"
                    onClick={() => { setDropdownOpen(false); setMobileOpen(false) }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px 16px",
                      fontSize: "0.92rem",
                      fontWeight: 500,
                      color: "var(--text)",
                      textDecoration: "none",
                      transition: "background 0.12s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-tint)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <CreditCard size={16} strokeWidth={1.75} />
                    Pricing
                  </Link>
                  <div style={{ height: "1px", background: "var(--border)", margin: "4px 0" }} />
                  <button
                    onClick={handleLogout}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px 16px",
                      fontSize: "0.92rem",
                      fontWeight: 500,
                      color: "#ef4444",
                      background: "transparent",
                      border: "none",
                      width: "100%",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "background 0.12s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.06)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <LogOut size={16} strokeWidth={1.75} />
                    Log out
                  </button>
                </div>
              )}
            </li>
          </ul>
        </nav>
      </div>
    </header>
  )
}
