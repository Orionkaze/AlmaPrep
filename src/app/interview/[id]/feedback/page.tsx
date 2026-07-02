"use client"

import { GlassCard } from "@/components/ui/glass-card"
import { GlowButton } from "@/components/ui/glow-button"
import Link from "next/link"
import { use, useState, useEffect } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faCheck, faLightbulb, faBookOpen, faChevronDown, faChevronUp, faClipboardCheck, faUserTie } from "@fortawesome/free-solid-svg-icons"
import { getFeedback, getBehavioralReport } from "@/app/actions/interview"
import BehavioralReport from "@/components/BehavioralReport"

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
  const color = score >= 85 ? "#22c55e" : score >= 70 ? "#A855F7" : "#ef4444"

  return (
    <div className="relative flex items-center justify-center">
      <svg width="148" height="148" viewBox="0 0 148 148" className="-rotate-90">
        <circle cx="74" cy="74" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
        <circle
          cx="74" cy="74" r={radius} fill="none"
          stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-[2000ms] ease-out"
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-4xl font-bold">{score}</p>
        <p className="text-xs text-foreground/50">out of 100</p>
      </div>
    </div>
  )
}

function ProgressBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
      <div
        className={`h-full rounded-full ${color} transition-all duration-[1500ms] ease-out`}
        style={{ width: `${score}%` }}
      />
    </div>
  )
}

