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
  const [isChatOpen, setIsChatOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Webcam & Voice states
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)

  const [cameraError, setCameraError] = useState<string | null>(null)

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

    // 2. Build history for Gemini
    const history: { role: "user" | "ai"; content: string }[] = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }))

    // 3. Generate follow-up question
    const nextQuestion = await getNextQuestion(category, history, useResume, selectedPersona)

    // Speak next question (including the final salutation)
    speak(nextQuestion)

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
    <main className="h-screen bg-[#202124] flex flex-col font-sans overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between px-6 py-4 text-white">
        <h1 className="text-lg font-medium">{categoryLabels[category] ?? "Interview"}</h1>
        <div className="flex items-center gap-2">
          <div className={`size-2 rounded-full ${isComplete ? "bg-amber-400" : "bg-green-400"} animate-pulse`} />
          <span className="text-sm">{isComplete ? "Session Complete" : "Live"}</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden px-4 pb-4 gap-4">
        
        {/* Video Grid */}
        <div className="flex-1 flex flex-col md:flex-row gap-4 h-full">
          {/* AI Interviewer Tile */}
          <div className="flex-1 bg-[#3c4043] rounded-xl relative overflow-hidden flex items-center justify-center border border-white/10 shadow-lg">
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
          <div className="flex-1 bg-[#3c4043] rounded-xl relative overflow-hidden border border-white/10 shadow-lg flex items-center justify-center">
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
          <div className="w-full md:w-[360px] bg-white/5 border border-white/10 rounded-xl flex flex-col overflow-hidden backdrop-blur-sm">
            <div className="px-4 py-3 border-b border-white/10 bg-white/5 font-medium text-white flex justify-between items-center">
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
                      : "bg-[#3c4043] text-white/90 rounded-bl-sm"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isAiTyping && (
                <div className="flex flex-col items-start">
                  <span className="text-[10px] text-white/50 mb-1 ml-1">Interviewer</span>
                  <div className="bg-[#3c4043] rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5">
                    <span className="size-1.5 rounded-full bg-white/50 animate-bounce" />
                    <span className="size-1.5 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="size-1.5 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-3 bg-white/5 border-t border-white/10">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder={isAiTyping ? "Waiting..." : "Type a message"}
                  disabled={isAiTyping || isComplete}
                  className="w-full bg-[#3c4043] text-sm text-white placeholder-white/40 rounded-full pl-4 pr-10 py-2.5 outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
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
      <div className="h-20 flex items-center justify-center gap-4 bg-[#202124] border-t border-white/5 pb-2">
        <button 
          onClick={toggleListening}
          disabled={isAiTyping || isComplete}
          className={`size-12 rounded-full flex items-center justify-center transition-all ${
            isListening 
              ? "bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.5)]" 
              : "bg-[#3c4043] text-white hover:bg-[#4a4d51] border border-white/10"
          }`}
          title={isListening ? "Turn off microphone" : "Turn on microphone"}
        >
          <FontAwesomeIcon icon={isListening ? faMicrophone : faMicrophoneSlash} />
        </button>

        <button 
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`size-12 rounded-full flex items-center justify-center transition-all ${
            isChatOpen ? "bg-primary text-white shadow-[0_0_15px_rgba(var(--primary),0.5)]" : "bg-[#3c4043] text-white hover:bg-[#4a4d51] border border-white/10"
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
    </main>
  )
}
