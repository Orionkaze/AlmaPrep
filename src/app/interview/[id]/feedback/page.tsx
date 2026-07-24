"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { use, useState, useEffect, useRef } from "react"
import { toast } from "sonner"
import { track, EVENTS } from "@/lib/analytics"
import { SITE_URL } from "@/lib/siteConfig"
import BadgeNotifier from "@/components/BadgeNotifier"
import { 
  Check, 
  Lightbulb, 
  BookOpen, 
  ChevronDown, 
  ChevronUp, 
  ClipboardCheck,
  UserRound,
  ShieldAlert,
  ArrowLeft,
  Share2
} from "lucide-react"
import { getFeedback, getBehavioralReport, getInterviewSession } from "@/app/actions/interview"
import BehavioralReport, { type AnswerScore, type PhysicalMetric, type SpeakingAnalysis } from "@/components/BehavioralReport"
import type { ViolationRecord } from "@/components/ProctoringMonitor"

const categoryLabels: Record<string, string> = {
  hr: "HR Interview",
  technical: "Technical Interview",
  mixed: "Mixed Interview",
}

const getCategoryLabel = (cat: string) => {
  if (categoryLabels[cat]) return categoryLabels[cat]
  return cat
    .split("-")
    .map(word => {
      if (word === "a" || word === "b") return `(${word.toUpperCase()})`
      if (word === "and") return "&"
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(" ")
}

// Demo feedback data fallback
const demoFeedback = {
  score: 82,
  summary: "You demonstrated a solid understanding of core concepts and communicated your ideas clearly. Your answers were well-structured, and you showed confidence in explaining your thought process. There's room for improvement in providing more specific examples and technical depth.",
  strengths: [
    "Clear and concise communication",
    "Good problem-solving approach",
    "Confident delivery and composure",
  ],
  improvements: [
    "Provide more specific real-world examples",
    "Dive deeper into technical explanations",
    "Structure answers using the STAR method",
    "Reduce filler words and pauses",
  ],
  breakdown: [
    { label: "Communication", score: 85, color: "bg-primary" },
    { label: "Technical Knowledge", score: 78, color: "bg-secondary" },
    { label: "Problem Solving", score: 80, color: "bg-accent" },
    { label: "Confidence", score: 88, color: "bg-green-500" },
  ],
  studyGuide: [
    {
      topic: "System Design Fundamentals",
      advice: "Review the differences between monolithic and microservice architectures. Understand when to use which pattern and be ready to discuss trade-offs."
    },
    {
      topic: "STAR Method",
      advice: "Your behavioral answers were good, but lack concrete metrics. Try using the STAR method (Situation, Task, Action, Result) and include specific numbers."
    }
  ],
  questionEvaluation: [] as { question: string; userAnswer: string; score: number; feedback: string; modelAnswer: string }[]
}

function ScoreCircle({ score }: { score: number }) {
  const radius = 60
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference
  const color = score >= 85 ? "#10b981" : score >= 70 ? "#a855f7" : "#ef4444"

  return (
    <div className="relative flex items-center justify-center">
      <svg width="148" height="148" viewBox="0 0 148 148" className="-rotate-90">
        <circle cx="74" cy="74" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/60" />
        <circle
          cx="74" cy="74" r={radius} fill="none"
          stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-[2000ms] ease-out"
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-4xl font-bold text-foreground">{score}</p>
        <p className="text-xs text-muted-foreground">out of 100</p>
      </div>
    </div>
  )
}

function ProgressBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden border border-border/20">
      <div
        className={`h-full rounded-full ${color} transition-all duration-[1500ms] ease-out`}
        style={{ width: `${score}%` }}
      />
    </div>
  )
}

const headingStyle: React.CSSProperties = {
  fontFamily: "var(--font-head), serif",
  letterSpacing: "-0.015em",
  fontWeight: 600,
}

