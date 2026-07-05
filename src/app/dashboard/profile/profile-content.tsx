"use client"

import { useState } from "react"
import {
  Laptop,
  UserRound,
  Rocket,
  Brain,
  Star,
  Mail,
  Calendar,
  CheckCircle,
  Award,
  BarChart2,
  Target,
  Flame,
  UserPen,
  Save,
  Loader2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertCircle,
  CreditCard,
  History,
  GitBranch,
  ShieldAlert,
  LogOut,
  Sparkles
} from "lucide-react"
import { toast } from "sonner"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Progress, ProgressTrack, ProgressIndicator } from "@/components/ui/progress"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { updateUserProfile, clearAllUserData, updateGithubAutosave } from "@/app/actions/profile"
import { signOut } from "next-auth/react"
import Link from "next/link"

const avatarMap: Record<string, React.FC<any>> = {
  "laptop-code": Laptop,
  "user-tie": UserRound,
  "rocket": Rocket,
  "brain": Brain,
  "star": Star,
}

const avatars = [
  { name: "laptop-code", icon: Laptop },
  { name: "user-tie", icon: UserRound },
  { name: "rocket", icon: Rocket },
  { name: "brain", icon: Brain },
  { name: "star", icon: Star },
]

interface Interview {
  id: string
  category: string
  score: number
  date: string
  status: string
}

interface ProfileContentProps {
  initialProfile: {
    username: string
    avatar_url: string
    resume_text?: string
    github_autosave?: boolean
    current_streak?: number
    longest_streak?: number
  }
  userEmail: string
  createdAt: string
  interviews: Interview[]
  subscriptionTier: string
  hasGitHubToken: boolean
  initialGitHubAnalysis: any
  allBadges?: any[]
  userBadges?: any[]
  totalActivities?: number
}

function ScoreRing({ score }: { score: number }) {
  const radius = 30
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference
  const color = score >= 85 ? "#22c55e" : score >= 70 ? "#eab308" : "#ef4444"

  return (
    <div className="relative flex items-center justify-center">
      <svg width="72" height="72" viewBox="0 0 72 72" className="-rotate-90">
        <circle cx="36" cy="36" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <span className="absolute text-sm font-bold">{score}</span>
    </div>
  )
}

const headingStyle: React.CSSProperties = {
  fontFamily: "var(--font-head), serif",
  letterSpacing: "-0.015em",
  fontWeight: 600,
}