export default function FeedbackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [feedback, setFeedback] = useState<typeof demoFeedback | null>(null)
  const [behavioralData, setBehavioralData] = useState<{
    answerScores: any[]
    physicalMetrics: any[]
    finalReport: string
    speakingAnalysis?: any
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
      }
    }

    loadFeedback()
  }, [id])

  if (!feedback) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-[#0A0A0A]">
        {/* Animated glowing orbs */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-pulse pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-secondary/20 rounded-full blur-[80px] animate-[pulse_3s_infinite] pointer-events-none" />
        
        {/* Glass Loading Card */}
        <div className="z-10 bg-white/5 border border-white/10 p-10 rounded-2xl backdrop-blur-md shadow-2xl flex flex-col items-center justify-center w-full max-w-md relative overflow-hidden">
          {/* Shimmer sweep effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
          
          {/* Custom animated ring spinner */}
          <div className="relative size-16 mb-8 mt-2">
            <div className="absolute inset-0 border-4 border-white/10 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
            <div className="absolute inset-2 border-4 border-secondary rounded-full border-b-transparent animate-[spin_1.5s_linear_infinite_reverse]"></div>
          </div>
          
          <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary mb-3 animate-pulse">
            Compiling Analysis
          </h2>
          <p className="text-sm text-foreground/60 text-center">
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
    <main className="min-h-screen p-6 md:p-12 relative overflow-hidden">
      {/* Background decorations */}
      <div className="fixed top-0 left-1/3 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/3 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <Link href="/dashboard" className="text-sm text-foreground/50 hover:text-foreground/80 transition-colors mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Interview Feedback</h1>
          <p className="text-foreground/60">{categoryText} • Completed just now</p>
        </div>

        {/* Score Section */}
        <GlassCard className="flex flex-col items-center text-center mb-6 py-10">
          <h2 className="text-lg font-semibold text-foreground/70 mb-4">Overall Performance</h2>
          <ScoreCircle score={feedback.score} />
          <p className="text-foreground/70 mt-6 max-w-lg text-sm leading-relaxed">{feedback.summary}</p>
        </GlassCard>

        {/* Breakdown */}
        <GlassCard className="mb-6">
          <h2 className="text-lg font-semibold mb-5">Score Breakdown</h2>
          <div className="flex flex-col gap-5">
            {feedback.breakdown.map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-foreground/80">{item.label}</span>
                  <span className="font-semibold">{item.score}%</span>
                </div>
                <ProgressBar score={item.score} color={item.color} />
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Strengths & Improvements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <GlassCard>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="size-8 rounded-lg bg-green-500/20 flex items-center justify-center text-sm">
                <FontAwesomeIcon icon={faCheck} className="text-green-500" />
              </span>
              Strengths
            </h2>
            <ul className="flex flex-col gap-3">
              {feedback.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-foreground/80">
                  <span className="mt-0.5 size-1.5 rounded-full bg-green-400 shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </GlassCard>
          <GlassCard>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="size-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-sm">
                <FontAwesomeIcon icon={faLightbulb} className="text-amber-500" />
              </span>
              Improvements
            </h2>
            <ul className="flex flex-col gap-3">
              {feedback.improvements.map((s, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-foreground/80">
                  <span className="mt-0.5 size-1.5 rounded-full bg-amber-400 shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </GlassCard>
        </div>

        {/* Behavioral Analysis Report */}
        {behavioralData ? (
          <div className="mb-10 text-left">
            <div className="flex items-center gap-3 mb-6">
              <div className="size-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <FontAwesomeIcon icon={faUserTie} className="text-emerald-400" />
              </div>
              <div className="text-left">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>AI Behavioral & Physical Analysis</span>
                  {!isUuid && (
                    <span className="text-[9px] uppercase tracking-wider font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-amber-400 align-middle">
                      Demo Mode
                    </span>
                  )}
                </h2>
                <p className="text-xs text-foreground/60">Combined insights from your speech delivery and physical presence</p>
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
            <div className="mb-10 text-left">
              <div className="flex items-center gap-3 mb-4">
                <div className="size-10 rounded-lg bg-amber-500/15 flex items-center justify-center border border-amber-500/20">
                  <FontAwesomeIcon icon={faUserTie} className="text-amber-500" />
                </div>
                <div className="text-left">
                  <h2 className="text-xl font-bold text-white">AI Behavioral & Physical Analysis</h2>
                  <p className="text-xs text-foreground/60">Combined insights from your speech delivery and physical presence</p>
                </div>
              </div>
              <GlassCard className="border border-amber-500/20 bg-amber-500/5 py-6 px-8 rounded-2xl">
                <h4 className="text-sm font-bold text-amber-400 mb-1">Behavioral Report Unavailable</h4>
                <p className="text-xs text-white/70 leading-relaxed">
                  The behavioral and physical metrics report is not available for this session. If this is a new session, the AI analysis might still be generating or failed to save. Please try refreshing or restarting the interview.
                </p>
              </GlassCard>
            </div>
          )
        )}

        {/* Question-by-Question Evaluation */}
        {feedback.questionEvaluation && feedback.questionEvaluation.length > 0 && (
          <div className="mb-6">
            <button 
              onClick={() => setShowQuestionAnalysis(!showQuestionAnalysis)}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-secondary/20 flex items-center justify-center">
                  <FontAwesomeIcon icon={faClipboardCheck} className="text-secondary" />
                </div>
                <div className="text-left">
                  <h2 className="text-lg font-semibold text-white">Question-by-Question Analysis</h2>
                  <p className="text-xs text-foreground/60">Detailed evaluation of each question asked</p>
                </div>
              </div>
              <FontAwesomeIcon icon={showQuestionAnalysis ? faChevronUp : faChevronDown} className="text-foreground/50 mr-2" />
            </button>
            
            {showQuestionAnalysis && (
              <div className="mt-4 flex flex-col gap-4 animate-in slide-in-from-top-4 fade-in duration-300">
                {feedback.questionEvaluation.map((item, idx) => {
                  const isExpanded = !!expandedQuestions[idx]
                  const qScore = item.score
                  const scoreColor = qScore >= 85 ? "text-green-400 bg-green-500/10 border-green-500/20" : qScore >= 70 ? "text-purple-400 bg-purple-500/10 border-purple-500/20" : "text-red-400 bg-red-500/10 border-red-500/20"

                  return (
                    <GlassCard key={idx} className="p-5 border-white/5 bg-white/2 relative overflow-hidden text-left">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-4">
                        <div className="flex-1">
                          <span className="text-[10px] uppercase tracking-wider text-primary font-bold bg-primary/10 px-2.5 py-1 rounded-md mb-2 inline-block">
                            Question {idx + 1}
                          </span>
                          <h3 className="text-sm md:text-base font-bold text-white leading-relaxed">
                            {item.question}
                          </h3>
                        </div>
                        <div className={`px-3 py-1 rounded-full border text-xs font-bold shrink-0 self-start ${scoreColor}`}>
                          Score: {qScore}%
                        </div>
                      </div>

                      {/* Candidate's Answer */}
                      <div className="mb-4 bg-white/5 p-3 rounded-lg border border-white/5">
                        <span className="text-[10px] text-foreground/45 uppercase tracking-wider font-semibold block mb-1">Your Answer</span>
                        <p className="text-xs md:text-sm text-foreground/80 leading-relaxed font-sans italic">
                          &ldquo;{item.userAnswer}&rdquo;
                        </p>
                      </div>

                      {/* Feedback */}
                      <div className="mb-4">
                        <span className="text-[10px] text-secondary uppercase tracking-wider font-semibold block mb-1">Feedback</span>
                        <p className="text-xs md:text-sm text-foreground/80 leading-relaxed">
                          {item.feedback}
                        </p>
                      </div>

                      {/* Ideal/Model Answer (Collapsible) */}
                      {item.modelAnswer && (
                        <div className="border-t border-white/5 pt-3 mt-3">
                          <button
                            onClick={() => toggleQuestionExpand(idx)}
                            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-semibold focus:outline-none cursor-pointer"
                          >
                            <span>{isExpanded ? "Hide" : "Show"} Model Answer & Criteria</span>
                            <FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} className="text-[10px]" />
                          </button>
                          
                          {isExpanded && (
                            <div className="mt-3 bg-primary/5 border border-primary/15 p-3.5 rounded-lg text-xs md:text-sm text-foreground/80 leading-relaxed animate-in slide-in-from-top-2 duration-200">
                              <span className="text-[10px] text-primary uppercase tracking-wider font-bold block mb-1.5">Model Answer / Looking For:</span>
                              {item.modelAnswer}
                            </div>
                          )}
                        </div>
                      )}
                    </GlassCard>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Study Guide Section */}
        {feedback.studyGuide && feedback.studyGuide.length > 0 && (
          <div className="mb-10">
            <button 
              onClick={() => setShowStudyGuide(!showStudyGuide)}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <FontAwesomeIcon icon={faBookOpen} className="text-primary" />
                </div>
                <div className="text-left">
                  <h2 className="text-lg font-semibold">Personalized Study Guide</h2>
                  <p className="text-xs text-foreground/60">Actionable advice based on your weaknesses</p>
                </div>
              </div>
              <FontAwesomeIcon icon={showStudyGuide ? faChevronUp : faChevronDown} className="text-foreground/50 mr-2" />
            </button>
            
            {showStudyGuide && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-4 fade-in duration-300">
                {feedback.studyGuide.map((item, idx) => (
                  <GlassCard key={idx} className="border-primary/20 bg-primary/5">
                    <h3 className="font-semibold text-primary mb-2 flex items-center gap-2">
                      <span className="size-5 rounded-full bg-primary/20 flex items-center justify-center text-xs">{idx + 1}</span>
                      {item.topic}
                    </h3>
                    <p className="text-sm text-foreground/80 leading-relaxed">{item.advice}</p>
                  </GlassCard>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/interview/setup">
            <GlowButton className="h-12 px-10 cursor-pointer">Start Another Interview</GlowButton>
          </Link>
          <Link href="/dashboard">
            <button className="h-12 px-10 rounded-lg text-sm font-semibold border border-white/10 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
              Go to Dashboard
            </button>
          </Link>
        </div>
      </div>
    </main>
  )
}
