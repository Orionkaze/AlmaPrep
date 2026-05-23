"use client"

import { useState } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faFileLines,
  faStar,
  faTasks,
  faCheckCircle,
  faExclamationTriangle,
  faArrowRight,
  faCompass,
  faLaptopCode
} from "@fortawesome/free-solid-svg-icons"
import { GlassCard } from "@/components/ui/glass-card"
import { GlowButton } from "@/components/ui/glow-button"
import { saveAndAnalyzeResume, ResumeAnalysis } from "@/app/actions/resume"

interface ResumeContentProps {
  initialResumeText: string
  initialAnalysis: ResumeAnalysis | null
}

const loadingSteps = [
  "Uploading resume context...",
  "Running Gemini AI deep parser...",
  "Mapping professional achievements...",
  "Extracting core skills & badges...",
  "Formulating mock interview recommendations..."
]

export default function ResumeContent({
  initialResumeText,
  initialAnalysis,
}: ResumeContentProps) {
  const [resumeText, setResumeText] = useState(initialResumeText)
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(initialAnalysis)
  const [isEditing, setIsEditing] = useState(!initialResumeText)
  const [loading, setLoading] = useState(false)
  const [loadingStepIdx, setLoadingStepIdx] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resumeText.trim()) return

    setLoading(true)
    setError(null)
    setLoadingStepIdx(0)

    // Progressive step interval simulation for visual polish
    const stepInterval = setInterval(() => {
      setLoadingStepIdx((prev) => {
        if (prev < loadingSteps.length - 1) {
          return prev + 1
        }
        return prev
      })
    }, 1800)

    const result = await saveAndAnalyzeResume(resumeText)

    clearInterval(stepInterval)

    if (result.success && result.data) {
      setAnalysis(result.data.analysis)
      setIsEditing(false)
    } else {
      setError(result.error || "An error occurred during analysis. Please check your Gemini API key.")
    }
    setLoading(false)
  }

  return (
    <div className="w-full">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 max-w-lg mx-auto text-center">
          <div className="relative mb-8">
            <div className="size-20 rounded-2xl bg-primary/20 flex items-center justify-center text-primary text-3xl animate-bounce">
              <FontAwesomeIcon icon={faStar} className="animate-spin duration-3000 text-secondary" />
            </div>
            <span className="absolute inset-0 size-20 rounded-2xl border-2 border-primary border-t-transparent animate-spin" />
          </div>
          <h3 className="text-xl font-bold mb-2">Analyzing Your Resume</h3>
          <p className="text-sm text-foreground/50 h-5 animate-pulse transition-all">
            {loadingSteps[loadingStepIdx]}
          </p>
          <div className="w-full max-w-xs bg-white/5 border border-white/5 rounded-full h-1.5 mt-6 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-500"
              style={{ width: `${((loadingStepIdx + 1) / loadingSteps.length) * 100}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Editor / Resume Text Input */}
          <div className={`lg:col-span-6 flex flex-col gap-4 ${!isEditing ? "opacity-90" : ""}`}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <FontAwesomeIcon icon={faFileLines} className="text-primary" />
                Resume Plain Text
              </h2>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                >
                  Edit Resume
                </button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleAnalyze} className="flex flex-col gap-4">
                <div className="relative">
                  <textarea
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    placeholder={`Paste the text version of your resume here...

Example:
John Doe
Software Engineer
Email: john@example.com

SKILLS:
JavaScript, React, Node.js, Next.js, Python, PostgreSQL

EXPERIENCE:
Software Engineer at TechCorp (2024-Present)
- Developed and optimized dashboard page, reducing bundle size by 30%
- Integrated third-party Supabase auth and customized database schemas...`}
                    required
                    className="w-full h-[450px] rounded-2xl p-5 text-sm bg-input border border-border focus:border-ring focus:ring-1 focus:ring-ring/30 outline-none transition-all placeholder:text-foreground/20 leading-relaxed font-mono resize-none"
                  />
                  <div className="absolute bottom-4 right-4 text-[10px] text-foreground/30 font-semibold bg-background/50 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/5">
                    {resumeText.length} chars
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 text-xs font-medium">
                    {error}
                  </div>
                )}

                <GlowButton type="submit" disabled={!resumeText.trim()} className="h-12 w-full cursor-pointer">
                  Save & Analyze with Gemini →
                </GlowButton>
              </form>
            ) : (
              <div className="relative group">
                <div className="w-full h-[450px] rounded-2xl p-5 text-xs bg-input/40 border border-border/50 text-foreground/50 overflow-y-auto leading-relaxed font-mono whitespace-pre-wrap">
                  {resumeText}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent pointer-events-none rounded-2xl" />
              </div>
            )}
          </div>

          {/* Right Column: AI Analysis Report */}
          <div className="lg:col-span-6 flex flex-col gap-6">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <FontAwesomeIcon icon={faStar} className="text-secondary" />
              AI Resume Review & Insights
            </h2>

            {analysis ? (
              <div className="flex flex-col gap-6">
                {/* Summary */}
                <GlassCard className="p-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/5 rounded-full blur-2xl pointer-events-none" />
                  <h3 className="text-sm font-bold text-secondary mb-2 uppercase tracking-wider">Candidate Profile</h3>
                  <p className="text-sm text-foreground/80 leading-relaxed italic">
                    &ldquo;{analysis.summary}&rdquo;
                  </p>
                </GlassCard>

                {/* Skills */}
                <GlassCard className="p-5">
                  <h3 className="text-sm font-bold text-primary mb-3 uppercase tracking-wider">Detected Skills</h3>
                  <div className="flex gap-2 flex-wrap">
                    {analysis.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="text-xs font-medium px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all cursor-default"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </GlassCard>

                {/* Highlights */}
                <GlassCard className="p-5">
                  <h3 className="text-sm font-bold text-foreground mb-3 uppercase tracking-wider flex items-center gap-2">
                    <FontAwesomeIcon icon={faCheckCircle} className="text-green-400 text-xs" />
                    Key Accomplishments
                  </h3>
                  <ul className="text-sm text-foreground/75 space-y-2.5 list-none pl-1">
                    {analysis.highlights.map((highlight, idx) => (
                      <li key={idx} className="flex gap-2.5 items-start">
                        <span className="text-primary mt-1">•</span>
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </GlassCard>

                {/* Focus Topics */}
                <GlassCard className="p-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-2xl pointer-events-none" />
                  <h3 className="text-sm font-bold text-accent mb-3 uppercase tracking-wider flex items-center gap-2">
                    <FontAwesomeIcon icon={faCompass} className="text-accent text-xs animate-pulse" />
                    Recommended Interview Topics
                  </h3>
                  <div className="flex flex-col gap-2">
                    {analysis.interviewTopics.map((topic, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-foreground/80"
                      >
                        <span className="font-medium">{topic}</span>
                        <FontAwesomeIcon icon={faArrowRight} className="text-foreground/30 text-[10px]" />
                      </div>
                    ))}
                  </div>
                </GlassCard>

                {/* Improvements */}
                <GlassCard className="p-5 border-yellow-500/10">
                  <h3 className="text-sm font-bold text-yellow-500 mb-3 uppercase tracking-wider flex items-center gap-2">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="text-yellow-500 text-xs" />
                    Suggested Resume Updates
                  </h3>
                  <ul className="text-sm text-foreground/75 space-y-2.5 list-none pl-1">
                    {analysis.improvements.map((improvement, idx) => (
                      <li key={idx} className="flex gap-2.5 items-start">
                        <span className="text-yellow-500 mt-1">•</span>
                        <span>{improvement}</span>
                      </li>
                    ))}
                  </ul>
                </GlassCard>
              </div>
            ) : (
              <GlassCard className="p-8 text-center flex flex-col items-center justify-center py-20 text-foreground/40 border-dashed border-2">
                <FontAwesomeIcon icon={faTasks} className="text-4xl text-foreground/20 mb-4" />
                <h3 className="text-base font-semibold mb-1">No Resume Analysis Yet</h3>
                <p className="text-xs text-foreground/50 max-w-sm">
                  Paste your resume details on the left and run analysis to get personalized feedback and unlock resume-based mock interviews.
                </p>
              </GlassCard>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
