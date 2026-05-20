"use client"

import { GlassCard } from "@/components/ui/glass-card"
import { GlowButton } from "@/components/ui/glow-button"
import Link from "next/link"
import { useState, useRef, useEffect, use } from "react"
import {
  getNextQuestion,
  generateFeedback,
  createInterviewSession,
  saveInterviewMessage,
  saveInterviewFeedback,
} from "@/app/actions/interview"

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

export default function InterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const category = id || "mixed"
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isAiTyping, setIsAiTyping] = useState(true)
  const [dbSessionId, setDbSessionId] = useState<string | null>(null)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Start the interview session and get the first question
  useEffect(() => {
    let active = true

    const initInterview = async () => {
      setIsAiTyping(true)
      
      // 1. Create a session ID in DB if user is authenticated
      const sessionId = await createInterviewSession(category)
      if (!active) return

      if (sessionId) {
        setDbSessionId(sessionId)
      }

      // 2. Fetch introductory question from Gemini
      const firstQuestion = await getNextQuestion(category, [])
      if (!active) return

      // 3. Save to database if session exists
      if (sessionId) {
        await saveInterviewMessage(sessionId, "ai", firstQuestion)
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
  }, [category])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isAiTyping || isComplete) return

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

    // 2. Build history for Gemini
    const history: { role: "user" | "ai"; content: string }[] = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }))

    // 3. Generate follow-up question
    const nextQuestion = await getNextQuestion(category, history)

    // 4. Save AI question to DB if session exists
    if (dbSessionId) {
      await saveInterviewMessage(dbSessionId, "ai", nextQuestion)
    }

    const aiMsg: Message = {
      id: `ai-${Date.now()}`,
      role: "ai",
      content: nextQuestion,
    }
    setMessages(prev => [...prev, aiMsg])
    
    const nextIndex = questionIndex + 1
    setQuestionIndex(nextIndex)

    // 5. Wrap up if 5 questions have been asked or conclusion is reached
    const isConclusion = nextQuestion.toLowerCase().includes("feedback") || 
                         nextQuestion.toLowerCase().includes("analyze") ||
                         nextIndex >= 5

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
        await saveInterviewFeedback(dbSessionId, feedback.score, feedback.summary, feedback.improvements)
      }

      // Save to localStorage for client-side routing reading fallback
      const storageKey = `feedback-${dbSessionId || category}`
      localStorage.setItem(storageKey, JSON.stringify(feedback))
      setIsAiTyping(false)
    } else {
      setIsAiTyping(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background decorations */}
      <div className="fixed top-0 left-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[300px] h-[300px] bg-secondary/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Top bar */}
      <div className="relative z-10 border-b border-white/5 px-6 py-4 flex items-center justify-between backdrop-blur-md bg-background/80">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-foreground/50 hover:text-foreground/80 transition-colors">
            ← Exit
          </Link>
          <div className="h-5 w-px bg-white/10" />
          <h1 className="text-sm font-semibold">{categoryLabels[category] ?? "Interview"}</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className={`size-2 rounded-full ${isComplete ? "bg-amber-400" : "bg-green-400"} animate-pulse`} />
          <span className="text-xs text-foreground/50">{isComplete ? "Session Complete" : "Live Session"}</span>
        </div>
      </div>

      {/* Messages area */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 md:px-6 py-6 max-w-4xl mx-auto w-full">
        <div className="flex flex-col gap-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] md:max-w-[70%] rounded-2xl px-5 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-gradient-to-br from-primary to-secondary text-white rounded-br-md"
                    : "glass-card rounded-bl-md"
                }`}
              >
                {msg.role === "ai" && (
                  <p className="text-xs text-primary font-semibold mb-1">AI Interviewer</p>
                )}
                {msg.content}
              </div>
            </div>
          ))}

          {/* AI typing indicator */}
          {isAiTyping && (
            <div className="flex justify-start">
              <div className="glass-card rounded-2xl rounded-bl-md px-5 py-3">
                <p className="text-xs text-primary font-semibold mb-1">AI Interviewer</p>
                <div className="flex gap-1.5 animate-pulse">
                  <span className="size-2 rounded-full bg-primary/60" />
                  <span className="size-2 rounded-full bg-primary/60" />
                  <span className="size-2 rounded-full bg-primary/60" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input bar */}
      <div className="relative z-10 border-t border-white/5 px-4 md:px-6 py-4 backdrop-blur-md bg-background/80">
        <div className="max-w-4xl mx-auto flex gap-3">
          {isComplete ? (
            <div className="w-full flex items-center justify-center gap-4">
              <p className="text-sm text-foreground/60">Interview complete!</p>
              <Link href={`/interview/${dbSessionId || category}/feedback`}>
                <GlowButton className="h-10 px-6">View Feedback →</GlowButton>
              </Link>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder={isAiTyping ? "AI Interviewer is preparing..." : "Type your answer..."}
                disabled={isAiTyping}
                className="flex-1 h-12 rounded-xl px-5 text-sm bg-input border border-border focus:border-ring focus:ring-1 focus:ring-ring/30 outline-none transition-all placeholder:text-foreground/30 disabled:opacity-50"
              />
              <GlowButton
                onClick={handleSend}
                disabled={!input.trim() || isAiTyping}
                className={`h-12 px-6 ${!input.trim() || isAiTyping ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                Send
              </GlowButton>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
