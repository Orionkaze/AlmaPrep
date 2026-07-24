import Link from "next/link"
import { ArrowLeft, Lock, Sparkles } from "lucide-react"
import { cookies } from "next/headers"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { DEFAULT_BADGES } from "@/lib/badgesData"

const headingStyle: React.CSSProperties = {
  fontFamily: "var(--font-head), serif",
  letterSpacing: "-0.015em",
  fontWeight: 600,
}

const CATEGORY_META: Record<string, { label: string; blurb: string }> = {
  getting_started: { label: "Getting Started", blurb: "Your first steps on Almaprep" },
  streak: { label: "Streaks", blurb: "Show up, day after day" },
  interview: { label: "Interviews", blurb: "Reps in the room" },
  coding: { label: "Coding", blurb: "Technical challenge mastery" },
  skill: { label: "Skills", blurb: "Delivery, presence and polish" },
  progress: { label: "Progress", blurb: "Getting measurably better" },
  special: { label: "Special & Rare", blurb: "The hard-to-earn ones" },
}
const CATEGORY_ORDER = ["getting_started", "streak", "interview", "coding", "skill", "progress", "special"]

// Believable earned set for demo mode (no DB).
const DEMO_EARNED = new Set([
  "first-step", "profile-pro", "resume-ready", "github-connected",
  "on-a-roll", "week-warrior", "nervous-no-more", "perfect-score",
  "bug-slayer", "problem-solver", "silver-tongue", "steady-climber",
  "lunch-break-hustler", "early-riser",
])

const RARITY_RANK: Record<string, number> = { common: 0, rare: 1, legendary: 2 }

function rarityClasses(rarity: string, earned: boolean) {
  if (!earned) return "border-border bg-muted/30"
  switch (rarity) {
    case "legendary":
      return "border-amber-300 bg-amber-50 shadow-[0_0_20px_rgba(251,191,36,0.25)] dark:bg-amber-500/10 dark:border-amber-500/40"
    case "rare":
      return "border-blue-300 bg-blue-50 dark:bg-blue-500/10 dark:border-blue-500/40"
    default:
      return "border-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 dark:border-emerald-500/40"
  }
}
function iconTone(rarity: string, earned: boolean) {
  if (!earned) return "text-muted-foreground/50"
  if (rarity === "legendary") return "text-amber-600 dark:text-amber-400"
  if (rarity === "rare") return "text-blue-600 dark:text-blue-400"
  return "text-emerald-600 dark:text-emerald-400"
}

export default async function BadgesPage() {
  const session = await getServerSession(authOptions)
  const cookieStore = await cookies()
  const isDemoMode = cookieStore.has("mockmate-demo-session")

  let earned = new Set<string>()

  if (isDemoMode) {
    earned = DEMO_EARNED
  } else {
    const supabase = await createClient()
    let userId = session?.user?.id
    try {
      const { data } = await supabase.auth.getUser()
      if (data?.user) userId = data.user.id
    } catch {}
    if (userId) {
      const { data: rows } = await supabase
        .from("user_badges")
        .select("badge_slug")
        .eq("user_id", userId) as unknown as { data: { badge_slug: string }[] | null }
      if (rows) earned = new Set(rows.map((r) => r.badge_slug))
    }
  }

  const total = DEFAULT_BADGES.length
  const earnedCount = DEFAULT_BADGES.filter((b) => earned.has(b.slug)).length
  const pct = Math.round((earnedCount / total) * 100)
  const byRarity = (r: string) => DEFAULT_BADGES.filter((b) => b.rarity === r && earned.has(b.slug)).length

  const grouped = CATEGORY_ORDER.map((cat) => ({
    cat,
    meta: CATEGORY_META[cat],
    badges: DEFAULT_BADGES
      .filter((b) => b.category === cat)
      .sort((a, b) => Number(earned.has(b.slug)) - Number(earned.has(a.slug)) || RARITY_RANK[a.rarity] - RARITY_RANK[b.rarity]),
  })).filter((g) => g.badges.length > 0)

  return (
    <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Back + heading */}
      <div>
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors mb-4">
          <ArrowLeft size={16} /> Back to dashboard
        </Link>
        <h1 className="text-3xl sm:text-4xl text-foreground" style={headingStyle}>Achievements</h1>
        <p className="text-muted-foreground mt-1">Earn badges as you practice. Here&apos;s your full collection.</p>
      </div>

      {/* Summary card */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-12 rounded-xl bg-primary/10 text-primary">
              <Sparkles size={24} />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{earnedCount} <span className="text-muted-foreground text-lg font-medium">/ {total}</span></div>
              <div className="text-sm text-muted-foreground">badges unlocked</div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{byRarity("common")}</div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Common</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{byRarity("rare")}</div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Rare</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{byRarity("legendary")}</div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Legendary</div>
            </div>
          </div>
        </div>
        <div className="mt-5">
          <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-2 text-xs text-muted-foreground font-medium">{pct}% complete — {total - earnedCount} still to unlock</div>
        </div>
      </div>

      {/* Category sections */}
      {grouped.map(({ cat, meta, badges }) => {
        const catEarned = badges.filter((b) => earned.has(b.slug)).length
        return (
          <section key={cat} className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl text-foreground" style={headingStyle}>{meta.label}</h2>
                <p className="text-sm text-muted-foreground">{meta.blurb}</p>
              </div>
              <span className="text-sm font-semibold text-muted-foreground whitespace-nowrap">{catEarned} / {badges.length}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {badges.map((b) => {
                const isEarned = earned.has(b.slug)
                return (
                  <div
                    key={b.slug}
                    className={`relative flex items-start gap-4 p-4 rounded-xl border transition-all ${rarityClasses(b.rarity, isEarned)} ${isEarned ? "hover:-translate-y-0.5 hover:shadow-md" : "opacity-75"}`}
                  >
                    <div className={`flex items-center justify-center size-12 rounded-full flex-shrink-0 ${isEarned ? "bg-white/70 dark:bg-white/10 shadow-sm" : "bg-muted"}`}>
                      <i className={`${b.icon} text-xl ${iconTone(b.rarity, isEarned)}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-foreground truncate">{b.name}</h3>
                        {!isEarned && <Lock size={12} className="text-muted-foreground flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{b.description}</p>
                      <span className={`inline-block mt-2 text-[10px] font-bold uppercase tracking-wider ${iconTone(b.rarity, isEarned)}`}>
                        {isEarned ? b.rarity : "Locked"}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </main>
  )
}
