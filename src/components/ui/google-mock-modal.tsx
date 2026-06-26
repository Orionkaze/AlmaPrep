"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { X, Sparkles, Briefcase, Rocket } from "lucide-react"

interface GoogleMockModalProps {
  isOpen: boolean
  onClose: () => void
}

interface MockProfile {
  email: string
  name: string
  title: string
  avatarUrl: string
  icon: React.ReactNode
  color: string
}

export function GoogleMockModal({ isOpen, onClose }: GoogleMockModalProps) {
  const [selectedProfile, setSelectedProfile] = React.useState<MockProfile | null>(null)
  const [step, setStep] = React.useState<"select" | "loading">("select")
  const [progress, setProgress] = React.useState(0)
  const [statusText, setStatusText] = React.useState("")

  const profiles: MockProfile[] = [
    {
      email: "google-demo@almaprep.com",
      name: "Google Demo User",
      title: "Standard Demo Profile",
      avatarUrl: "star",
      icon: <Sparkles className="size-6 text-yellow-500" />,
      color: "from-yellow-400 to-amber-500",
    },
    {
      email: "alex.engineer@gmail.com",
      name: "Alex Code",
      title: "Software Engineer",
      avatarUrl: "laptop-code",
      icon: <Briefcase className="size-6 text-emerald-500" />,
      color: "from-emerald-400 to-teal-500",
    },
    {
      email: "clara.pms@outlook.com",
      name: "Clara Product",
      title: "Product Manager",
      avatarUrl: "rocket",
      icon: <Rocket className="size-6 text-indigo-500" />,
      color: "from-indigo-400 to-purple-500",
    },
  ]

  React.useEffect(() => {
    if (!isOpen) {
      setSelectedProfile(null)
      setStep("select")
      setProgress(0)
      setStatusText("")
    }
  }, [isOpen])

  React.useEffect(() => {
    if (step === "loading" && selectedProfile) {
      // Phase 1: Contacting Google
      setStatusText("Connecting to accounts.google.com...")
      const timer1 = setTimeout(() => {
        setProgress(30)
        // Phase 2: Verifying token
        setStatusText("Authenticating token with provider...")
      }, 600)

      const timer2 = setTimeout(() => {
        setProgress(65)
        // Phase 3: Syncing with Supabase/MockDB and setting session
        setStatusText("Synchronizing session cookies...")
        
        // Write the cookies
        document.cookie = "mockmate-demo-session=true; path=/; max-age=604800" // 7 days
        document.cookie = `mockmate-demo-user=${encodeURIComponent(
          JSON.stringify({
            email: selectedProfile.email,
            username: selectedProfile.name,
            avatar_url: selectedProfile.avatarUrl,
          })
        )}; path=/; max-age=604800`
      }, 1200)

      const timer3 = setTimeout(() => {
        setProgress(100)
        setStatusText("Redirecting to dashboard...")
      }, 1800)

      const timer4 = setTimeout(() => {
        window.location.href = "/dashboard"
      }, 2100)

      return () => {
        clearTimeout(timer1)
        clearTimeout(timer2)
        clearTimeout(timer3)
        clearTimeout(timer4)
      }
    }
  }, [step, selectedProfile])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-[2px] animate-in fade-in duration-200">
      <div 
        className={cn(
          "relative w-full max-w-md overflow-hidden bg-white rounded-2xl shadow-2xl border border-slate-200 transition-all duration-300 transform scale-100",
          step === "loading" ? "bg-slate-50" : "bg-white"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <svg className="size-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            <span className="text-sm font-semibold text-slate-700">Sign in with Google</span>
          </div>
          {step === "select" && (
            <button 
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="size-5" />
            </button>
          )}
        </div>

        {step === "select" ? (
          <div className="p-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">Choose an account</h2>
              <p className="text-sm text-slate-500 mt-1">to continue to <span className="font-semibold text-emerald-600">Almaprep</span></p>
            </div>

            <div className="space-y-3">
              {profiles.map((profile) => (
                <button
                  key={profile.email}
                  onClick={() => {
                    setSelectedProfile(profile)
                    setStep("loading")
                  }}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-slate-300 bg-white hover:bg-slate-50 transition-all duration-200 group text-left shadow-xs hover:shadow-md cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("size-10 rounded-full flex items-center justify-center bg-slate-50 text-slate-600 shrink-0")}>
                      {profile.icon}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 group-hover:text-slate-900">{profile.name}</div>
                      <div className="text-xs text-slate-400">{profile.title}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">{profile.email}</div>
                    </div>
                  </div>
                  <div className="size-5 rounded-full border border-slate-200 group-hover:border-emerald-500 flex items-center justify-center transition-colors">
                    <div className="size-2.5 rounded-full bg-transparent group-hover:bg-emerald-500 transition-colors" />
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span>Demo Mode</span>
              <a href="#" className="hover:underline hover:text-slate-600">Learn more</a>
            </div>
          </div>
        ) : (
          <div className="p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
            {/* Elegant Spinning Google Logo Ring */}
            <div className="relative size-16 mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
              <div className="absolute inset-0 rounded-full border-4 border-t-emerald-500 border-r-blue-500 border-b-yellow-500 border-l-red-500 animate-spin" />
            </div>

            <h3 className="text-lg font-bold text-slate-800">Signing in...</h3>
            <p className="text-sm text-slate-500 mt-1">Please wait while we establish your session.</p>

            {/* Custom progress bar */}
            <div className="w-full max-w-xs bg-slate-200 rounded-full h-1.5 mt-8 overflow-hidden">
              <div 
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            <span className="text-xs font-mono text-emerald-600 mt-3 animate-pulse inline-block h-4">
              {statusText}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
