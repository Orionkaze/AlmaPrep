"use client"

import { GlowButton } from "@/components/ui/glow-button"
import Link from "next/link"
import { useState, useRef, useEffect, use } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faMicrophone, faMicrophoneSlash, faPhoneSlash, faMessage, faPaperPlane, faXmark, faVideoSlash } from "@fortawesome/free-solid-svg-icons"
import {
  getNextQuestion,
  generateFeedback,
  createInterviewSession,
  saveInterviewMessage,
  saveInterviewFeedback,
  analyzeAnswerQuality,
  generateBehavioralReport,
  saveBehavioralReport,
  analyzeAnswerSpeaking,
  generateSessionSpeakingSummary,
  saveProctoringLog,
} from "@/app/actions/interview"
import { parseSpeakingMetrics } from "@/lib/speakingParser"
import BehavioralAnalysis from "@/components/BehavioralAnalysis"
import RealTimeHint from "@/components/RealTimeHint"
import ProctoringMonitor, { ViolationRecord } from "@/components/ProctoringMonitor"
import { faShieldHalved } from "@fortawesome/free-solid-svg-icons"
import { useRouter } from "next/navigation"

// SpeechRecognition type declarations for TS
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface Message {
  id: string
  role: "user" | "ai"
  content: string
}

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

