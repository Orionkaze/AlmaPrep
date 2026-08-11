"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { Lock, Sparkles, CheckCircle2 } from "lucide-react"
import BadgeIcon from "./BadgeIcon"

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

interface BadgeCardProps {
  badge: BadgeData
  isNewlyUnlocked?: boolean
  onClick: () => void
}

interface SparkleParticle {
  id: number
  dx: string
  dy: string
  size: number
  color: string
  delay: string
}

export default function BadgeCard({
  badge,
  isNewlyUnlocked = false,
  onClick,
}: BadgeCardProps) {
  const { name, description, rarity, earned, earnedAt, progress, rewardXP } = badge
  const [sparkles, setSparkles] = React.useState<SparkleParticle[]>([])
  const [isAnimating, setIsAnimating] = React.useState(isNewlyUnlocked)

  React.useEffect(() => {
    if (isNewlyUnlocked) {
      const colors =
        rarity === "legendary"
          ? ["#fbbf24", "#f59e0b", "#fff", "#ef4444"]
          : rarity === "rare"
          ? ["#c084fc", "#8b5cf6", "#fff", "#6366f1"]
          : ["#60a5fa", "#3b82f6", "#fff", "#10b981"]

      const generated = Array.from({ length: 12 }).map((_, i) => ({
        id: i,
        dx: `${(Math.random() - 0.5) * 70}px`,
        dy: `${-30 - Math.random() * 50}px`,
        size: 3 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: `${Math.random() * 0.3}s`,
      }))

      setSparkles(generated)

      // Stop the unlock pop bounce animation after 1.5 seconds
      const timer = setTimeout(() => {
        setIsAnimating(false)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [isNewlyUnlocked, rarity])

  const isComplete = earned || progress.current >= progress.target
  const progressPct = Math.min(100, Math.round((progress.current / progress.target) * 100))

  // Determine rarity colors
  let cardBorderColor = "border-border hover:border-blue-500/30"
  let glowColor = "rgba(59, 130, 246, 0.05)"
  let xpTagStyle = "bg-blue-500/10 text-blue-400 border-blue-500/20"

  if (earned) {
    if (rarity === "legendary") {
      cardBorderColor = "border-amber-500/35 hover:border-amber-400/80"
      glowColor = "rgba(245, 158, 11, 0.12)"
      xpTagStyle = "bg-amber-500/10 text-amber-400 border-amber-500/20"
    } else if (rarity === "rare") {
      cardBorderColor = "border-purple-500/30 hover:border-purple-400/80"
      glowColor = "rgba(139, 92, 246, 0.1)"
      xpTagStyle = "bg-purple-500/10 text-purple-400 border-purple-500/20"
    } else {
      cardBorderColor = "border-emerald-500/30 hover:border-emerald-400/80"
      glowColor = "rgba(16, 185, 129, 0.08)"
      xpTagStyle = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
    }
  } else {
    // Locked card colors
    cardBorderColor = "border-border/60 hover:border-neutral-500/40"
    xpTagStyle = "bg-neutral-800 text-neutral-400 border-neutral-700/30"
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col justify-between w-full p-4 rounded-xl border bg-card text-left outline-none cursor-pointer overflow-hidden",
        "transition-all duration-300 ease-out",
        earned
          ? "hover:-translate-y-1.5 hover:shadow-xl dark:bg-card/75"
          : "bg-muted/10 opacity-70 hover:opacity-100 hover:-translate-y-0.5",
        cardBorderColor,
        isAnimating && "animate-unlock-pop z-10"
      )}
      style={{
        boxShadow: earned ? `0 4px 20px -2px ${glowColor}` : undefined,
      }}
    >
      {/* Sparkles container for Newly Unlocked Badges */}
      {sparkles.map((sp) => (
        <div
          key={sp.id}
          className="absolute w-2 h-2 rounded-full pointer-events-none animate-sparkle-float z-10"
          style={{
            backgroundColor: sp.color,
            width: sp.size,
            height: sp.size,
            top: "35%",
            left: "50%",
            "--dx": sp.dx,
            "--dy": sp.dy,
            animationDelay: sp.delay,
          } as React.CSSProperties}
        />
      ))}

      {/* Top right XP Reward tag */}
      <div className="absolute top-3 right-3 flex items-center gap-1">
        <span
          className={cn(
            "px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider",
            xpTagStyle
          )}
        >
          +{rewardXP} XP
        </span>
      </div>

      <div className="flex items-start gap-3 w-full pr-14 min-h-[3.75rem]">
        {/* SVG Crest BadgeIcon */}
        <div className="flex-shrink-0">
          <BadgeIcon
            slug={badge.slug}
            rarity={rarity}
            earned={earned}
            size={48}
            className="transform group-hover:scale-105 transition-transform duration-300"
          />
        </div>

        {/* Title & Description */}
        <div className="min-w-0 flex-1 mt-0.5">
          <div className="flex items-center gap-1.5">
            <h3 className="font-bold text-sm text-foreground truncate">{name}</h3>
            {!earned && <Lock size={11} className="text-neutral-500 flex-shrink-0" />}
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug mt-1 line-clamp-2">
            {description}
          </p>
        </div>
      </div>

      {/* Bottom Progress or Earned details */}
      <div className="mt-4 pt-3 border-t border-border/40 w-full text-[10px]">
        {earned ? (
          <div className="flex items-center justify-between text-blue-500 dark:text-blue-400 font-semibold">
            <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider bg-blue-500/10 dark:bg-blue-500/15 px-2 py-0.5 rounded-full border border-blue-500/20">
              <CheckCircle2 size={10} className="stroke-[2.5]" /> Earned
            </span>
            {earnedAt && (
              <span className="text-[10px] text-muted-foreground/80 font-normal">
                {new Date(earnedAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px] text-muted-foreground">
              <span>Progress</span>
              <span className="font-medium text-foreground">
                {progress.current} / {progress.target}
              </span>
            </div>
            <div className="h-1.5 w-full bg-muted/70 dark:bg-muted/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </button>
  )
}
