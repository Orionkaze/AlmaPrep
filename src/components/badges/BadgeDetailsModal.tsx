"use client"

import React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import BadgeIcon from "./BadgeIcon"
import { Calendar, CheckCircle2, Trophy, Star } from "lucide-react"

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

interface BadgeDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  badge: BadgeData | null
}

export default function BadgeDetailsModal({
  isOpen,
  onClose,
  badge,
}: BadgeDetailsModalProps) {
  if (!badge) return null

  const isComplete = badge.earned || badge.progress.current >= badge.progress.target
  const progressPct = Math.min(
    100,
    Math.round((badge.progress.current / badge.progress.target) * 100)
  )

  let rarityColor = "text-blue-400 border-blue-500/20 bg-blue-500/5"
  let rarityLabel = "Common"
  if (badge.rarity === "legendary") {
    rarityColor = "text-amber-400 border-amber-500/20 bg-amber-500/5"
    rarityLabel = "Legendary"
  } else if (badge.rarity === "rare") {
    rarityColor = "text-purple-400 border-purple-500/20 bg-purple-500/5"
    rarityLabel = "Rare"
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-card/95 border border-border/80 backdrop-blur-md rounded-2xl p-6 overflow-hidden">
        {/* Dynamic backdrop glow reflecting the rarity of the badge */}
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl opacity-15 pointer-events-none"
          style={{
            background:
              badge.rarity === "legendary"
                ? "radial-gradient(circle, #f59e0b 0%, transparent 70%)"
                : badge.rarity === "rare"
                ? "radial-gradient(circle, #8b5cf6 0%, transparent 70%)"
                : "radial-gradient(circle, #3b82f6 0%, transparent 70%)",
          }}
        />

        <DialogHeader className="flex flex-col items-center text-center mt-2 space-y-4">
          {/* Badge Icon */}
          <div className="relative group">
            <BadgeIcon
              slug={badge.slug}
              rarity={badge.rarity}
              earned={badge.earned}
              size={110}
              className="transform hover:scale-105 transition-transform duration-300"
            />
          </div>

          <div className="space-y-1">
            <span
              className={`inline-flex items-center px-3 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${rarityColor}`}
            >
              {rarityLabel}
            </span>
            <DialogTitle className="text-2xl font-bold text-foreground mt-2">
              {badge.name}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground max-w-xs mt-1 text-xs">
              {badge.description}
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Progress & Stats section */}
        <div className="space-y-4 py-4">
          {/* Progress Tracker */}
          <div className="bg-muted/30 border border-border/50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-muted-foreground font-medium">Progress</span>
              <span className="text-foreground">
                {badge.progress.current} / {badge.progress.target} ({progressPct}%)
              </span>
            </div>
            <div className="h-2 w-full bg-muted/80 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${
                  isComplete
                    ? badge.rarity === "legendary"
                      ? "bg-amber-500"
                      : badge.rarity === "rare"
                      ? "bg-purple-500"
                      : "bg-blue-500"
                    : "bg-primary"
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Details Row: Rewards & Status */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {/* Visual Reward (XP) */}
            <div className="bg-muted/30 border border-border/50 rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                Est. Reward
              </span>
              <div className="flex items-center gap-1.5 mt-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Trophy size={14} />
                </div>
                <span className="font-bold text-emerald-400">+{badge.rewardXP} XP</span>
              </div>
            </div>

            {/* Earned status details */}
            <div className="bg-muted/30 border border-border/50 rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                Status
              </span>
              <div className="flex items-center gap-1.5 mt-2">
                {badge.earned ? (
                  <>
                    <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-blue-500/10 text-blue-400">
                      <CheckCircle2 size={14} />
                    </div>
                    <span className="font-semibold text-blue-400">Earned</span>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-neutral-500/10 text-neutral-400">
                      <Star size={14} className="stroke-[2]" />
                    </div>
                    <span className="font-semibold text-neutral-400">Locked</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Unlock Date / Meta information */}
          {badge.earned && badge.earnedAt && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground/80 py-1">
              <Calendar size={13} />
              <span>Unlocked on {new Date(badge.earnedAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</span>
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-center">
          <button
            onClick={onClose}
            className="w-full sm:w-2/3 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-[0_4px_12px_rgba(5,150,105,0.25)] outline-none border border-transparent cursor-pointer"
          >
            Awesome
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
