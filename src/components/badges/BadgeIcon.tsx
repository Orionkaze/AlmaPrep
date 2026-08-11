"use client"

import React from "react"
import { cn } from "@/lib/utils"
import {
  Rocket,
  Code2,
  UserCheck,
  FileCheck,
  CalendarDays,
  Flame,
  Droplets,
  Sword,
  Target,
  Infinity as InfinityIcon,
  Crown,
  Star,
  Mic,
  Medal,
  Bot,
  Trophy,
  Compass,
  Map,
  Globe,
  CheckCircle2,
  Zap,
  TrendingUp,
  Bug,
  Languages,
  Puzzle,
  Laptop,
  Server,
  Timer,
  GitFork,
  Smile,
  MessageSquare,
  Award,
  ShieldCheck,
  VolumeX,
  Heart,
  Eye,
  RotateCcw,
  Dumbbell,
  Moon,
  CloudSun,
  Utensils,
  Flag,
  Ghost,
  Layers,
  Lock
} from "lucide-react"

const Github = ({ size, className, ...props }: { size?: number; className?: string; [key: string]: any }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="currentColor"
    stroke="none"
    className={className}
    {...props}
  >
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.167 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.164 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
  </svg>
)

export const BADGE_ICONS: Record<string, React.ComponentType<any>> = {
  "first-step": Rocket,
  "code-debut": Code2,
  "profile-pro": UserCheck,
  "resume-ready": FileCheck,
  "github-connected": Github,
  "early-bird": CalendarDays,

  "on-a-roll": Flame,
  "week-warrior": Droplets,
  "fortnight-fighter": Sword,
  "monthly-grinder": Target,
  "unstoppable": InfinityIcon,
  "century-club": Crown,
  "legend": Star,

  "nervous-no-more": Mic,
  "interview-veteran": Medal,
  "interview-machine": Bot,
  "century-interviewer": Trophy,
  "domain-hopper": Compass,
  "domain-master": Map,
  "domain-legend": Globe,
  "perfect-score": CheckCircle2,
  "speed-talker": Zap,
  "consistent-performer": TrendingUp,

  "bug-slayer": Bug,
  "optimizer": Zap,
  "polyglot": Languages,
  "github-publisher": Github,
  "problem-solver": Puzzle,
  "code-veteran": Laptop,
  "code-machine": Server,
  "first-try": Target,
  "speed-coder": Timer,
  "repo-builder": GitFork,

  "body-language-boss": Smile,
  "silver-tongue": MessageSquare,
  "star-student": Award,
  "github-guru": Github,
  "proctoring-pro": ShieldCheck,
  "filler-free": VolumeX,
  "posture-perfect": Heart,
  "eye-contact-king": Eye,

  "glow-up": TrendingUp,
  "comeback-kid": RotateCcw,
  "steady-climber": TrendingUp,
  "weak-spot-warrior": Dumbbell,
  "all-rounder": Compass,
  "overachiever": Zap,
  "weekend-warrior": CalendarDays,

  "night-owl": Moon,
  "early-riser": CloudSun,
  "lunch-break-hustler": Utensils,
  "marathon-session": Flag,
  "ghost-mode": Ghost,
  "triple-threat": Layers,
  "almaprep-og": Award,
}

interface BadgeIconProps {
  slug: string
  rarity: string
  earned: boolean
  size?: number
  className?: string
}

export default function BadgeIcon({
  slug,
  rarity,
  earned,
  size = 48,
  className,
}: BadgeIconProps) {
  const IconComponent = BADGE_ICONS[slug] || Award
  const idSuffix = React.useId().replace(/:/g, "")

  // Shield dimensions/path viewBox="0 0 60 70"
  const shieldPath =
    "M 30 2 C 45 2, 58 8, 58 24 C 58 45, 45 60, 30 68 C 15 60, 2 45, 2 24 C 2 8, 15 2, 30 2 Z"

  let borderClass = ""
  let glowClass = ""
  let fillGradientStart = ""
  let fillGradientEnd = ""
  let strokeColor = ""
  let iconColor = ""

  if (!earned) {
    borderClass = "stroke-neutral-800"
    fillGradientStart = "#18181b" // zinc 900
    fillGradientEnd = "#09090b" // zinc 950
    strokeColor = "#27272a" // zinc 800
    iconColor = "text-neutral-600"
  } else {
    switch (rarity) {
      case "legendary":
        borderClass = "stroke-amber-400"
        glowClass = "animate-gold-glow"
        fillGradientStart = "#451a03" // amber 950
        fillGradientEnd = "#78350f" // amber 900
        strokeColor = "#fca5a5" // gold
        iconColor = "text-amber-300"
        break
      case "rare":
        borderClass = "stroke-purple-400"
        glowClass = "animate-purple-glow"
        fillGradientStart = "#1e1b4b" // indigo 950
        fillGradientEnd = "#312e81" // indigo 900
        strokeColor = "#a78bfa" // purple
        iconColor = "text-purple-300"
        break
      default: // common
        borderClass = "stroke-blue-400"
        glowClass = "animate-blue-glow"
        fillGradientStart = "#0f172a" // slate 900
        fillGradientEnd = "#1e293b" // slate 800
        strokeColor = "#60a5fa" // light blue
        iconColor = "text-blue-300"
        break
    }
  }

  const iconSize = Math.round(size * 0.42)

  return (
    <div
      className={cn("relative flex items-center justify-center select-none", className)}
      style={{ width: size, height: (size * 70) / 60 }}
    >
      <svg
        viewBox="0 0 60 70"
        className={cn(
          "w-full h-full transition-all duration-300",
          earned ? glowClass : "opacity-60 grayscale filter contrast-75"
        )}
      >
        <defs>
          <linearGradient id={`grad-${slug}-${idSuffix}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={fillGradientStart} />
            <stop offset="100%" stopColor={fillGradientEnd} />
          </linearGradient>
          {earned && rarity === "legendary" && (
            <linearGradient id={`shimmer-${slug}-${idSuffix}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0)" />
              <stop offset="35%" stopColor="rgba(255,255,255,0)" />
              <stop offset="50%" stopColor="rgba(255,255,255,0.4)" />
              <stop offset="65%" stopColor="rgba(255,255,255,0)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
          )}
        </defs>

        {/* Shield background fill */}
        <path
          d={shieldPath}
          fill={`url(#grad-${slug}-${idSuffix})`}
          className="transition-colors duration-300"
        />

        {/* Inner shadow/border for dimension */}
        <path
          d={shieldPath}
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.5"
          className="opacity-40"
        />

        {/* Shimmer Overlay for Legendary */}
        {earned && rarity === "legendary" && (
          <path
            d={shieldPath}
            fill={`url(#shimmer-${slug}-${idSuffix})`}
            className="animate-shimmer"
            style={{
              mixBlendMode: "overlay",
            }}
          />
        )}

        {/* Outer shield frame */}
        <path
          d={shieldPath}
          fill="none"
          stroke={earned ? undefined : strokeColor}
          strokeWidth="2.5"
          className={cn(borderClass, "transition-all duration-300")}
        />
      </svg>

      {/* Centered Icon */}
      <div className="absolute inset-0 flex items-center justify-center pb-1">
        <IconComponent
          size={iconSize}
          className={cn("stroke-[2]", iconColor, "transition-colors duration-300")}
        />
      </div>

      {/* Lock indicator for locked badges */}
      {!earned && (
        <div className="absolute bottom-0 right-0 bg-neutral-900 border border-neutral-800 rounded-full p-1 shadow-md">
          <Lock size={size * 0.22} className="text-neutral-500" />
        </div>
      )}
    </div>
  )
}
