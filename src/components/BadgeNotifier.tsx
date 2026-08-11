"use client"

import { useEffect } from "react"
import { toast } from "sonner"
import { getEarnedBadges, type EarnedBadge } from "@/app/actions/badges"
import { getStored, setStored } from "@/lib/localStore"
import BadgeIcon from "@/components/badges/BadgeIcon"
import { X } from "lucide-react"

const SEEN_KEY = "seen_badges"

function getRarityStyles(rarity: string) {
  switch (rarity) {
    case "legendary":
      return {
        fg: "#fbbf24", // gold
        bg: "rgba(245, 158, 11, 0.12)",
        border: "rgba(245, 158, 11, 0.4)",
        glow: "rgba(245, 158, 11, 0.25)",
      }
    case "rare":
      return {
        fg: "#c084fc", // purple
        bg: "rgba(139, 92, 246, 0.12)",
        border: "rgba(139, 92, 246, 0.35)",
        glow: "rgba(139, 92, 246, 0.2)",
      }
    default: // common
      return {
        fg: "#60a5fa", // blue
        bg: "rgba(59, 130, 246, 0.12)",
        border: "rgba(59, 130, 246, 0.35)",
        glow: "rgba(59, 130, 246, 0.15)",
      }
  }
}

function showBadgeToast(badge: EarnedBadge) {
  const styles = getRarityStyles(badge.rarity)
  const xp = badge.rarity === "legendary" ? 250 : badge.rarity === "rare" ? 100 : 50

  toast.custom(
    (t) => (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          padding: "16px 18px",
          borderRadius: 16,
          background: "#0e1715", // AlmaPrep dark theme card bg
          border: `1px solid ${styles.border}`,
          boxShadow: `0 10px 30px rgba(0, 0, 0, 0.4), 0 0 15px ${styles.glow}`,
          width: 350,
          maxWidth: "92vw",
          position: "relative",
          overflow: "hidden",
          color: "#f1f5f9",
          fontFamily: "var(--font-sans), sans-serif",
        }}
      >
        {/* Toast Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: styles.fg,
              letterSpacing: "0.05em",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            🏆 You earned a reward! 🎉
          </span>
          <button
            onClick={() => toast.dismiss(t)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#94a3b8",
              padding: 4,
              display: "flex",
              alignItems: "center",
              borderRadius: "50%",
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Badge Icon + Text Info */}
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <div style={{ flexShrink: 0 }}>
            <BadgeIcon slug={badge.slug} rarity={badge.rarity} earned={true} size={52} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#f8fafc", lineHeight: 1.2 }}>
              {badge.name}
            </div>
            <div
              style={{
                fontSize: 9,
                fontWeight: 800,
                color: styles.fg,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginTop: 2,
              }}
            >
              {badge.rarity}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#94a3b8",
                marginTop: 4,
                lineHeight: "1.35",
                wordBreak: "break-word",
              }}
            >
              {badge.description}
            </div>
          </div>
        </div>

        {/* Reward tags */}
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 10,
              fontWeight: 800,
              color: "#10b981",
              background: "rgba(16,185,129,0.12)",
              border: "1px solid rgba(16,185,129,0.20)",
              padding: "4px 10px",
              borderRadius: 999,
            }}
          >
            ★ +{xp} XP
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 10,
              fontWeight: 800,
              color: styles.fg,
              background: styles.bg,
              border: `1px solid ${styles.border}`,
              padding: "4px 10px",
              borderRadius: 999,
            }}
          >
            🛡 +1 Badge
          </span>
        </div>
      </div>
    ),
    { duration: 5000 }
  )
}

export default function BadgeNotifier() {
  useEffect(() => {
    let cancelled = false

    if (typeof window !== "undefined") {
      ;(window as unknown as Record<string, unknown>).triggerTestBadgeToast = (slug: string = "first-step") => {
        showBadgeToast({
          slug,
          name: slug === "first-step" ? "First Step" : "Profile Pro",
          icon: "Rocket",
          rarity: slug === "legendary" ? "legendary" : "common",
          description: "Complete your first mock interview",
        })
      }
    }

    ;(async () => {
      let earned: EarnedBadge[]
      try {
        earned = await getEarnedBadges()
      } catch {
        return
      }
      if (cancelled || earned.length === 0) return

      const seen = await getStored<string[]>(SEEN_KEY)
      const allSlugs = earned.map((b) => b.slug)
      const forceToast = typeof window !== "undefined" && window.location.search.includes("toastBadges")

      if (seen === null || forceToast) {
        // Toast owned badges for initial preview / test mode
        for (let i = 0; i < earned.length; i++) {
          if (cancelled) break
          showBadgeToast(earned[i])
          await new Promise<void>((r) => setTimeout(r, 5500))
        }
        await setStored(SEEN_KEY, allSlugs)
        return
      }

      const seenSet = new Set(Array.isArray(seen) ? seen : [])
      const fresh = earned.filter((b) => !seenSet.has(b.slug))
      if (fresh.length === 0) return

      // Process new badge toasts sequentially in a queue
      for (let i = 0; i < fresh.length; i++) {
        if (cancelled) break
        const badge = fresh[i]

        await new Promise<void>((resolve) => {
          if (cancelled) {
            resolve()
            return
          }
          showBadgeToast(badge)
          window.setTimeout(resolve, 5500)
        })
      }

      await setStored(SEEN_KEY, allSlugs)
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return null
}
