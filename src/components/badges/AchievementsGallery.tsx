"use client"

import React, { useState, useMemo, useEffect } from "react"
import { Search, Sparkles, Trophy, Star, ShieldCheck, HelpCircle } from "lucide-react"
import BadgeCard from "./BadgeCard"
import BadgeDetailsModal from "./BadgeDetailsModal"

interface BadgeData {
  slug: string
  name: string
  description: string
  category: string
  rarity: string
  earned: boolean
  earnedAt?: string | null
  progress: { current: number; target: number }
  rewardXP: number
}

interface AchievementsGalleryProps {
  badges: BadgeData[]
  initialEarnedCount: number
  totalBadgesCount: number
  commonCount: number
  rareCount: number
  legendaryCount: number
}

const CATEGORY_META: Record<string, { label: string; blurb: string }> = {
  getting_started: { label: "Getting Started", blurb: "Your first steps on AlmaPrep" },
  streak: { label: "Streaks", blurb: "Show up, day after day" },
  interview: { label: "Interviews", blurb: "Reps in the interview room" },
  coding: { label: "Coding", blurb: "Technical challenge mastery" },
  skill: { label: "Skills", blurb: "Delivery, presence, and polish" },
  progress: { label: "Progress", blurb: "Getting measurably better" },
  special: { label: "Special & Rare", blurb: "The hard-to-earn milestones" },
}

const CATEGORY_ORDER = ["getting_started", "streak", "interview", "coding", "skill", "progress", "special"]
const SEEN_KEY = "seen_badges"

