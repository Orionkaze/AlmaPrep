"use client"

import { useEffect } from "react"
import { toast } from "sonner"
import { getEarnedBadges, type EarnedBadge } from "@/app/actions/badges"

const SEEN_KEY = "almaprep_seen_badges"

// Colors mirror the badges gallery so a toast reads as the same badge.
function rarityRing(rarity: string): { bg: string; fg: string } {
  switch (rarity) {
    case "legendary":
      return { bg: "rgba(251,191,36,0.15)", fg: "#f59e0b" }
    case "rare":
      return { bg: "rgba(59,130,246,0.15)", fg: "#3b82f6" }
    default:
      return { bg: "rgba(16,185,129,0.15)", fg: "#10b981" }
  }
}

function showBadgeToast(badge: EarnedBadge) {
  const { bg, fg } = rarityRing(badge.rarity)
  toast.custom(
    () => (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "14px 16px",
          borderRadius: 14,
          background: "var(--card, #0b0f0e)",
          border: "1px solid var(--border, rgba(255,255,255,0.1))",
          boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
          width: 340,
          maxWidth: "88vw",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: bg,
            flexShrink: 0,
          }}
        >
          <i className={badge.icon} style={{ color: fg, fontSize: 20 }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: fg }}>
            Badge unlocked
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground, #fff)" }}>{badge.name}</div>
        </div>
      </div>
    ),
    { duration: 5000 }
  )
}

// Shows a toast when the user earns a badge. Badges are awarded server-side after
// interviews/coding challenges; this diffs the current earned set against what
// this browser has already acknowledged (localStorage) and toasts the difference.
// First run seeds the baseline silently so a returning user isn't blasted with
// toasts for badges they earned long ago.
export default function BadgeNotifier() {
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      let earned: EarnedBadge[]
      try {
        earned = await getEarnedBadges()
      } catch {
        return
      }
      if (cancelled || earned.length === 0) return

      const raw = localStorage.getItem(SEEN_KEY)
      const allSlugs = earned.map((b) => b.slug)

      if (raw === null) {
        // baseline this browser silently
        localStorage.setItem(SEEN_KEY, JSON.stringify(allSlugs))
        return
      }

      let seen: string[] = []
      try {
        seen = JSON.parse(raw)
      } catch {
        seen = []
      }
      const seenSet = new Set(seen)
      const fresh = earned.filter((b) => !seenSet.has(b.slug))
      if (fresh.length === 0) return

      // Small base delay so the toasts fire after the page has settled and the
      // Toaster is mounted — toasts dispatched during the initial mount burst on
      // heavier pages (e.g. the dashboard) can otherwise be dropped.
      fresh.forEach((b, idx) => {
        window.setTimeout(() => {
          if (!cancelled) showBadgeToast(b)
        }, 900 + idx * 800)
      })
      localStorage.setItem(SEEN_KEY, JSON.stringify(allSlugs))
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return null
}
