"use client";

import React, { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  ChevronLeft,
  Clock,
  Play,
  Send,
  Loader2,
  FileCode,
  FolderOpen,
  Check,
  X,
  ArrowRight,
  Sparkles,
  HelpCircle,
  Maximize2
} from "lucide-react";

// Lazy-load Monaco Editor
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface Message {
  role: "user" | "assistant";
  content: any; // Can be string or JSON object
}

interface DiffChange {
  filename: string;
  original: string;
  replacement: string;
  explanation: string;
}

export default function InterviewWorkspacePage({
  params
}: {
  params: Promise<{ session_id: string }>;
}) {
  const { session_id } = use(params);
  const router = useRouter();

  // Core workspace state
  const [challenge, setChallenge] = useState<any>(null);
  const [codebase, setCodebase] = useState<Record<string, string>>({});
  const [currentFile, setCurrentFile] = useState<string>("");
  const [conversation, setConversation] = useState<Message[]>([]);
  const [pendingDiffs, setPendingDiffs] = useState<DiffChange[]>([]);
  const [activeDiffIndex, setActiveDiffIndex] = useState<number>(0);
  
  // App UI state
  const [loading, setLoading] = useState(true);
  const [isAgentThinking, setIsAgentThinking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  
  // Visual effects
  const [showEditorTooltip, setShowEditorTooltip] = useState(false);
  const [flashGreen, setFlashGreen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [reasoningExpanded, setReasoningExpanded] = useState<Record<number, boolean>>({});

  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load session data
  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch("/api/interview/start", { method: "GET" });
        if (!res.ok) throw new Error("Failed to load challenges");
        const challengeData = await res.json();

        // Fetch session
        const sessionRes = await fetch(`/api/interview/report/${session_id}`, { method: "GET" });
        if (!sessionRes.ok) {
          // If report endpoint fails, let's query the mock session directly
          // We can construct it by calling the start API endpoint or mock helpers
          // But actually, GET /api/interview/report/[report_id] handles returning session if it's there
          // Wait! The session may not be graded yet, so report doesn't exist.
          // Let's call a specific getSession query or construct a fetch.
          // Wait, how do we fetch the session? Let's check:
          // The API route `/api/interview/report/[report_id]` fetches the report and returns the session too.
          // But if the session is NOT submitted/graded yet, the report won't exist!
          // Ah! Let's check: where do we fetch a session *before* it is submitted?
          // We can define a GET handler in `/api/interview/accept-change/route.ts` or add a GET method in `/api/interview/submit/route.ts`!
          // Wait, to keep it extremely simple, we can add a GET method in `/api/interview/accept-change/route.ts` 
          // that takes `session_id` as a query parameter and returns the session!
          // Yes, that is incredibly smart and avoids creating a new API path! Let's do that.
          // Let's implement that GET method in `/api/interview/accept-change/route.ts` or just call it directly.
          // Let's see: we can fetch from `/api/interview/accept-change?session_id=${session_id}`
        }
        
        const loadSessionRes = await fetch(`/api/interview/accept-change?session_id=${session_id}`);
        if (!loadSessionRes.ok) {
          throw new Error("Failed to load session details");
        }
        const sessionData = await loadSessionRes.json();
        
        setCodebase(sessionData.current_codebase || {});
        setConversation(sessionData.conversation || []);
        
        // Find first file key to open
        const files = Object.keys(sessionData.current_codebase || {});
        if (files.length > 0) {
          setCurrentFile(files[0]);
        }

        // Fetch challenge details
        const chall = (challengeData.challenges || []).find((c: any) => c.id === sessionData.challenge_id);
        if (chall) {
          setChallenge(chall);
        }
      } catch (err: any) {
        console.error(err);
        showToast("Error loading session. Redirecting...");
        setTimeout(() => router.push("/interview"), 2000);
      } finally {
        setLoading(false);
      }
    }

    fetchSession();
  }, [session_id]);

  // Handle timer
  useEffect(() => {
    if (loading || isSubmitting) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [loading, isSubmitting]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation, isAgentThinking]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSendPrompt = async () => {
    if (!userInput.trim() || isAgentThinking) return;
    const msg = userInput.trim();
    setUserInput("");
    setIsAgentThinking(true);

    // Reset proposed changes when sending new prompt
    setPendingDiffs([]);

    // Add user message locally
    setConversation((prev) => [...prev, { role: "user", content: msg }]);

    try {
      const res = await fetch("/api/interview/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id, user_message: msg })
      });
      const data = await res.json();
      if (res.ok && data.agent_response) {
        setConversation((prev) => [
          ...prev,
          { role: "assistant", content: data.agent_response }
        ]);

        // If changes proposed, populate the diff workspace
        const proposed = data.agent_response.proposed_changes || [];
        if (proposed.length > 0) {
          setPendingDiffs(proposed);
          setActiveDiffIndex(0);
        }
      } else {
        throw new Error(data.error || "Agent failed to respond");
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to reach AI agent. Please try again.");
    } finally {
      setIsAgentThinking(false);
    }
  };

  const handleAcceptChange = async () => {
    if (pendingDiffs.length === 0 || isApplying) return;
    const diff = pendingDiffs[activeDiffIndex];
    setIsApplying(true);

    try {
      const res = await fetch("/api/interview/accept-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id,
          filename: diff.filename,
          original: diff.original,
          replacement: diff.replacement
        })
      });

      const data = await res.json();
      if (res.ok && data.updated_codebase) {
        setCodebase(data.updated_codebase);
        
        // Trigger green flash effect in Monaco
        setFlashGreen(true);
        setTimeout(() => setFlashGreen(false), 1000);
        
        showToast(`Applied code changes to ${diff.filename}`);

        // Remove from pending diffs list or check next
        const remaining = [...pendingDiffs];
        remaining.splice(activeDiffIndex, 1);
        setPendingDiffs(remaining);
        setActiveDiffIndex(0);
      } else {
        throw new Error(data.message || data.error || "Failed to apply changes");
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Error applying changes.");
    } finally {
      setIsApplying(false);
    }
  };

  const handleRejectChange = () => {
    const remaining = [...pendingDiffs];
    remaining.splice(activeDiffIndex, 1);
    setPendingDiffs(remaining);
    setActiveDiffIndex(0);
    showToast("Proposed changes discarded. You can prompt the agent to revise.");
  };

  const handleSubmitSolution = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    showToast("Running hidden tests & generating report...");

    try {
      const res = await fetch("/api/interview/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id })
      });
      const data = await res.json();
      if (res.ok && data.report_id) {
        router.push(`/interview/report/${data.report_id}`);
      } else {
        throw new Error(data.error || "Submission grading failed");
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to submit solution.");
      setIsSubmitting(false);
    }
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = (totalSeconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSendPrompt();
    }
  };

  const handleEditorClick = () => {
    setShowEditorTooltip(true);
    setTimeout(() => setShowEditorTooltip(false), 3000);
  };

  const getLanguageFromFilename = (filename: string) => {
    if (filename.endsWith(".js")) return "javascript";
    if (filename.endsWith(".py")) return "python";
    if (filename.endsWith(".ts")) return "typescript";
    if (filename.endsWith(".json")) return "json";
    return "plaintext";
  };

  const toggleReasoning = (index: number) => {
    setReasoningExpanded((prev) => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#062b22] text-[#a7f3d0] flex flex-col items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#10b981] mb-4" />
        <p className="text-sm font-medium">Entering secure workspace environment...</p>
      </div>
    );
  }

  return (
    <div className="almaprep-theme h-screen w-screen flex flex-col overflow-hidden bg-[#0a0f1d] text-slate-100 font-sans">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-16 right-6 z-50 bg-[#062b22] text-[#a7f3d0] border border-[#059669]/20 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2">
          <Sparkles className="size-4 text-[#10b981] animate-pulse" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Topbar (48px height) */}
      <header className="h-12 shrink-0 bg-[#111827] border-b border-[#374151] flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/interview")}
            className="p-1 hover:bg-[#1f2937] rounded-lg transition-colors text-slate-400 hover:text-slate-100 cursor-pointer"
          >
            <ChevronLeft className="size-5" />
          </button>
          <span className="font-semibold text-sm tracking-tight text-white">
            {challenge?.title || "Coding Challenge"}
          </span>
          <span className="text-[10px] bg-amber-950/40 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full font-semibold">
            {challenge?.difficulty ? challenge.difficulty.toUpperCase() : "MEDIUM"}
          </span>
        </div>

        {/* Center: Timer */}
        <div className="flex items-center gap-2 text-slate-400 font-mono text-sm">
          <Clock className="size-4" />
          <span>{formatTime(elapsedSeconds)}</span>
        </div>

        {/* Right: Submit Button */}
        <div>
          <button
            onClick={handleSubmitSolution}
            disabled={isSubmitting}
            className="bg-[#059669] hover:bg-[#047857] disabled:opacity-60 text-white font-semibold text-xs px-4 py-1.5 rounded-lg shadow transition-all cursor-pointer inline-flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <Play className="size-3.5 fill-current" />
                <span>Submit Solution</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Lower Workspace (flex-1) */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left Panel: File Tree (200px) */}
        <aside className="w-[200px] bg-[#0d1323] border-r border-[#1f2937] flex flex-col shrink-0">
          <div className="p-3 border-b border-[#1f2937]">
            <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">
              Workspace Files
            </span>
          </div>
          <nav className="flex-1 overflow-y-auto p-2 space-y-1">
            {Object.keys(codebase).map((filename) => {
              const isActive = currentFile === filename;
              return (
                <button
                  key={filename}
                  onClick={() => setCurrentFile(filename)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${
                    isActive
                      ? "bg-[#1f2937] text-white border-l-2 border-[#10b981]"
                      : "text-slate-400 hover:bg-[#1f2937]/50 hover:text-slate-200"
                  }`}
                >
                  <FileCode className={`size-3.5 ${isActive ? "text-[#10b981]" : ""}`} />
                  <span className="truncate">{filename}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Center Panel: Monaco Editor (flex-1) */}
        <main
          className="flex-1 flex flex-col relative bg-[#1e1e1e] overflow-hidden"
          onClick={handleEditorClick}
        >
          {/* Read-Only Tooltip */}
          {showEditorTooltip && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-[#111827] text-slate-200 text-xs px-3 py-1.5 rounded-lg border border-[#374151] shadow-xl flex items-center gap-1.5 animate-bounce">
              <HelpCircle className="size-3.5 text-[#10b981]" />
              <span>Prompt the AI agent to write or apply code changes.</span>
            </div>
          )}

          {/* Green flash overlay for edits */}
          {flashGreen && (
            <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none z-30 transition-opacity duration-1000 animate-pulse" />
          )}

          {/* Monaco Editor Header */}
          <div className="bg-[#181818] border-b border-[#2d2d2d] px-4 py-2 flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">{currentFile}</span>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <FolderOpen className="size-3" />
              <span>Read-Only Mode</span>
            </div>
          </div>

          {/* Editor Container */}
          <div className="flex-1 w-full h-full relative">
            {currentFile && (
              <MonacoEditor
                height="100%"
                language={getLanguageFromFilename(currentFile)}
                theme="vs-dark"
                value={codebase[currentFile] || ""}
                options={{
                  readOnly: true,
                  fontSize: 14,
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  lineNumbers: "on",
                  wordWrap: "off",
                  minimap: { enabled: false },
                  scrollbar: { vertical: "visible", horizontal: "visible" },
                  domReadOnly: true
                }}
              />
            )}
          </div>
        </main>

        {/* Right Panel: Agent Chat (380px) */}
        <aside className="w-[380px] bg-[#0d1323] border-l border-[#1f2937] flex flex-col shrink-0 relative">
          
          {/* Chat Header */}
          <div className="p-3.5 border-b border-[#1f2937] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#10b981] animate-pulse" />
              <span className="font-semibold text-xs text-white">AI Interview Copilot</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">llama-3.3-70b</span>
          </div>

          {/* Chat Messages Log */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {conversation.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-500">
                <Sparkles className="size-8 text-[#059669]/40 mb-3" />
                <p className="text-xs font-medium leading-relaxed max-w-[240px]">
                  Ask the agent to inspect the code, explain issues, or propose updates to fix the bug.
                </p>
              </div>
            ) : (
              conversation.map((msg, index) => {
                const isUser = msg.role === "user";
                
                if (isUser) {
                  return (
                    <div key={`msg-${index}`} className="flex flex-col items-end">
                      <div className="bg-[#059669] text-white text-xs px-3.5 py-2.5 rounded-2xl rounded-tr-none max-w-[85%] shadow-sm leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </div>
                    </div>
                  );
                } else {
                  // Assistant message formatting
                  const agentData = typeof msg.content === "string" ? { reasoning: msg.content, proposed_changes: [], follow_up: "" } : msg.content;
                  const showReasoning = reasoningExpanded[index] ?? false;

                  return (
                    <div key={`msg-${index}`} className="flex flex-col items-start space-y-2">
                      <div className="bg-[#1f2937] border border-[#374151] rounded-2xl rounded-tl-none p-3.5 max-w-[90%] text-xs text-slate-200 leading-relaxed space-y-3">
                        {/* Reasoning Section (Collapsible) */}
                        {agentData.reasoning && (
                          <div className="space-y-1">
                            <span className="font-bold text-[10px] text-[#10b981] uppercase tracking-wider block">
                              Analysis
                            </span>
                            <div className={`text-slate-300 whitespace-pre-wrap ${!showReasoning ? "line-clamp-3" : ""}`}>
                              {agentData.reasoning}
                            </div>
                            {agentData.reasoning.split("\n").length > 3 && (
                              <button
                                onClick={() => toggleReasoning(index)}
                                className="text-[10px] text-[#10b981] hover:underline font-semibold tracking-wide cursor-pointer"
                              >
                                {showReasoning ? "Show less" : "Show more"}
                              </button>
                            )}
                          </div>
                        )}

                        {/* Indicator for Proposed Changes */}
                        {agentData.proposed_changes && agentData.proposed_changes.length > 0 && (
                          <div className="bg-[#111827] border border-[#2d3748] rounded-xl p-2.5 flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wide">
                                Diff Proposed
                              </span>
                              <span className="text-[9px] text-slate-400">
                                {agentData.proposed_changes.length} file change(s) ready
                              </span>
                            </div>
                            <button
                              onClick={() => {
                                setPendingDiffs(agentData.proposed_changes);
                                setActiveDiffIndex(0);
                              }}
                              className="bg-amber-600/20 text-amber-500 hover:bg-amber-600/30 font-semibold px-2 py-1 rounded text-[10px] border border-amber-600/30 flex items-center gap-1 cursor-pointer"
                            >
                              <span>View Diff</span>
                              <Maximize2 className="size-2.5" />
                            </button>
                          </div>
                        )}

                        {/* Follow up text */}
                        {agentData.follow_up && (
                          <div className="pt-2 border-t border-[#2d3748] text-slate-400 italic">
                            {agentData.follow_up}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
              })
            )}

            {/* Agent thinking state */}
            {isAgentThinking && (
              <div className="flex flex-col items-start space-y-1">
                <div className="bg-[#1f2937] border border-[#374151] rounded-2xl rounded-tl-none px-4 py-3.5 flex flex-col gap-2">
                  <div className="flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-slate-400 animate-bounce" />
                    <span className="size-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="size-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="text-[9px] text-slate-500 font-medium">Agent is analyzing codebase...</span>
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Bottom Chat Input Form (fixed height ~100px) */}
          <div className="p-3 border-t border-[#1f2937] bg-[#0c101d] shrink-0">
            <div className="relative bg-[#1f2937] rounded-xl border border-[#374151] focus-within:border-[#10b981] p-2 flex flex-col">
              <textarea
                ref={textareaRef}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask the agent to find bugs or propose fixes..."
                rows={2}
                maxLength={1000}
                className="w-full resize-none bg-transparent text-xs text-white placeholder-slate-500 outline-none border-none pr-10 focus:ring-0 leading-relaxed"
              />
              <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-[#2d3748]">
                {/* Character Counter */}
                <span className={`text-[9px] font-mono ${userInput.length > 200 ? "text-amber-500" : "text-slate-500"}`}>
                  {userInput.length}/1000
                </span>
                
                <button
                  onClick={handleSendPrompt}
                  disabled={!userInput.trim() || isAgentThinking}
                  className="bg-[#059669] hover:bg-[#047857] disabled:opacity-50 text-white p-1.5 rounded-lg transition-all cursor-pointer"
                >
                  <Send className="size-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Floating Diff Review Panel (slides in when diffs are pending) */}
          {pendingDiffs.length > 0 && (
            <div className="absolute inset-x-0 bottom-0 bg-[#111827] border-t-2 border-[#10b981] shadow-2xl z-50 flex flex-col transform transition-all duration-300">
              
              {/* Header */}
              <div className="px-4 py-2 border-b border-[#1f2937] flex items-center justify-between bg-[#1f2937]/30">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">
                    Diff Review
                  </span>
                  {pendingDiffs.length > 1 && (
                    <div className="flex gap-1">
                      {pendingDiffs.map((d, idx) => (
                        <button
                          key={d.filename + idx}
                          onClick={() => setActiveDiffIndex(idx)}
                          className={`text-[9px] px-2 py-0.5 rounded font-mono ${
                            activeDiffIndex === idx
                              ? "bg-slate-700 text-white font-bold"
                              : "bg-slate-900 text-slate-400"
                          }`}
                        >
                          {d.filename.split("/").pop()}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setPendingDiffs([])}
                  className="text-slate-400 hover:text-white p-1 cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 space-y-3">
                <div className="text-[10px] text-slate-300 font-semibold truncate">
                  File: <span className="font-mono text-amber-400">{pendingDiffs[activeDiffIndex].filename}</span>
                </div>
                {pendingDiffs[activeDiffIndex].explanation && (
                  <p className="text-[10px] text-slate-400 italic leading-relaxed">
                    {pendingDiffs[activeDiffIndex].explanation}
                  </p>
                )}

                {/* Diff Viewer Grid */}
                <div className="bg-[#1e1e1e] border border-[#2d2d2d] rounded-lg max-h-48 overflow-y-auto text-[10px] font-mono leading-relaxed">
                  {/* Original Red Removed Lines */}
                  {pendingDiffs[activeDiffIndex].original.split("\n").map((line, idx) => (
                    <div key={`rem-${idx}`} className="bg-red-950/40 text-red-400 px-3 py-0.5 border-l-4 border-red-500/80 flex items-start whitespace-pre-wrap">
                      <span className="w-5 select-none opacity-40">-</span>
                      <span>{line}</span>
                    </div>
                  ))}
                  {/* Replacement Green Added Lines */}
                  {pendingDiffs[activeDiffIndex].replacement.split("\n").map((line, idx) => (
                    <div key={`add-${idx}`} className="bg-emerald-950/40 text-emerald-400 px-3 py-0.5 border-l-4 border-emerald-500/80 flex items-start whitespace-pre-wrap">
                      <span className="w-5 select-none opacity-40">+</span>
                      <span>{line}</span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-2">
                  <button
                    onClick={handleAcceptChange}
                    disabled={isApplying}
                    className="flex-1 bg-[#059669] hover:bg-[#047857] text-white font-semibold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="size-3.5" />
                    <span>Accept Change</span>
                  </button>
                  <button
                    onClick={handleRejectChange}
                    className="flex-1 bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-xs py-2 rounded-lg border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <X className="size-3.5" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </aside>
      </div>
    </div>
  );
}
