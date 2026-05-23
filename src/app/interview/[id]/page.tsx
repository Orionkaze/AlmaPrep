"use client"

import { GlowButton } from "@/components/ui/glow-button"
import Link from "next/link"
import { useState, useRef, useEffect, use } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faMicrophone, faMicrophoneSlash } from "@fortawesome/free-solid-svg-icons"
import {
  getNextQuestion,
  generateFeedback,
  createInterviewSession,
  saveInterviewMessage,
  saveInterviewFeedback,
} from "@/app/actions/interview"

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
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isAiTyping, setIsAiTyping] = useState(true)
  const [dbSessionId, setDbSessionId] = useState<string | null>(null)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Webcam & Voice states
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)

  // Initialize webcam
  useEffect(() => {
    let stream: MediaStream | null = null;
    const initWebcam = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch (err) {
        console.error("Failed to access webcam:", err)
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

      recognition.onresult = (event: any) => {
        let finalTranscript = ""
        let interimTranscript = ""

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript
          } else {
            interimTranscript += event.results[i][0].transcript
          }
        }
        
        if (finalTranscript) {
          setInput((prev) => prev ? `${prev} ${finalTranscript}` : finalTranscript)
        }
      }

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error)
        setIsListening(false)
      }
      
      recognition.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current = recognition
    }
  }, [])

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Voice input is not supported in this browser. Please try Chrome or Edge.")
      return
    }

    try {
      if (isListening) {
        recognitionRef.current.stop()
      } else {
        recognitionRef.current.start()
        setIsListening(true)
      }
    } catch (err) {
      console.error("Failed to toggle listening:", err)
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
    let active = true

    const initInterview = async () => {
      setIsAiTyping(true)
      
      // 1. Create a session ID in DB if user is authenticated
      const sessionId = await createInterviewSession(category, useResume)
      if (!active) return

      if (sessionId) {
        setDbSessionId(sessionId)
      }

      // 2. Fetch introductory question from Gemini
      const firstQuestion = await getNextQuestion(category, [], useResume, selectedPersona)
      if (!active) return

      // Speak first question
      speak(firstQuestion)

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
  }, [category, useResume])

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
    const nextQuestion = await getNextQuestion(category, history, useResume, selectedPersona)

    // Speak next question
    if (!nextQuestion.toLowerCase().includes("feedback") && !nextQuestion.toLowerCase().includes("analyze") && (questionIndex + 1) < 5) {
      speak(nextQuestion)
    }


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

      {/* Webcam Background Overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-20 flex items-center justify-center overflow-hidden">
        <video 
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="min-w-full min-h-full object-cover blur-sm"
        />
      </div>

      {/* Picture-in-Picture Webcam */}
      <div className="fixed top-24 right-6 z-20 w-32 h-40 md:w-48 md:h-60 rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black/50 backdrop-blur-md">
        <video 
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        {selectedPersona === "roast" && (
          <div className="absolute top-2 right-2 bg-red-500/80 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            ROAST MODE
          </div>
        )}
      </div>

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
              <div className="relative flex-1">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder={isAiTyping ? "AI Interviewer is preparing..." : "Type your answer..."}
                  disabled={isAiTyping}
                  className="w-full h-12 rounded-xl pl-5 pr-12 text-sm bg-input border border-border focus:border-ring focus:ring-1 focus:ring-ring/30 outline-none transition-all placeholder:text-foreground/30 disabled:opacity-50"
                />
                <button 
                  onClick={toggleListening}
                  disabled={isAiTyping}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 size-8 flex items-center justify-center rounded-lg transition-colors ${
                    isListening ? "bg-red-500/20 text-red-500" : "text-foreground/40 hover:bg-white/5 hover:text-foreground"
                  }`}
                  title={isListening ? "Stop listening" : "Start Voice Input"}
                >
                  <FontAwesomeIcon icon={isListening ? faMicrophoneSlash : faMicrophone} />
                </button>
              </div>
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