export default function ProfileContent({
  initialProfile,
  userEmail,
  createdAt,
  interviews,
  subscriptionTier,
  hasGitHubToken,
  initialGitHubAnalysis,
  allBadges = [],
  userBadges = [],
  totalActivities = 0,
}: ProfileContentProps) {
  const [username, setUsername] = useState(initialProfile.username)
  const [selectedAvatar, setSelectedAvatar] = useState(initialProfile.avatar_url)
  const [githubAutosave, setGithubAutosave] = useState(!!initialProfile.github_autosave)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // GitHub Analysis states
  const [githubAnalysis, setGithubAnalysis] = useState<any>(initialGitHubAnalysis)
  const [analyzingGitHub, setAnalyzingGitHub] = useState(false)
  const [githubError, setGithubError] = useState<string | null>(null)
  const [expandedRepo, setExpandedRepo] = useState<string | null>(null)

  const handleToggleAutosave = async () => {
    const nextVal = !githubAutosave
    setGithubAutosave(nextVal)
    const result = await updateGithubAutosave(nextVal)
    if (result.success) {
      toast.success(`GitHub Auto-save ${nextVal ? "enabled" : "disabled"}`)
    } else {
      toast.error(result.error || "Failed to update auto-save setting")
      setGithubAutosave(!nextVal) // revert
    }
  }

  const handleAnalyzeGitHub = async () => {
    setAnalyzingGitHub(true)
    setGithubError(null)

    try {
      const res = await fetch("/api/github-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceRefresh: true })
      })

      const data = await res.json()
      if (res.ok && data.result) {
        setGithubAnalysis(data.result)
      } else {
        throw new Error(data.error || "Failed to analyze GitHub profile.")
      }
    } catch (err: any) {
      console.error(err)
      setGithubError(err.message || "An unexpected error occurred while analyzing GitHub profile.")
    } finally {
      setAnalyzingGitHub(false)
    }
  }

  const handleGitHubRedirectLogout = async () => {
    try {
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      await supabase.auth.signOut()
    } catch (err) {
      console.error("Supabase signOut error:", err)
    }

    document.cookie = "mockmate-demo-session=; path=/; max-age=0"
    document.cookie = "mockmate-demo-user=; path=/; max-age=0"
    document.cookie = "mockmate-demo-resume=; path=/; max-age=0"

    await signOut({ redirect: false })
    window.location.href = "/login"
  }

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    setError(null)

    try {
      // 1. Call server action to clear DB rows and cookies
      await clearAllUserData()

      // 2. Clear client-side localStorage
      localStorage.removeItem("mockmate_users")
      
      // Remove all feedback keys
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i)
        if (key && (key.startsWith("feedback-") || key.startsWith("mockmate-") || key === "mockmate_users")) {
          localStorage.removeItem(key)
        }
      }

      // 3. Clear guest cookies in document
      document.cookie = "mockmate-demo-session=; path=/; max-age=0"
      document.cookie = "mockmate-demo-user=; path=/; max-age=0"
      document.cookie = "mockmate-demo-resume=; path=/; max-age=0"

      // 4. Sign out
      try {
        await signOut({ redirect: false })
        window.location.href = "/"
      } catch (e) {
        window.location.href = "/"
      }
    } catch (err) {
      console.error("Failed to delete account:", err)
      setError("Failed to delete account. Please try again.")
      setIsDeleting(false)
    }
  }

  const handleSave = async () => {
    if (!username.trim()) {
      toast.error("Username cannot be empty")
      return
    }

    setLoading(true)
    setError(null)

    const result = await updateUserProfile(username.trim(), selectedAvatar)

    if (result.success) {
      toast.success("Profile updated successfully!")
      setIsEditing(false)
      setTimeout(() => {
        window.location.reload()
      }, 500)
    } else {
      toast.error(result.error || "Failed to update profile")
    }
    setLoading(false)
  }

  // Calculate statistics
  const totalSessions = interviews.length
  const avgScore = totalSessions > 0
    ? Math.round(interviews.reduce((sum, h) => sum + h.score, 0) / totalSessions)
    : 0
  const bestScore = totalSessions > 0
    ? Math.max(...interviews.map(h => h.score))
    : 0

  // Profile completion calculation
  let completionPercentage = 20 // base email confirmed
  if (initialProfile.username && initialProfile.username !== "User") completionPercentage += 20
  if (initialProfile.avatar_url && initialProfile.avatar_url !== "user-tie") completionPercentage += 20
  if (initialProfile.resume_text) completionPercentage += 20
  if (totalSessions > 0) completionPercentage += 20

  // Format date
  const joinDate = new Date(createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const AvatarIcon = avatarMap[selectedAvatar] || UserRound
  const showNudge = initialProfile.username === "User" || initialProfile.avatar_url === "user-tie"

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {showNudge && (
        <Card className="border-amber-500/20 bg-amber-500/5 relative overflow-hidden shadow-sm">
          <CardContent className="p-4">
            <h4 className="text-sm font-bold text-amber-500 mb-1 flex items-center gap-1.5" style={headingStyle}>
              <AlertCircle size={16} strokeWidth={1.75} /> Customize Your Profile
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              You are currently using a guest profile. Go to the <strong className="text-amber-500">Profile Details</strong> tab below to customize your username and pick a unique avatar!
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="profile" className="w-full flex flex-col gap-6">
        <TabsList className="bg-muted p-1 rounded-lg w-full sm:w-fit grid grid-cols-2 sm:flex sm:flex-row gap-1">
          <TabsTrigger value="profile" className="px-4 py-1.5 text-xs font-semibold cursor-pointer flex items-center gap-2">
            <UserRound size={14} /> Profile Details
          </TabsTrigger>
          <TabsTrigger value="billing" className="px-4 py-1.5 text-xs font-semibold cursor-pointer flex items-center gap-2">
            <CreditCard size={14} /> Billing & Danger Zone
          </TabsTrigger>
          <TabsTrigger value="github" className="px-4 py-1.5 text-xs font-semibold cursor-pointer flex items-center gap-2">
            <GitBranch size={14} /> GitHub Integration
          </TabsTrigger>
          <TabsTrigger value="history" className="px-4 py-1.5 text-xs font-semibold cursor-pointer flex items-center gap-2">
            <History size={14} /> Performance History
          </TabsTrigger>
          <TabsTrigger value="achievements" className="px-4 py-1.5 text-xs font-semibold cursor-pointer flex items-center gap-2">
            <Award size={14} /> Achievements
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Profile Details */}
        <TabsContent value="profile">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            <Card className="md:col-span-7 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold" style={headingStyle}>Account Settings</CardTitle>
                <CardDescription className="text-xs">Update your public profile details and configuration settings.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-border">
                  <Avatar className="size-20 bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary text-3xl shadow-md">
                    <AvatarFallback className="bg-transparent text-primary">
                      <AvatarIcon size={36} strokeWidth={1.75} />
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 space-y-1 text-center sm:text-left">
                    <h3 className="text-xl font-bold font-serif text-foreground">{initialProfile.username}</h3>
                    <p className="text-xs text-muted-foreground">Joined Almaprep on {joinDate}</p>
                  </div>
                </div>

                {isEditing ? (
                  <div className="space-y-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Username</label>
                      <Input
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="h-10 text-sm border-border focus:border-primary"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Choose Avatar</label>
                      <ToggleGroup
                        value={[selectedAvatar]}
                        onValueChange={(val) => {
                          if (val && val.length > 0) setSelectedAvatar(val[0])
                        }}
                        className="flex justify-start gap-2 flex-wrap"
                      >
                        {avatars.map((av) => {
                          const IconComp = av.icon
                          return (
                            <ToggleGroupItem
                              key={av.name}
                              value={av.name}
                              variant="outline"
                              className="size-11 rounded-full flex items-center justify-center cursor-pointer data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
                            >
                              <IconComp size={16} strokeWidth={1.75} />
                            </ToggleGroupItem>
                          )
                        })}
                      </ToggleGroup>
                    </div>

                    {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
                    
                    <div className="flex gap-2 justify-end pt-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setUsername(initialProfile.username)
                          setSelectedAvatar(initialProfile.avatar_url)
                          setIsEditing(false)
                          setError(null)
                        }}
                        className="h-9 text-xs cursor-pointer"
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleSave} disabled={loading} className="h-9 px-4 text-xs cursor-pointer font-semibold">
                        {loading ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Username</p>
                        <p className="text-sm font-semibold text-foreground">{initialProfile.username}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Email</p>
                        <p className="text-sm font-semibold text-foreground">{userEmail}</p>
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Resume Analysis Status</p>
                      <p className="text-xs text-muted-foreground">
                        {initialProfile.resume_text ? (
                          <span className="text-green-500 font-semibold flex items-center gap-1">
                            <span className="size-1.5 rounded-full bg-green-500 animate-pulse" /> Verified & active in mock interviews
                          </span>
                        ) : (
                          <span>
                            No resume analyzed yet.{" "}
                            <Link href="/dashboard/resume" className="text-primary hover:underline font-bold">
                              Configure Now
                            </Link>
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="pt-2">
                      <Button onClick={() => setIsEditing(true)} className="h-9 px-4 text-xs cursor-pointer font-semibold" variant="outline">
                        <UserPen className="mr-1.5" size={14} strokeWidth={1.75} /> Customize Profile
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Profile Completion Panel */}
            <Card className="md:col-span-5 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold" style={headingStyle}>Profile Completion</CardTitle>
                <CardDescription className="text-xs">Complete your checklist items to optimize your profile recommendations.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-muted-foreground">
                    <span>PROGRESS</span>
                    <span className="text-primary">{completionPercentage}%</span>
                  </div>
                  <Progress value={completionPercentage} className="h-2 w-full" />
                </div>

                <Separator />

                <ul className="text-xs text-muted-foreground space-y-2.5">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="text-green-500 shrink-0" size={14} />
                    <span className="line-through">Email verified ({userEmail})</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={`size-4 rounded-full border border-border flex items-center justify-center shrink-0 ${initialProfile.username && initialProfile.username !== "User" ? "bg-green-500/10 border-green-500/30" : ""}`}>
                      {initialProfile.username && initialProfile.username !== "User" ? <CheckCircle className="text-green-500" size={12} /> : <span className="size-1 rounded-full bg-muted-foreground" />}
                    </span>
                    <span className={initialProfile.username && initialProfile.username !== "User" ? "line-through" : ""}>Set customized username</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={`size-4 rounded-full border border-border flex items-center justify-center shrink-0 ${initialProfile.avatar_url && initialProfile.avatar_url !== "user-tie" ? "bg-green-500/10 border-green-500/30" : ""}`}>
                      {initialProfile.avatar_url && initialProfile.avatar_url !== "user-tie" ? <CheckCircle className="text-green-500" size={12} /> : <span className="size-1 rounded-full bg-muted-foreground" />}
                    </span>
                    <span className={initialProfile.avatar_url && initialProfile.avatar_url !== "user-tie" ? "line-through" : ""}>Choose customized avatar</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={`size-4 rounded-full border border-border flex items-center justify-center shrink-0 ${initialProfile.resume_text ? "bg-green-500/10 border-green-500/30" : ""}`}>
                      {initialProfile.resume_text ? <CheckCircle className="text-green-500" size={12} /> : <span className="size-1 rounded-full bg-muted-foreground" />}
                    </span>
                    <span className={initialProfile.resume_text ? "line-through" : ""}>Configure Resume Analyzer</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className={`size-4 rounded-full border border-border flex items-center justify-center shrink-0 ${totalSessions > 0 ? "bg-green-500/10 border-green-500/30" : ""}`}>
                      {totalSessions > 0 ? <CheckCircle className="text-green-500" size={12} /> : <span className="size-1 rounded-full bg-muted-foreground" />}
                    </span>
                    <span className={totalSessions > 0 ? "line-through" : ""}>Start first interview</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: Billing & Danger Zone */}
        <TabsContent value="billing">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Billing details */}
            <Card className="md:col-span-7 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-bold" style={headingStyle}>Billing Settings</CardTitle>
                <CardDescription className="text-xs">Manage your plan subscription tier and invoices.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center justify-between bg-muted/40 p-4 rounded-xl border border-border">
                  <div className="space-y-0.5 text-left">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Subscription Tier</p>
                    <h4 className="text-base font-bold text-foreground capitalize flex items-center gap-1.5">
                      <Award size={18} className="text-primary" /> {subscriptionTier} Plan
                    </h4>
                  </div>
                  <Link href="/pricing">
                    <Button variant="outline" className="h-9 px-4 text-xs font-semibold cursor-pointer">
                      Upgrade Tier
                    </Button>
                  </Link>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Features Included</h4>
                  <ul className="text-xs text-muted-foreground space-y-2 list-none pl-0">
                    <li className="flex gap-2 items-start leading-relaxed">
                      <span className="text-primary font-bold shrink-0">•</span>
                      <span>Access to HR and Mixed Mock Interview Tracks</span>
                    </li>
                    <li className="flex gap-2 items-start leading-relaxed">
                      <span className="text-primary font-bold shrink-0">•</span>
                      <span>Real-time voice synthesis and transcriptions</span>
                    </li>
                    <li className="flex gap-2 items-start leading-relaxed">
                      <span className="text-primary font-bold shrink-0">•</span>
                      <span>Agentic Coding Workspace (standard algorithm challenges)</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="md:col-span-5 border-red-500/20 bg-red-500/5 relative overflow-hidden shadow-sm text-left">
              <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />
              <CardHeader>
                <CardTitle className="text-lg font-bold text-red-500 uppercase tracking-wider" style={headingStyle}>Danger Zone</CardTitle>
                <CardDescription className="text-xs text-red-500/80">Permanent, irreversible actions relating to your account.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Permanently delete all your account data, profile details, resumes, interview transcripts, and performance analytics. This action is irreversible.
                </p>

                {/* Dialog confirmation */}
                <Dialog>
                  <DialogTrigger render={
                    <Button
                      variant="destructive"
                      className="w-full text-xs font-semibold cursor-pointer bg-red-600 hover:bg-red-700"
                    >
                      Delete Account Data
                    </Button>
                  } />
                  <DialogContent className="bg-card text-card-foreground border border-border rounded-lg max-w-md w-full shadow-lg z-50 p-6">
                    <DialogHeader>
                      <DialogTitle className="text-base font-bold flex items-center gap-2 text-red-500">
                        <ShieldAlert size={20} /> Irreversible Action
                      </DialogTitle>
                      <DialogDescription className="text-xs text-muted-foreground pt-1 leading-relaxed">
                        Are you absolutely sure you want to delete your account? All mock interview runs, resume scans, coding session evaluations, and saved user profile details will be permanently wiped.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-2 justify-end mt-4">
                      <DialogClose render={
                        <Button variant="outline" className="text-xs h-9 cursor-pointer">
                          Cancel
                        </Button>
                      } />
                      <Button
                        variant="destructive"
                        onClick={handleDeleteAccount}
                        disabled={isDeleting}
                        className="text-xs h-9 cursor-pointer font-semibold"
                      >
                        {isDeleting ? "Deleting..." : "Yes, WIPE ALL DATA"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 4: Achievements */}
        <TabsContent value="achievements" className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold" style={headingStyle}>Achievements & Badges</CardTitle>
              <CardDescription className="text-xs">Showcase your dedication and consistency on AlmaPrep.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Badge Stats Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-muted/40 p-4 rounded-xl border border-border flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-primary">{userBadges.length}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">Total Earned</span>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-amber-500">{userBadges.filter(b => allBadges.find(a => a.slug === b.badge_slug)?.rarity === 'legendary').length}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500/80 mt-1">Legendary</span>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-blue-500">{userBadges.filter(b => allBadges.find(a => a.slug === b.badge_slug)?.rarity === 'rare').length}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500/80 mt-1">Rare</span>
                </div>
                <div className="bg-slate-500/10 border border-slate-500/20 p-4 rounded-xl flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-slate-500">{userBadges.filter(b => allBadges.find(a => a.slug === b.badge_slug)?.rarity === 'common').length}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500/80 mt-1">Common</span>
                </div>
              </div>

              {/* Badge Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {allBadges.map((badge) => {
                  const isEarned = userBadges.some(ub => ub.badge_slug === badge.slug);
                  const earnedInfo = isEarned ? userBadges.find(ub => ub.badge_slug === badge.slug) : null;
                  
                  let badgeStyles = "bg-muted/50 border-border/50 opacity-60 grayscale filter";
                  let iconColor = "text-muted-foreground";
                  
                  if (isEarned) {
                    if (badge.rarity === 'legendary') {
                      badgeStyles = "bg-amber-50 border-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.3)]";
                      iconColor = "text-amber-500";
                    } else if (badge.rarity === 'rare') {
                      badgeStyles = "bg-blue-50 border-blue-200 shadow-sm";
                      iconColor = "text-blue-500";
                    } else {
                      badgeStyles = "bg-slate-50 border-slate-200 shadow-sm";
                      iconColor = "text-slate-700";
                    }
                  }

                  return (
                    <div key={badge.slug} className={`p-4 rounded-xl border flex flex-col items-center text-center gap-2 transition-all ${badgeStyles}`}>
                      <div className={`size-12 rounded-full bg-white flex items-center justify-center shadow-sm mb-1 ${iconColor}`}>
                        <i className={`${badge.icon} text-2xl`}></i>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground">{badge.name}</h4>
                        <p className={`text-[10px] uppercase tracking-widest font-semibold mt-0.5 ${isEarned ? iconColor : ""}`}>{badge.rarity}</p>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug flex-1">{badge.description}</p>
                      {isEarned && earnedInfo && (
                        <div className="mt-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground bg-black/5 px-2 py-1 rounded-full w-full">
                          Earned {new Date(earnedInfo.earned_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: GitHub Integration */}
        <TabsContent value="github" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* GitHub Project Analyzer */}
            <Card className="md:col-span-7 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center text-white shrink-0">
                    <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold" style={headingStyle}>GitHub Project Analyzer</CardTitle>
                    <CardDescription className="text-xs">Orchestrate custom coding simulator questions targeting your real repositories.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {!githubAnalysis ? (
                  <div className="py-2">
                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                      Connect your GitHub account to analyze your codebase (technologies, coding style, commit history) and generate custom-tailored interview questions directly for your projects.
                    </p>
                    
                    {!hasGitHubToken ? (
                      <div className="bg-muted/40 border border-border rounded-xl p-4 text-center">
                        <p className="text-xs text-muted-foreground mb-3">
                          Your account is not connected to GitHub. Connect via GitHub during login to enable this.
                        </p>
                        <Button 
                          onClick={handleGitHubRedirectLogout}
                          className="w-full text-xs font-semibold cursor-pointer"
                        >
                          Go to Login & Connect GitHub
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <Button 
                          onClick={handleAnalyzeGitHub} 
                          disabled={analyzingGitHub} 
                          className="h-10 w-full text-sm font-semibold cursor-pointer"
                        >
                          {analyzingGitHub ? (
                            <>
                              <Loader2 className="animate-spin mr-2 inline-block" size={16} strokeWidth={1.75} />
                              Fetching & Analyzing Repositories...
                            </>
                          ) : (
                            "Run AI Codebase Analysis"
                          )}
                        </Button>
                        {githubError && <p className="text-xs text-red-400 text-center mt-1">{githubError}</p>}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="bg-muted/30 border border-border rounded-xl p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-xs font-bold text-primary uppercase tracking-wider" style={headingStyle}>Coding Profile Summary</h4>
                        {hasGitHubToken && (
                          <button
                            onClick={handleAnalyzeGitHub}
                            disabled={analyzingGitHub}
                            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer disabled:opacity-50 border-0 bg-transparent"
                            title="Re-run analysis"
                          >
                            <RefreshCw size={12} strokeWidth={1.75} className={analyzingGitHub ? "animate-spin" : ""} />
                            {analyzingGitHub ? "Refreshing..." : "Refresh"}
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">
                        {githubAnalysis.profile_summary}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2" style={headingStyle}>Primary Tech Stack</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {githubAnalysis.tech_stack?.map((tech: string) => (
                          <span 
                            key={tech} 
                            className="text-[11px] px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-semibold"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>

                    {githubAnalysis.design_patterns && githubAnalysis.design_patterns.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2" style={headingStyle}>Detected Design Patterns</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {githubAnalysis.design_patterns.map((pattern: string) => (
                            <span 
                              key={pattern} 
                              className="text-[11px] px-2.5 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent font-semibold"
                            >
                              {pattern}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {githubAnalysis.strengths && githubAnalysis.strengths.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2" style={headingStyle}>Key Strengths</h4>
                        <ul className="text-xs text-muted-foreground space-y-1.5 pl-1 list-none">
                          {githubAnalysis.strengths.map((strength: string, i: number) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-primary mt-0.5">✦</span>
                              <span>{strength}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {githubAnalysis.weak_areas && githubAnalysis.weak_areas.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2" style={headingStyle}>Areas to Improve</h4>
                        <ul className="text-xs text-muted-foreground space-y-1.5 pl-1 list-none">
                          {githubAnalysis.weak_areas.map((weak: string, i: number) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-rose-400 mt-0.5">⚠️</span>
                              <span>{weak}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {githubAnalysis.questions && githubAnalysis.questions.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2" style={headingStyle}>Tailored Interview Questions</h4>
                        
                        <div className="flex flex-col gap-2">
                          {Array.from(new Set(githubAnalysis.questions.map((q: any) => q.repo))).map((repoName: any) => {
                            const repoQuestions = githubAnalysis.questions.filter((q: any) => q.repo === repoName)
                            const isExpanded = expandedRepo === repoName

                            return (
                              <div 
                                key={repoName} 
                                className="border border-border bg-card rounded-xl overflow-hidden shadow-sm"
                              >
                                <button
                                  onClick={() => setExpandedRepo(isExpanded ? null : repoName)}
                                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/40 cursor-pointer text-left text-sm font-semibold text-foreground/95 border-0 bg-transparent"
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <span className="truncate">{repoName}</span>
                                    {githubAnalysis.repo_metadata?.[repoName]?.complexity_score !== undefined && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary font-bold shrink-0">
                                        Complexity: {githubAnalysis.repo_metadata[repoName].complexity_score}/10
                                      </span>
                                    )}
                                  </div>
                                  {isExpanded ? <ChevronUp size={16} strokeWidth={1.75} className="text-muted-foreground shrink-0" /> : <ChevronDown size={16} strokeWidth={1.75} className="text-muted-foreground shrink-0" />}
                                </button>
                                
                                {isExpanded && (
                                  <div className="px-4 pb-4 pt-2 flex flex-col gap-4 border-t border-border bg-muted/20">
                                    {githubAnalysis.repo_metadata?.[repoName] && (
                                      <div className="flex flex-col gap-2 pt-1 pb-1 text-xs border-b border-border">
                                        {githubAnalysis.repo_metadata[repoName].design_patterns?.length > 0 && (
                                          <div className="flex flex-wrap gap-1.5 items-center">
                                            <span className="text-muted-foreground font-medium mr-1 text-[11px]">Patterns:</span>
                                            {githubAnalysis.repo_metadata[repoName].design_patterns.map((pat: string) => (
                                              <span key={pat} className="text-[9px] px-1.5 py-0.5 rounded bg-accent/10 border border-accent/20 text-accent font-semibold">
                                                {pat}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                        {githubAnalysis.repo_metadata[repoName].weak_areas?.length > 0 && (
                                          <div className="flex flex-col gap-1 mt-1 text-[11px]">
                                            <span className="text-muted-foreground font-medium">Repo Weak Areas:</span>
                                            {githubAnalysis.repo_metadata[repoName].weak_areas.map((weak: string, wi: number) => (
                                              <span key={wi} className="text-rose-400 pl-1 leading-normal">
                                                ⚠️ {weak}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    <div className="flex flex-col gap-3">
                                      {repoQuestions.map((q: any, i: number) => (
                                        <div key={i} className="flex flex-col gap-1">
                                          <div className="flex items-center gap-2">
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                              q.difficulty === "easy" 
                                                ? "bg-green-500/10 text-green-500 border border-green-500/20" 
                                                : q.difficulty === "medium"
                                                ? "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"
                                                : "bg-red-500/10 text-red-500 border border-red-500/20"
                                            }`}>
                                              {q.difficulty}
                                            </span>
                                          </div>
                                          <p className="text-xs text-muted-foreground leading-relaxed">
                                            {q.question}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {githubError && <p className="text-xs text-red-400 text-center mt-1">{githubError}</p>}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* GitHub Settings */}
            <Card className="md:col-span-5 shadow-sm text-left">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-wider" style={headingStyle}>GitHub Integration Settings</CardTitle>
                <CardDescription className="text-xs">Manage workspace saving rules.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between border-t border-border pt-4">
                  <div className="max-w-[75%]">
                    <h4 className="text-xs font-bold text-foreground mb-0.5" style={headingStyle}>Auto-save solutions to GitHub</h4>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Automatically create a repository and commit your solutions on successful completion of coding challenges.
                    </p>
                  </div>
                  <Switch
                    checked={githubAutosave}
                    onCheckedChange={handleToggleAutosave}
                    className="cursor-pointer"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 4: Performance History */}
        <TabsContent value="history" className="space-y-6">
          {/* Stats Rings */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Card className="p-4 flex flex-row items-center justify-between gap-4 shadow-sm">
              <div className="space-y-0.5 text-left">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Avg Score</p>
                <h3 className="text-2xl font-black font-serif tracking-tight text-foreground">{avgScore}%</h3>
              </div>
              <BarChart2 className="text-primary text-xl" size={24} strokeWidth={1.75} />
            </Card>
            <Card className="p-4 flex flex-row items-center justify-between gap-4 shadow-sm">
              <div className="space-y-0.5 text-left">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Runs</p>
                <h3 className="text-2xl font-black font-serif tracking-tight text-foreground">{totalSessions}</h3>
              </div>
              <Target className="text-secondary text-xl" size={24} strokeWidth={1.75} />
            </Card>
            <Card className="p-4 flex flex-row items-center justify-between gap-4 shadow-sm col-span-2 sm:col-span-1">
              <div className="space-y-0.5 text-left">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Top Score</p>
                <h3 className="text-2xl font-black font-serif tracking-tight text-foreground">{bestScore}%</h3>
              </div>
              <Flame className="text-amber-500 text-xl" size={24} strokeWidth={1.75} />
            </Card>
          </div>

          {/* History Log */}
          <Card className="shadow-sm text-left">
            <CardHeader>
              <CardTitle className="text-lg font-bold" style={headingStyle}>Interview History & Analytics</CardTitle>
              <CardDescription className="text-xs">Review details, scoring reports, and feedback from past sessions.</CardDescription>
            </CardHeader>
            <CardContent>
              {totalSessions > 0 ? (
                <div className="flex flex-col gap-4 max-h-[460px] overflow-y-auto pr-1">
                  {interviews.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0 hover:bg-muted/40 p-2 rounded-xl transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <ScoreRing score={session.score} />
                        <div className="text-left">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h4 className="font-semibold text-sm capitalize text-foreground">{session.category} Interview</h4>
                            <Badge variant="secondary" className="text-[9px] font-medium h-5">
                              {session.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(session.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                      <Link href={`/interview/${session.id}/feedback`}>
                        <Button variant="link" className="text-xs font-semibold text-primary hover:underline whitespace-nowrap cursor-pointer">
                          View Feedback →
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 flex flex-col items-center">
                  <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Laptop className="text-muted-foreground/30 text-lg" size={20} strokeWidth={1.75} />
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">No interviews logged yet.</p>
                  <Link href="/interview/setup">
                    <Button className="h-9 px-6 text-xs cursor-pointer font-semibold">Start Practicing</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