export default function AchievementsGallery({
  badges,
  initialEarnedCount,
  totalBadgesCount,
  commonCount,
  rareCount,
  legendaryCount,
}: AchievementsGalleryProps) {
  // Filters & search state
  const [searchTerm, setSearchTerm] = useState("")
  const [rarityFilter, setRarityFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  
  // Selected badge for Detail Modal
  const [selectedBadge, setSelectedBadge] = useState<BadgeData | null>(null)
  
  // Track newly unlocked badges for animating them
  const [newlyUnlocked, setNewlyUnlocked] = useState<Set<string>>(new Set())

  // Detect newly earned badges compared to seen_badges in localStorage
  useEffect(() => {
    try {
      const earnedSlugs = badges.filter((b) => b.earned).map((b) => b.slug)
      const seen = localStorage.getItem(SEEN_KEY)
      
      if (seen === null) {
        // First visit: baseline all currently earned badges silently
        localStorage.setItem(SEEN_KEY, JSON.stringify(earnedSlugs))
      } else {
        const seenSlugs: string[] = JSON.parse(seen)
        const seenSet = new Set(seenSlugs)
        
        // Find which earned badges are not in seen_badges
        const fresh = earnedSlugs.filter((s) => !seenSet.has(s))
        
        if (fresh.length > 0) {
          setNewlyUnlocked(new Set(fresh))
          // Save them as seen so they don't animate again next load
          localStorage.setItem(SEEN_KEY, JSON.stringify([...seenSlugs, ...fresh]))
        }
      }
    } catch (e) {
      console.error("Error matching seen badges in AchievementsGallery:", e)
    }
  }, [badges])

  // Filtered badges
  const filteredBadges = useMemo(() => {
    return badges.filter((b) => {
      const matchesSearch =
        b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.description.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesRarity = rarityFilter === "all" || b.rarity === rarityFilter
      
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "earned" && b.earned) ||
        (statusFilter === "locked" && !b.earned)

      return matchesSearch && matchesRarity && matchesStatus
    })
  }, [badges, searchTerm, rarityFilter, statusFilter])

  // Group by category
  const grouped = useMemo(() => {
    return CATEGORY_ORDER.map((cat) => {
      const catBadges = filteredBadges.filter((b) => b.category === cat)
      return {
        cat,
        meta: CATEGORY_META[cat],
        badges: catBadges,
      }
    }).filter((g) => g.badges.length > 0)
  }, [filteredBadges])

  const completionPct = Math.round((initialEarnedCount / totalBadgesCount) * 100)

  return (
    <div className="space-y-8">
      {/* Profile/Gamification Summary Panel */}
      <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-lg relative overflow-hidden">
        {/* Ambient subtle glowing design backdrop */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-wrap items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center size-14 rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-inner">
              <Trophy size={28} className="animate-pulse" />
            </div>
            <div>
              <div className="text-3xl font-extrabold text-foreground flex items-baseline gap-1">
                {initialEarnedCount}{" "}
                <span className="text-muted-foreground text-sm font-medium">/ {totalBadgesCount}</span>
              </div>
              <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">
                Achievements Unlocked
              </div>
            </div>
          </div>

          {/* Counts by Rarity with Glowing Badges */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 bg-muted/20 border border-border/40 p-4 rounded-xl">
            <div className="text-center px-2">
              <div className="flex items-center gap-1.5 text-blue-500 font-extrabold text-lg">
                <ShieldCheck size={16} />
                <span>{commonCount}</span>
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-0.5">
                Common
              </div>
            </div>
            <div className="h-8 w-px bg-border/40" />
            <div className="text-center px-2">
              <div className="flex items-center gap-1.5 text-purple-500 font-extrabold text-lg">
                <Star size={16} />
                <span>{rareCount}</span>
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-0.5">
                Rare
              </div>
            </div>
            <div className="h-8 w-px bg-border/40" />
            <div className="text-center px-2">
              <div className="flex items-center gap-1.5 text-amber-500 font-extrabold text-lg">
                <Sparkles size={16} />
                <span>{legendaryCount}</span>
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-0.5">
                Legendary
              </div>
            </div>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="mt-6 relative z-10">
          <div className="flex justify-between items-center text-xs text-muted-foreground font-medium mb-2">
            <span>Overall Collection Progress</span>
            <span className="text-foreground font-bold">{completionPct}% Completed</span>
          </div>
          <div className="h-3 w-full rounded-full bg-muted/80 overflow-hidden border border-border/20">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400 transition-all duration-1000 ease-out"
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <div className="mt-2 text-[10px] text-muted-foreground">
            Keep practicing and mock-interviewing to claim the remaining {totalBadgesCount - initialEarnedCount} locked badges.
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/40 border border-border/60 p-4 rounded-xl">
        {/* Left Side: Status & Rarity Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Select */}
          <div className="flex items-center bg-muted/40 p-1 rounded-lg border border-border/40">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === "all"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter("earned")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === "earned"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Earned
            </button>
            <button
              onClick={() => setStatusFilter("locked")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === "locked"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Locked
            </button>
          </div>

          {/* Rarity Select */}
          <div className="flex items-center bg-muted/40 p-1 rounded-lg border border-border/40">
            <button
              onClick={() => setRarityFilter("all")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                rarityFilter === "all"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Rarities
            </button>
            <button
              onClick={() => setRarityFilter("common")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                rarityFilter === "common"
                  ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                  : "text-muted-foreground hover:text-foreground border border-transparent"
              }`}
            >
              Common
            </button>
            <button
              onClick={() => setRarityFilter("rare")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                rarityFilter === "rare"
                  ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                  : "text-muted-foreground hover:text-foreground border border-transparent"
              }`}
            >
              Rare
            </button>
            <button
              onClick={() => setRarityFilter("legendary")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                rarityFilter === "legendary"
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  : "text-muted-foreground hover:text-foreground border border-transparent"
              }`}
            >
              Legendary
            </button>
          </div>
        </div>

        {/* Right Side: Search Input */}
        <div className="relative w-full md:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search achievements..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-border/80 bg-background text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
          />
        </div>
      </div>

      {/* Grid Content */}
      <div className="space-y-10">
        {grouped.length > 0 ? (
          grouped.map(({ cat, meta, badges: catBadges }) => (
            <section key={cat} className="space-y-4">
              <div className="border-b border-border/40 pb-2">
                <h2 className="text-xl font-bold text-foreground tracking-tight flex items-baseline gap-2">
                  {meta?.label || cat}
                  <span className="text-xs text-muted-foreground font-normal">
                    ({catBadges.filter((b) => b.earned).length} / {catBadges.length} earned)
                  </span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">{meta?.blurb}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {catBadges.map((b) => (
                  <BadgeCard
                    key={b.slug}
                    badge={b}
                    isNewlyUnlocked={newlyUnlocked.has(b.slug)}
                    onClick={() => setSelectedBadge(b)}
                  />
                ))}
              </div>
            </section>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 bg-card/25 border border-dashed border-border rounded-xl">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted text-muted-foreground">
              <HelpCircle size={22} />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-foreground text-sm">No Achievements Found</h3>
              <p className="text-xs text-muted-foreground max-w-xs">
                Try adjusting your search query or category filters to locate other badges.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Detail Popup Modal */}
      <BadgeDetailsModal
        isOpen={selectedBadge !== null}
        onClose={() => setSelectedBadge(null)}
        badge={selectedBadge}
      />
    </div>
  )
}