export default function FeedbackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [feedback, setFeedback] = useState<typeof demoFeedback | null>(null)
  const [behavioralData, setBehavioralData] = useState<{
    answerScores: AnswerScore[]
    physicalMetrics: PhysicalMetric[]
    finalReport: string
    speakingAnalysis?: SpeakingAnalysis
  } | null>(null)
  const [proctoringData, setProctoringData] = useState<{
    violations: ViolationRecord[]
    totalCount: number
    isFlagged: boolean
    terminatedEarly: boolean
  } | null>(null)
  const [showStudyGuide, setShowStudyGuide] = useState(false)
  const [showQuestionAnalysis, setShowQuestionAnalysis] = useState(true)
  const [expandedQuestions, setExpandedQuestions] = useState<Record<number, boolean>>({})

  const toggleQuestionExpand = (idx: number) => {
    setExpandedQuestions(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }))
  }

  // Fire interview_completed exactly once, when the feedback first loads.
  const completedFired = useRef(false)
  useEffect(() => {
    if (feedback && !completedFired.current) {
      completedFired.current = true
      track(EVENTS.INTERVIEW_COMPLETED, {
        score: feedback.score,
        real_session: !!(id && id.length >= 36),
      })
    }
  }, [feedback, id])

  const handleShare = async () => {
    if (!feedback) return
    const url = SITE_URL
    const text = `I scored ${feedback.score}/100 on my Almaprep mock interview. Practicing for the real thing — free at ${url}`
    track(EVENTS.RESULT_SHARED, { score: feedback.score })
    // Native share sheet on mobile / supported browsers; clipboard fallback otherwise.
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "My Almaprep mock interview result", text, url })
        return
      } catch {
        // user cancelled or share failed — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Result copied — paste it anywhere to share.")
    } catch {
      toast.error("Couldn't copy automatically. Select and copy your score to share.")
    }
  }

  useEffect(() => {
    const loadFeedback = async () => {
      // 1. Try to fetch from Supabase if authenticated and id is a UUID
      if (id && id.length >= 36) {
        const dbFeedback = await getFeedback(id)
        if (dbFeedback) {
          setFeedback(dbFeedback)
        }

        const dbBehavioral = await getBehavioralReport(id)
        if (dbBehavioral) {
          setBehavioralData({
            answerScores: dbBehavioral.answer_scores || [],
            physicalMetrics: dbBehavioral.physical_metrics || [],
            finalReport: dbBehavioral.final_report || "",
            speakingAnalysis: dbBehavioral.speaking_analysis || null
          })
        }

        const sessionRecord = await getInterviewSession(id)
        if (sessionRecord && sessionRecord.proctoring_log) {
          setProctoringData(sessionRecord.proctoring_log as unknown as { violations: ViolationRecord[]; totalCount: number; isFlagged: boolean; terminatedEarly: boolean })
        }
      }

      // 2. Try to fetch from local storage
      const local = localStorage.getItem(`feedback-${id}`)
      if (local) {
        try {
          const parsed = JSON.parse(local)
          setFeedback((prev) => prev || parsed)
        } catch (e) {
          console.error("Failed to parse local feedback data:", e)
        }
      }

      const localBehavioral = localStorage.getItem(`behavioral-${id}`)
      if (localBehavioral) {
        try {
          const parsed = JSON.parse(localBehavioral)
          setBehavioralData((prev) => prev || parsed)
        } catch (e) {
          console.error("Failed to parse local behavioral data:", e)
        }
      }

      const localProctoring = localStorage.getItem(`proctoring-${id}`)
      if (localProctoring) {
        try {
          const parsed = JSON.parse(localProctoring)
          setProctoringData((prev) => prev || parsed)
        } catch (e) {
          console.error("Failed to parse local proctoring data:", e)
        }
      }

      // 3. Fallback to mock data if still null
      setFeedback((prev) => prev || demoFeedback)
      
      const isRealSession = id && id.length >= 36
      if (!isRealSession) {
        setBehavioralData((prev) => prev || {
          answerScores: [
            {
              star_score: 8,
              relevance_score: 9,
              clarity_score: 8,
              confidence_score: 8,
              hints: ["Great use of Situation and Task. Expand more on the Result next time."],
              summary: "Highly structured and clear introduction."
            },
            {
              star_score: 7,
              relevance_score: 8,
              clarity_score: 7,
              confidence_score: 7,
              hints: ["Try to explain the Action step more clearly."],
              summary: "Good technical overview but lacked structure."
            }
          ],
          physicalMetrics: [
            {
              interval_index: 0,
              eye_contact_percent: 85,
              posture_stability_score: 90,
              facial_engagement: "neutral" as const,
              fidgeting_count: 2
            },
            {
              interval_index: 1,
              eye_contact_percent: 75,
              posture_stability_score: 85,
              facial_engagement: "nodding" as const,
              fidgeting_count: 4
            }
          ],
          finalReport: "You showed strong composure and excellent eye contact overall. You utilized the STAR method well in your introductory answers but showed minor hesitation during technical questions. Posture remained steady, but slight fidgeting was detected towards the end of the session. Focus on breathing and structuring your technical answers as clearly as your behavioral ones.",
          speakingAnalysis: {
            answerMetrics: [
              {
                metrics: {
                  wordCount: 120,
                  fillerCount: 8,
                  fillerWords: { "um": 3, "like": 4, "basically": 1 },
                  avgWordsPerSentence: 18,
                  overusedWords: ["thing", "good", "basically"],
                  hesitationPhrases: { "I think": 3, "maybe": 2 }
                },
                feedback: "You used filler words 8 times — try replacing 'like' with a brief pause. Your average sentence length of 18 words was very clear and digestible. You repeated 'basically' and 'good' a few times; try varying your vocabulary."
              },
              {
                metrics: {
                  wordCount: 85,
                  fillerCount: 4,
                  fillerWords: { "uh": 2, "right": 2 },
                  avgWordsPerSentence: 14,
                  overusedWords: ["system", "process"],
                  hesitationPhrases: { "I guess": 1 }
                },
                feedback: "Solid pacing. You minimized fillers well, using only 4. Sentence structure was concise. Keep up this structured delivery and minimize hesitation phrases."
              }
            ],
            sessionSummary: {
              metrics: {
                totalFillerCount: 12,
                mostUsedFillers: ["like", "um", "right"],
                avgSentenceComplexity: 16,
                mostOverusedWords: ["basically", "thing"],
                hesitationScore: "Medium"
              },
              summary: "Overall, your pacing was solid, but you relied on filler words (especially 'like' and 'um') throughout the session. Try to slow down slightly and pause intentionally rather than using fillers. Pacing and sentence lengths are clear."
            }
          }
        })

        setProctoringData((prev) => prev || {
          violations: [
            { type: "tab_switch" as const, timestamp: new Date().toISOString(), count: 1 },
            { type: "copy_paste" as const, timestamp: new Date().toISOString(), count: 1 }
          ],
          totalCount: 2,
          isFlagged: false,
          terminatedEarly: false
        })
      }
    }

    loadFeedback()
  }, [id])

  if (!feedback) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-background">
        {/* Animated glowing orbs */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] animate-pulse pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-secondary/10 rounded-full blur-[80px] animate-[pulse_3s_infinite] pointer-events-none" />
        
        {/* Glass Loading Card */}
        <div className="z-10 bg-card border border-border p-10 rounded-2xl backdrop-blur-md shadow-2xl flex flex-col items-center justify-center w-full max-w-md relative overflow-hidden">
          {/* Shimmer sweep effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
          
          {/* Custom animated ring spinner */}
          <div className="relative size-16 mb-8 mt-2">
            <div className="absolute inset-0 border-4 border-muted rounded-full"></div>
            <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
            <div className="absolute inset-2 border-4 border-secondary rounded-full border-b-transparent animate-[spin_1.5s_linear_infinite_reverse]"></div>
          </div>
          
          <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary mb-3 animate-pulse" style={headingStyle}>
            Compiling Analysis
          </h2>
          <p className="text-sm text-muted-foreground text-center">
            Mock AI is reviewing your interview transcript and calculating your scores...
          </p>
        </div>
      </main>
    )
  }

  // Fallback category text
  const isUuid = id && id.length >= 36
  const categoryText = isUuid ? "Mock Interview" : getCategoryLabel(id)

  return (
    <main className="min-h-screen p-6 md:p-12 relative overflow-hidden bg-background text-foreground">
      {/* Background decorations */}
      <div className="fixed top-0 left-1/3 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/3 w-[400px] h-[400px] bg-secondary/5 rounded-full blur-[120px] pointer-events-none" />

      <BadgeNotifier />
      <div className="relative z-10 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 inline-flex items-center gap-1.5 font-semibold text-left">
            <ArrowLeft size={16} strokeWidth={1.75} /> Back to Dashboard
          </Link>
          <div className="text-center mt-2">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 text-foreground" style={headingStyle}>Interview Feedback</h1>
            <p className="text-muted-foreground">{categoryText} • Completed just now</p>
          </div>
        </div>

        {proctoringData && (proctoringData.terminatedEarly || proctoringData.isFlagged) && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-200 px-6 py-4 rounded-3xl mb-8 flex items-start gap-4 shadow-[0_0_20px_rgba(239,68,68,0.05)] text-left">
            <div className="size-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400 shrink-0">
              <ShieldAlert size={20} strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="font-bold text-red-400 text-sm" style={headingStyle}>
                {proctoringData.terminatedEarly ? "Session Terminated Due to Integrity Violations" : "Session Flagged with Proctoring Violations"}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                {proctoringData.terminatedEarly 
                  ? "This session was terminated early because the violation limit of 5 was exceeded. An integrity report has been saved to your session history." 
                  : "This session has been flagged due to multiple proctoring warnings (e.g. exiting fullscreen, switching tabs, or unrecognized face activity)."}
              </p>
            </div>
          </div>
        )}

        {/* Score Section */}
        <Card className="flex flex-col items-center text-center p-8 sm:p-10 shadow-sm">
          <h2 className="text-lg font-semibold text-muted-foreground mb-4" style={headingStyle}>Overall Performance</h2>
          <ScoreCircle score={feedback.score} />
          <p className="text-muted-foreground mt-6 max-w-lg text-sm leading-relaxed">{feedback.summary}</p>
          <Button
            variant="outline"
            onClick={handleShare}
            className="mt-6 h-10 px-5 cursor-pointer gap-2 text-sm font-semibold"
          >
            <Share2 size={15} strokeWidth={1.9} /> Share result
          </Button>
        </Card>

        {/* Breakdown */}
        <Card className="p-8 shadow-sm">
          <h2 className="text-lg font-semibold mb-6 text-foreground" style={headingStyle}>Score Breakdown</h2>
          <div className="flex flex-col gap-7">
            {feedback.breakdown.map((item) => (
              <div key={item.label} className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-medium">{item.label}</span>
                  <span className="font-bold text-foreground">{item.score}%</span>
                </div>
                <ProgressBar score={item.score} color={item.color} />
              </div>
            ))}
          </div>
        </Card>

        {/* Strengths & Improvements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-8 shadow-sm">
            <h2 className="text-lg font-semibold mb-5 flex items-center gap-2.5 text-foreground" style={headingStyle}>
              <span className="size-8 rounded-lg bg-green-500/20 flex items-center justify-center text-sm">
                <Check size={16} strokeWidth={1.75} className="text-green-500" />
              </span>
              Strengths
            </h2>
            <ul className="space-y-4 text-left">
              {feedback.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-3.5 text-sm text-muted-foreground leading-relaxed">
                  <span className="mt-2.5 size-2 rounded-full bg-green-500 shrink-0" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-8 shadow-sm">
            <h2 className="text-lg font-semibold mb-5 flex items-center gap-2.5 text-foreground" style={headingStyle}>
              <span className="size-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-sm">
                <Lightbulb size={16} strokeWidth={1.75} className="text-amber-500" />
              </span>
              Improvements
            </h2>
            <ul className="space-y-4 text-left">
              {feedback.improvements.map((s, i) => (
                <li key={i} className="flex items-start gap-3.5 text-sm text-muted-foreground leading-relaxed">
                  <span className="mt-2.5 size-2 rounded-full bg-amber-500 shrink-0" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Behavioral Analysis Report */}
        {behavioralData ? (
          <div className="text-left py-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="size-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <UserRound size={20} strokeWidth={1.75} />
              </div>
              <div className="text-left">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2" style={headingStyle}>
                  <span>AI Behavioral & Physical Analysis</span>
                  {!isUuid && (
                    <span className="text-[9px] uppercase tracking-wider font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-amber-400 align-middle">
                      Demo Mode
                    </span>
                  )}
                </h2>
                <p className="text-xs text-muted-foreground">Combined insights from your speech delivery and physical presence</p>
              </div>
            </div>
            <BehavioralReport
              answerScores={behavioralData.answerScores}
              physicalMetrics={behavioralData.physicalMetrics}
              finalReport={behavioralData.finalReport}
              speakingAnalysis={behavioralData.speakingAnalysis}
            />
          </div>
        ) : (
          isUuid && (
            <div className="text-left py-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="size-10 rounded-lg bg-amber-500/15 flex items-center justify-center border border-amber-500/20 text-amber-500">
                  <UserRound size={20} strokeWidth={1.75} />
                </div>
                <div className="text-left">
                  <h2 className="text-xl font-bold text-foreground" style={headingStyle}>AI Behavioral & Physical Analysis</h2>
                  <p className="text-xs text-muted-foreground">Combined insights from your speech delivery and physical presence</p>
                </div>
              </div>
              <Card className="border border-amber-500/20 bg-amber-500/5 p-8 rounded-2xl shadow-sm">
                <h4 className="text-sm font-bold text-amber-400 mb-1" style={headingStyle}>Behavioral Report Unavailable</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  The behavioral and physical metrics report is not available for this session. If this is a new session, the AI analysis might still be generating or failed to save. Please try refreshing or restarting the interview.
                </p>
              </Card>
            </div>
          )
        )}

        {/* Proctoring Summary Panel */}
        {proctoringData && (
          <Card className="p-8 text-left border border-border shadow-sm">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2 text-foreground" style={headingStyle}>
              <span className="size-8 rounded-lg bg-red-500/20 flex items-center justify-center text-sm text-red-400">
                <ShieldAlert size={16} strokeWidth={1.75} />
              </span>
              Proctoring Summary
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-muted/40 border border-border p-4 rounded-2xl flex flex-col justify-between">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-1">Status</span>
                <span className={`text-xs font-extrabold self-start px-2.5 py-0.5 rounded-full ${
                  proctoringData.isFlagged 
                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" 
                    : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                }`}>
                  {proctoringData.isFlagged ? "Flagged" : "Clean"}
                </span>
              </div>
              <div className="bg-muted/40 border border-border p-4 rounded-2xl flex flex-col">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-1">Total Warnings</span>
                <span className={`text-xl font-extrabold font-mono ${proctoringData.totalCount >= 3 ? "text-amber-400" : "text-foreground"}`}>
                  {proctoringData.totalCount} / 5
                </span>
              </div>
              <div className="bg-muted/40 border border-border p-4 rounded-2xl flex flex-col">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-1">Completed</span>
                <span className="text-xs font-extrabold text-foreground">
                  {proctoringData.terminatedEarly ? "Terminated Early ❌" : "Finished Normally ✓"}
                </span>
              </div>
            </div>

            {proctoringData.violations.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-xs uppercase font-bold text-muted-foreground tracking-wider mb-2" style={headingStyle}>Violations Log</h3>
                <div className="space-y-2">
                  {proctoringData.violations.map((v, index) => {
                    let label = "";
                    switch (v.type) {
                      case "tab_switch":
                        label = "Tab Switching / Minimize";
                        break;
                      case "copy_paste":
                        label = "Clipboard Action (Copy/Cut/Paste)";
                        break;
                      case "multiple_faces":
                        label = "Multiple Faces in Camera Frame";
                        break;
                      case "fullscreen_exit":
                        label = "Exited Fullscreen Mode";
                        break;
                      default:
                        label = v.type;
                    }
                    return (
                      <div key={index} className="flex items-center justify-between text-xs bg-muted/40 p-4 rounded-xl border border-border">
                        <span className="font-semibold text-foreground">{label}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground text-[10px] font-mono">
                            {new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                          <span className="bg-rose-500/10 text-rose-400 border border-rose-500/25 px-2.5 py-0.5 rounded font-bold">
                            {v.count} warning{v.count > 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-xs italic text-muted-foreground">
                No proctoring violations recorded. Excellent adherence to guidelines!
              </div>
            )}
          </Card>
        )}

        {/* Question-by-Question Evaluation */}
        {feedback.questionEvaluation && feedback.questionEvaluation.length > 0 && (
          <div className="space-y-4">
            <button 
              onClick={() => setShowQuestionAnalysis(!showQuestionAnalysis)}
              className="w-full flex items-center justify-between p-5 rounded-xl border border-border bg-card hover:bg-muted/40 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-secondary/20 flex items-center justify-center text-secondary">
                  <ClipboardCheck size={20} strokeWidth={1.75} />
                </div>
                <div className="text-left">
                  <h2 className="text-lg font-semibold text-foreground" style={headingStyle}>Question-by-Question Analysis</h2>
                  <p className="text-xs text-muted-foreground">Detailed evaluation of each question asked</p>
                </div>
              </div>
              {showQuestionAnalysis ? <ChevronUp size={20} strokeWidth={1.75} className="text-muted-foreground mr-2" /> : <ChevronDown size={20} strokeWidth={1.75} className="text-muted-foreground mr-2" />}
            </button>
            
            {showQuestionAnalysis && (
              <div className="space-y-4 animate-in slide-in-from-top-4 fade-in duration-300">
                {feedback.questionEvaluation.map((item, idx) => {
                  const isExpanded = !!expandedQuestions[idx]
                  const qScore = item.score
                  const scoreColor = qScore >= 85 ? "text-green-400 bg-green-500/10 border-green-500/20" : qScore >= 70 ? "text-purple-400 bg-purple-500/10 border-purple-500/20" : "text-red-400 bg-red-500/10 border-red-500/20"

                  return (
                    <Card key={idx} className="p-6 sm:p-8 border-border bg-card relative overflow-hidden text-left shadow-sm">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-4">
                        <div className="flex-1">
                          <span className="text-[10px] uppercase tracking-wider text-primary font-bold bg-primary/10 px-2.5 py-1 rounded-md mb-2 inline-block">
                            Question {idx + 1}
                          </span>
                          <h3 className="text-sm md:text-base font-bold text-foreground leading-relaxed" style={headingStyle}>
                            {item.question}
                          </h3>
                        </div>
                        <div className={`px-3 py-1 rounded-full border text-xs font-bold shrink-0 self-start ${scoreColor}`}>
                          Score: {qScore}%
                        </div>
                      </div>

                      {/* Candidate's Answer */}
                      <div className="mb-4 bg-muted/40 p-4 rounded-lg border border-border">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block mb-1">Your Answer</span>
                        <p className="text-xs md:text-sm text-muted-foreground leading-relaxed font-sans italic">
                          &ldquo;{item.userAnswer}&rdquo;
                        </p>
                      </div>

                      {/* Feedback */}
                      <div className="mb-4">
                        <span className="text-[10px] text-secondary uppercase tracking-wider font-semibold block mb-1">Feedback</span>
                        <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                          {item.feedback}
                        </p>
                      </div>

                      {/* Ideal/Model Answer (Collapsible) */}
                      {item.modelAnswer && (
                        <div className="border-t border-border pt-4 mt-4">
                          <button
                            onClick={() => toggleQuestionExpand(idx)}
                            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-semibold focus:outline-none cursor-pointer"
                          >
                            <span>{isExpanded ? "Hide" : "Show"} Model Answer & Criteria</span>
                            {isExpanded ? <ChevronUp size={12} strokeWidth={1.75} /> : <ChevronDown size={12} strokeWidth={1.75} />}
                          </button>
                          
                          {isExpanded && (
                            <div className="mt-3 bg-primary/5 border border-primary/20 p-4 rounded-lg text-xs md:text-sm text-muted-foreground leading-relaxed animate-in slide-in-from-top-2 duration-200">
                              <span className="text-[10px] text-primary uppercase tracking-wider font-bold block mb-1.5">Model Answer / Looking For:</span>
                              {item.modelAnswer}
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Study Guide Section */}
        {feedback.studyGuide && feedback.studyGuide.length > 0 && (
          <div className="space-y-4">
            <button 
              onClick={() => setShowStudyGuide(!showStudyGuide)}
              className="w-full flex items-center justify-between p-5 rounded-xl border border-border bg-card hover:bg-muted/40 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                  <BookOpen size={20} strokeWidth={1.75} />
                </div>
                <div className="text-left">
                  <h2 className="text-lg font-semibold text-foreground" style={headingStyle}>Personalized Study Guide</h2>
                  <p className="text-xs text-muted-foreground">Actionable advice based on your weaknesses</p>
                </div>
              </div>
              {showStudyGuide ? <ChevronUp size={20} strokeWidth={1.75} className="text-muted-foreground mr-2" /> : <ChevronDown size={20} strokeWidth={1.75} className="text-muted-foreground mr-2" />}
            </button>
            
            {showStudyGuide && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-4 fade-in duration-300">
                {feedback.studyGuide.map((item, idx) => (
                  <Card key={idx} className="border-primary/20 bg-primary/5 p-6 sm:p-8 text-left shadow-sm animate-in fade-in duration-200">
                    <h3 className="font-semibold text-primary mb-2 flex items-center gap-2" style={headingStyle}>
                      <span className="size-5 rounded-full bg-primary/20 flex items-center justify-center text-xs">{idx + 1}</span>
                      {item.topic}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.advice}</p>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link href="/interview/setup">
            <Button className="h-12 px-10 cursor-pointer" variant="default">Start Another Interview</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" className="h-12 px-10 cursor-pointer text-muted-foreground hover:text-foreground">
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </main>
  )
}