export default function InterviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ resume?: string; persona?: string }>
}) {
  const { id } = use(params)
  const { resume, persona } = use(searchParams)
  const useResume = resume === "true"
  const selectedPersona = typeof persona === "string" ? persona : "supportive"
  const category = id || "mixed"
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isAiTyping, setIsAiTyping] = useState(true)
  const [dbSessionId, setDbSessionId] = useState<string | null>(null)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Proctoring States
  const [isStarted, setIsStarted] = useState(false)
  const [faceCount, setFaceCount] = useState(1)
  const [violations, setViolations] = useState<ViolationRecord[]>([])
  const [violationsCount, setViolationsCount] = useState(0)

  // Webcam & Voice states
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)

  const [cameraError, setCameraError] = useState<string | null>(null)

  // Behavioral Analysis states
  const [answerScores, setAnswerScores] = useState<any[]>([])
  const [physicalMetrics, setPhysicalMetrics] = useState<any[]>([])
  const [speakingScores, setSpeakingScores] = useState<any[]>([])
  const [realTimeHints, setRealTimeHints] = useState<string[]>([])
  const [showHint, setShowHint] = useState(false)
  const [isBehavioralActive, setIsBehavioralActive] = useState(false)
  const pendingAnalysesRef = useRef<Promise<any>[]>([])
  const pendingSpeakingAnalysesRef = useRef<Promise<any>[]>([])

  // Initialize webcam
  useEffect(() => {
    let stream: MediaStream | null = null;
    const initWebcam = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setCameraError("Camera API not supported in this browser.")
          return
        }
        stream = await navigator.mediaDevices.getUserMedia({ video: true })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
        setCameraError(null)
      } catch (err: any) {
        console.error("Failed to access webcam:", err)
        if (err.name === 'NotAllowedError') setCameraError("Camera permission denied.")
        else if (err.name === 'NotFoundError') setCameraError("No camera found.")
        else if (err.name === 'NotReadableError') setCameraError("Camera is in use by another app.")
        else setCameraError(err.message || "Failed to start camera.")
      }
    }
    initWebcam()
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = "en-US"

      recognition.onresult = (event: any) => {
        let newTranscript = ""
        for (let i = 0; i < event.results.length; ++i) {
          newTranscript += event.results[i][0].transcript
        }
        
        setInput(newTranscript)
      }

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error)
        if (event.error !== "no-speech") {
          setInput(`[Mic Error: ${event.error}]`)
        }
        setIsListening(false)
      }
      
      recognition.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current = recognition
    }
  }, [])

  const toggleListening = async () => {
    if (!recognitionRef.current) {
      alert("Voice input is not supported in this browser. Please try Chrome or Edge.")
      return
    }

    try {
      if (isListening) {
        recognitionRef.current.stop()
        setIsListening(false)
      } else {
        setInput("") // Clear input before speaking
        recognitionRef.current.start()
        setIsListening(true)
      }
    } catch (err) {
      console.error("Failed to toggle listening:", err)
      alert("Microphone access was denied or failed. Please ensure you have allowed microphone permissions in your browser settings.")
      setIsListening(false)
    }
  }

  const speak = (text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      
      // Some browsers require voices to be loaded, or a slight delay
      setTimeout(() => {
        window.speechSynthesis.speak(utterance)
      }, 50)
    }
  }

  // Start the interview session and get the first question
  useEffect(() => {
    if (!isStarted) return
    let active = true

    const initInterview = async () => {
      setIsAiTyping(true)
      
      // 1. Create a session ID in DB if user is authenticated
      const sessionId = await createInterviewSession(category, useResume)
      if (!active) return

      if (sessionId) {
        setDbSessionId(sessionId)
      }

      // 2. Fetch introductory question from fallback chain
      const { question: firstQuestion, source } = await getNextQuestion(category, [], useResume, selectedPersona)
      if (!active) return

      // Speak first question
      speak(firstQuestion)

      // 3. Save to database if session exists
      if (sessionId) {
        await saveInterviewMessage(sessionId, "ai", firstQuestion, source)
      }

      setMessages([{
        id: `ai-${Date.now()}`,
        role: "ai",
        content: firstQuestion,
      }])
      setQuestionIndex(1)
      setIsAiTyping(false)
    }

    initInterview()

    return () => {
      active = false
    }
  }, [category, useResume, isStarted])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isAiTyping || isComplete) return

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }

    const userText = input.trim()
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: userText,
    }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setIsAiTyping(true)

    // 1. Save user answer to DB if session exists
    if (dbSessionId) {
      await saveInterviewMessage(dbSessionId, "user", userText)
    }

    // Run Pipeline 1 Answer Quality Analysis (asynchronously, non-blocking)
    const lastQuestion = messages[messages.length - 1]?.content || "Please introduce yourself."
    const analysisPromise = analyzeAnswerQuality(lastQuestion, userText).then((analysis) => {
      if (analysis) {
        setAnswerScores((prev) => [...prev, analysis])
        // Show real-time hints based on physical metrics + answer quality
        const recentPhysical = physicalMetrics[physicalMetrics.length - 1]
        const newHints = [...analysis.hints]
        if (recentPhysical) {
          if (recentPhysical.eye_contact_percent < 70) {
            newHints.push("Try to look directly at the camera more often.")
          }
          if (recentPhysical.posture_stability_score < 70) {
            newHints.push("Sit upright and maintain a steady posture.")
          }
          if (recentPhysical.fidgeting_count > 5) {
            newHints.push("Try to minimize hand movements.")
          }
        }
        setRealTimeHints(newHints.slice(0, 2))
        setShowHint(true)
      }
      return analysis
    }).catch(err => {
      console.error("Error analyzing answer quality:", err)
      return null
    })
    pendingAnalysesRef.current.push(analysisPromise)

    // Run Pipeline 1 Speaking Analysis (asynchronously, non-blocking)
    const speakingMetrics = parseSpeakingMetrics(userText)
    const speakingPromise = analyzeAnswerSpeaking(lastQuestion, userText, speakingMetrics).then((feedback) => {
      const result = {
        metrics: speakingMetrics,
        feedback: feedback
      }
      setSpeakingScores((prev) => [...prev, result])
      return result
    }).catch(err => {
      console.error("Error in speaking analysis:", err)
      return null
    })
    pendingSpeakingAnalysesRef.current.push(speakingPromise)

    // 2. Build history for Gemini
    const history: { role: "user" | "ai"; content: string }[] = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }))

    // 3. Generate follow-up question
    const { question: nextQuestion, source: nextSource } = await getNextQuestion(category, history, useResume, selectedPersona)

    // Speak next question (including the final salutation)
    speak(nextQuestion)

    // 4. Save AI question to DB if session exists
    if (dbSessionId) {
      await saveInterviewMessage(dbSessionId, "ai", nextQuestion, nextSource)
    }

    const aiMsg: Message = {
      id: `ai-${Date.now()}`,
      role: "ai",
      content: nextQuestion,
    }
    setMessages(prev => [...prev, aiMsg])
    
    const nextIndex = questionIndex + 1
    setQuestionIndex(nextIndex)

    // 5. Wrap up if 10 questions have been asked or conclusion is reached
    const isConclusion = nextQuestion.toLowerCase().includes("feedback") || 
                         nextQuestion.toLowerCase().includes("analyze") ||
                         nextIndex >= 10

    if (isConclusion) {
      setIsComplete(true)
      setIsAiTyping(true) // Keep typing visible while generating report
      
      const finalHistory: { role: "user" | "ai"; content: string }[] = [
        ...history,
        { role: "ai", content: nextQuestion }
      ]
      const feedback = await generateFeedback(category, finalHistory)
      
      // Save feedback report to DB if session exists
      if (dbSessionId) {
        await saveInterviewFeedback(
          dbSessionId,
          feedback.score,
          feedback.summary,
          feedback.improvements,
          feedback.strengths,
          feedback.studyGuide
        )
      }

      // Save to localStorage for client-side routing reading fallback
      const storageKey = `feedback-${dbSessionId || category}`
      localStorage.setItem(storageKey, JSON.stringify(feedback))

      // Wait for all pending answer quality analyses to complete
      const resolvedScores = await Promise.all(pendingAnalysesRef.current)
      const validScores = resolvedScores.filter(Boolean)

      // Generate final behavioral report
      const behavioralReportText = await generateBehavioralReport(validScores, physicalMetrics)

      // Wait for all pending speaking analyses to complete
      const resolvedSpeaking = await Promise.all(pendingSpeakingAnalysesRef.current)
      const validSpeaking = resolvedSpeaking.filter(Boolean)

      // Aggregate all speaking metrics
      let totalFillerCount = 0
      const fillerFreq: Record<string, number> = {}
      let totalWords = 0
      let totalSentences = 0
      let totalHesitations = 0
      const overusedWordsFreq: Record<string, number> = {}

      validSpeaking.forEach((item: any) => {
        const m = item.metrics
        totalFillerCount += m.fillerCount
        
        Object.entries(m.fillerWords).forEach(([word, count]) => {
          fillerFreq[word] = (fillerFreq[word] || 0) + (count as number)
        })

        totalWords += m.wordCount
        const sentenceCount = m.avgWordsPerSentence > 0 ? Math.round(m.wordCount / m.avgWordsPerSentence) : 1
        totalSentences += sentenceCount

        Object.values(m.hesitationPhrases).forEach((count) => {
          totalHesitations += count as number
        })

        m.overusedWords.forEach((word: string) => {
          overusedWordsFreq[word] = (overusedWordsFreq[word] || 0) + 1
        })
      })

      const mostUsedFillers = Object.entries(fillerFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([w]) => w)

      const avgSentenceComplexity = totalSentences > 0 ? Math.round(totalWords / totalSentences) : 15

      const avgHesitations = validSpeaking.length > 0 ? totalHesitations / validSpeaking.length : 0
      let hesitationScore: "Low" | "Medium" | "High" = "Low"
      if (avgHesitations > 3) hesitationScore = "High"
      else if (avgHesitations > 1) hesitationScore = "Medium"

      const mostOverusedWords = Object.entries(overusedWordsFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([w]) => w)

      const aggregatedSpeaking = {
        totalFillerCount,
        mostUsedFillers,
        avgSentenceComplexity,
        mostOverusedWords,
        hesitationScore
      }

      const speakingSummaryText = await generateSessionSpeakingSummary(aggregatedSpeaking)

      const speakingAnalysisData = {
        answerMetrics: validSpeaking,
        sessionSummary: {
          metrics: aggregatedSpeaking,
          summary: speakingSummaryText
        }
      }

      // Save behavioral report + speaking report to Supabase
      if (dbSessionId) {
        await saveBehavioralReport(
          dbSessionId,
          validScores,
          physicalMetrics,
          behavioralReportText,
          speakingAnalysisData
        )
      }

      // Save proctoring summary log
      const proctoringLog = {
        violations,
        totalCount: violationsCount,
        isFlagged: violationsCount >= 3,
        terminatedEarly: false
      }
      if (dbSessionId) {
        await saveProctoringLog(dbSessionId, proctoringLog)
      }
      const proctoringStorageKey = `proctoring-${dbSessionId || category}`
      localStorage.setItem(proctoringStorageKey, JSON.stringify(proctoringLog))

      // Save behavioral report to localStorage for client fallback
      const behavioralStorageKey = `behavioral-${dbSessionId || category}`
      localStorage.setItem(behavioralStorageKey, JSON.stringify({
        answerScores: validScores,
        physicalMetrics,
        finalReport: behavioralReportText,
        speakingAnalysis: speakingAnalysisData
      }))

      setIsAiTyping(false)
    } else {
      setIsAiTyping(false)
    }
  }

  // Handle proctoring termination
  const handleAutoTerminate = async () => {
    setIsComplete(true)
    setIsAiTyping(false)

    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (e) {
        console.warn(e)
      }
      setIsListening(false)
    }

    const proctoringLog = {
      violations,
      totalCount: violationsCount,
      isFlagged: true,
      terminatedEarly: true
    }

    if (dbSessionId) {
      await saveProctoringLog(dbSessionId, proctoringLog)
    }

    const proctoringStorageKey = `proctoring-${dbSessionId || category}`
    localStorage.setItem(proctoringStorageKey, JSON.stringify(proctoringLog))

    // Re-exit fullscreen cleanly
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen()
      } catch (err) {
        console.warn("Fullscreen exit error:", err)
      }
    }

    router.push(`/interview/${dbSessionId || category}/feedback?terminated=true`)
  }

  if (!isStarted) {
    return (
      <main className="min-h-screen bg-[#062b22] flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
        <GlassCard className="max-w-md w-full border border-emerald-500/10 p-8 rounded-3xl relative overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.05)] text-center">
          <div className="size-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto mb-5">
            <FontAwesomeIcon icon={faShieldHalved} className="size-8" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Proctoring Enforced Session</h2>
          <p className="text-sm text-foreground/75 leading-relaxed mb-6 font-sans">
            To ensure fairness, this interview session is monitored. By continuing, you agree to comply with the proctoring rules.
          </p>
          <div className="text-left text-xs bg-white/5 border border-white/5 p-4 rounded-xl space-y-2.5 text-white/70 font-medium mb-8">
            <div className="flex gap-2">
              <span className="text-emerald-400">✓</span>
              <span>Fullscreen mode is enforced at all times.</span>
            </div>
            <div className="flex gap-2">
              <span className="text-emerald-400">✓</span>
              <span>Leaving the page or switching tabs counts as a violation.</span>
            </div>
            <div className="flex gap-2">
              <span className="text-emerald-400">✓</span>
              <span>Clipboard actions (copy, cut, paste) are blocked.</span>
            </div>
            <div className="flex gap-2">
              <span className="text-emerald-400">✓</span>
              <span>Your webcam is used to detect presence. Avoid other people entering the frame.</span>
            </div>
            <div className="text-[10px] text-amber-400/80 font-bold border-t border-white/5 pt-2 mt-2">
              ⚠️ Exceeding 5 total warnings will automatically terminate the session.
            </div>
          </div>
          <GlowButton
            onClick={async () => {
              try {
                if (document.documentElement.requestFullscreen) {
                  await document.documentElement.requestFullscreen()
                }
              } catch (err) {
                console.warn("Fullscreen request blocked:", err)
              }
              setIsStarted(true)
            }}
            className="w-full h-12 text-sm font-semibold"
          >
            Start Interview & Enter Fullscreen
          </GlowButton>
        </GlassCard>
      </main>
    )
  }

  return (
    <main className="h-screen bg-[#062b22] flex flex-col font-sans overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between px-6 py-4 text-white">
        <h1 className="text-lg font-medium">{getCategoryLabel(category)}</h1>
        <div className="flex items-center gap-4">
          {isBehavioralActive && (
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-full text-xs text-emerald-400 font-medium animate-pulse">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              <span>Behavioral Tracking Active</span>
            </div>
          )}
          {isStarted && (
            <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/25 px-2.5 py-1 rounded-full text-xs text-rose-400 font-medium">
              <FontAwesomeIcon icon={faShieldHalved} className="size-3" />
              <span>{violationsCount}/5 Warnings</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className={`size-2 rounded-full ${isComplete ? "bg-amber-400" : "bg-green-400"} animate-pulse`} />
            <span className="text-sm">{isComplete ? "Session Complete" : "Live"}</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden px-4 pb-4 gap-4">
        
        {/* Video Grid */}
        <div className="flex-1 flex flex-col md:flex-row gap-4 h-full">
          {/* AI Interviewer Tile */}
          <div className="flex-1 bg-[#0a3a2f] rounded-xl relative overflow-hidden flex items-center justify-center border border-emerald-500/10 shadow-lg">
            <div className={`size-32 md:size-48 rounded-full bg-primary/20 flex items-center justify-center border-4 ${isAiTyping ? 'border-primary/50 animate-pulse' : 'border-transparent'}`}>
              <span className="text-4xl md:text-6xl font-semibold text-primary">AI</span>
            </div>
            <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1 rounded-md flex items-center gap-2">
              <div className={`size-1.5 rounded-full ${isAiTyping ? 'bg-primary animate-pulse' : 'bg-green-400'}`} />
              <span className="text-white text-sm font-medium">Interviewer</span>
            </div>
            {selectedPersona === "roast" && (
              <div className="absolute top-4 right-4 bg-red-500/80 backdrop-blur text-white text-xs font-bold px-2 py-1 rounded-md shadow-lg">
                ROAST MODE
              </div>
            )}
          </div>

          {/* User Webcam Tile */}
          <div className="flex-1 bg-[#0a3a2f] rounded-xl relative overflow-hidden border border-emerald-500/10 shadow-lg flex items-center justify-center">
            {cameraError ? (
              <div className="text-center p-6 text-white/80">
                <FontAwesomeIcon icon={faVideoSlash} className="text-3xl mb-3 text-red-400" />
                <p className="text-sm font-medium">{cameraError}</p>
              </div>
            ) : (
              <video 
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
                style={{ transform: "scaleX(-1)" }}
              />
            )}
            <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1 rounded-md flex items-center gap-2">
              <FontAwesomeIcon icon={isListening ? faMicrophone : faMicrophoneSlash} className={`text-xs ${isListening ? 'text-green-400' : 'text-red-500'}`} />
              <span className="text-white text-sm font-medium">You</span>
            </div>
          </div>
        </div>

        {/* Chat Side Panel */}
        {isChatOpen && (
          <div className="w-full md:w-[360px] bg-[#0a3a2f]/80 border border-emerald-500/10 rounded-xl flex flex-col overflow-hidden backdrop-blur-sm">
            <div className="px-4 py-3 border-b border-emerald-500/10 bg-[#0a3a2f] font-medium text-white flex justify-between items-center">
              <span>Transcript</span>
              <button onClick={() => setIsChatOpen(false)} className="text-white/50 hover:text-white transition-colors">
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
            
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <span className="text-[10px] text-white/50 mb-1 ml-1">{msg.role === "ai" ? "Interviewer" : "You"}</span>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    msg.role === "user" 
                      ? "bg-primary text-white rounded-br-sm" 
                      : "bg-[#134e40] text-white/90 rounded-bl-sm"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isAiTyping && (
                <div className="flex flex-col items-start">
                  <span className="text-[10px] text-white/50 mb-1 ml-1">Interviewer</span>
                  <div className="bg-[#134e40] rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5">
                    <span className="size-1.5 rounded-full bg-white/50 animate-bounce" />
                    <span className="size-1.5 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="size-1.5 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-3 bg-[#0a3a2f]/40 border-t border-emerald-500/10">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder={isAiTyping ? "Waiting..." : "Type a message"}
                  disabled={isAiTyping || isComplete}
                  className="w-full bg-[#134e40] text-sm text-white placeholder-white/40 rounded-full pl-4 pr-10 py-2.5 outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isAiTyping || isComplete}
                  className="absolute right-2 text-primary hover:text-primary/80 disabled:opacity-50 disabled:hover:text-primary transition-colors size-8 flex items-center justify-center"
                >
                  <FontAwesomeIcon icon={faPaperPlane} size="sm" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Control Bar */}
      <div className="h-20 flex items-center justify-center gap-4 bg-[#062b22] border-t border-emerald-500/10 pb-2">
        <button 
          onClick={toggleListening}
          disabled={isAiTyping || isComplete}
          className={`size-12 rounded-full flex items-center justify-center transition-all ${
            isListening 
              ? "bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.5)]" 
              : "bg-[#0a3a2f] text-white hover:bg-[#134e40] border border-emerald-500/10"
          }`}
          title={isListening ? "Turn off microphone" : "Turn on microphone"}
        >
          <FontAwesomeIcon icon={isListening ? faMicrophone : faMicrophoneSlash} />
        </button>

        <button 
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`size-12 rounded-full flex items-center justify-center transition-all ${
            isChatOpen ? "bg-primary text-white shadow-primary/50" : "bg-[#0a3a2f] text-white hover:bg-[#134e40] border border-emerald-500/10"
          }`}
          title="Toggle Chat"
        >
          <FontAwesomeIcon icon={faMessage} />
        </button>

        {isComplete ? (
          <Link href={`/interview/${dbSessionId || category}/feedback`}>
            <button className="h-12 px-6 rounded-full bg-primary text-white font-medium hover:bg-primary/90 transition-colors shadow-lg">
              View Feedback
            </button>
          </Link>
        ) : (
          <Link href="/dashboard">
            <button 
              className="size-12 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.3)]"
              title="Leave Interview"
            >
              <FontAwesomeIcon icon={faPhoneSlash} />
            </button>
          </Link>
        )}
      </div>

      {!isComplete && (
        <BehavioralAnalysis
          videoRef={videoRef}
          sessionId={dbSessionId || category}
          onIntervalMetrics={(metrics) => setPhysicalMetrics((prev) => [...prev, metrics])}
          onActiveStatusChange={(active) => setIsBehavioralActive(active)}
          onFaceCountChange={(count) => setFaceCount(count)}
        />
      )}

      {!isComplete && isStarted && (
        <ProctoringMonitor
          active={isStarted && !isComplete}
          faceCount={faceCount}
          onViolationLogged={(records) => setViolations(records)}
          onViolationCountChange={(count) => setViolationsCount(count)}
          onTerminate={handleAutoTerminate}
        />
      )}

      <RealTimeHint
        hints={realTimeHints}
        visible={showHint}
        onDismiss={() => setShowHint(false)}
      />
    </main>
  )
}
