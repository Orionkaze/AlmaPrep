"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Wrench,
  Zap,
  Shield,
  Activity,
  FileCode2,
  ArrowRight,
  Loader2,
  HelpCircle,
  Calendar
} from "lucide-react";
import { ScheduleModal } from "@/components/ScheduleModal"
import { track, EVENTS } from "@/lib/analytics";

/** Just enough to render the picker — the API deliberately sends no test data. */
interface Challenge {
  id: string;
  title: string;
  description: string;
  challenge_type: string;
  difficulty: string;
  language?: string;
}

const challengeTypes = [
  { id: "all", label: "All" },
  { id: "bug_fix", label: "Bug Fix", icon: Wrench },
  { id: "feature", label: "Feature", icon: Zap },
  { id: "refactor", label: "Refactor", icon: FileCode2 },
  { id: "security", label: "Security", icon: Shield },
  { id: "performance", label: "Performance", icon: Activity }
];

export default function ChallengeSelectionPage() {
  const router = useRouter();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [startingId, setStartingId] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [schedulingChallenge, setSchedulingChallenge] = useState<Challenge | null>(null);

  const showToast = (msg: string) => {
    setErrorToast(msg);
    setTimeout(() => {
      setErrorToast(null);
    }, 4000);
  };

  // Load challenges
  useEffect(() => {
    async function loadChallenges() {
      try {
        const res = await fetch("/api/interview/start", { method: "GET" });
        if (res.ok) {
          const data = await res.json();
          setChallenges(data.challenges || []);
        } else {
          throw new Error("Failed to load challenges");
        }
      } catch (err) {
        console.error(err);
        showToast("Could not load challenges. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    }

    loadChallenges();
  }, []);

  const handleStart = async (challengeId: string) => {
    if (startingId) return;
    setStartingId(challengeId);
    try {
      const res = await fetch("/api/interview/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          challenge_id: challengeId,
          user_id: "demo-user-id" // fallback user_id
        })
      });

      const data = await res.json();
      if (res.ok && data.session_id) {
        const started = challenges.find((c) => c.id === challengeId)
        track(EVENTS.CODING_CHALLENGE_STARTED, {
          challenge_id: challengeId,
          challenge_type: started?.challenge_type,
          difficulty: started?.difficulty,
        })
        router.push(`/interview/session/${data.session_id}`);
      } else {
        throw new Error(data.error || "Failed to initiate session");
      }
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Failed to start interview. Try again.";
      showToast(message);
      setStartingId(null);
    }
  };

  const getChallengeIcon = (type: string) => {
    switch (type) {
      case "bug_fix":
        return <Wrench className="size-4" />;
      case "feature":
        return <Zap className="size-4" />;
      case "refactor":
        return <FileCode2 className="size-4" />;
      case "security":
        return <Shield className="size-4" />;
      case "performance":
        return <Activity className="size-4" />;
      default:
        return <HelpCircle className="size-4" />;
    }
  };

  const getDifficultyStyles = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "easy":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "medium":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "hard":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getChallengeTypeLabel = (type: string) => {
    const matched = challengeTypes.find((t) => t.id === type);
    return matched ? matched.label : type;
  };

  const filteredChallenges = challenges.filter(
    (c) => activeFilter === "all" || c.challenge_type === activeFilter
  );

  return (
    <div className="almaprep-theme min-h-screen bg-background text-foreground flex flex-col">
      {/* Toast Alert */}
      {errorToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-primary/20 text-primary border border-primary/30 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-bounce">
          <Activity className="size-5 animate-pulse text-primary" />
          <span className="text-sm font-medium">{errorToast}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-[1140px] w-full mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10 text-left">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl mb-2 font-serif">
            Coding Interviews
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl font-sans leading-relaxed">
            Practice agentic interviews where you direct an AI agent to solve real engineering problems.
          </p>
        </div>

        {/* Tab Filters */}
        <div className="mb-8 border-b border-border overflow-x-auto scrollbar-none">
          <div className="flex space-x-8 min-w-max pb-px">
            {challengeTypes.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id)}
                  className={`flex items-center gap-2 pb-4 text-sm font-medium transition-all duration-150 relative border-b-2 outline-none cursor-pointer ${
                    isActive
                      ? "text-primary border-primary"
                      : "text-muted-foreground border-transparent hover:text-foreground"
                  }`}
                >
                  {Icon && <Icon className="size-4" />}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="size-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground font-medium">Fetching active challenges...</p>
          </div>
        ) : filteredChallenges.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20 text-center bg-card rounded-2xl border border-dashed border-border p-8 max-w-lg mx-auto mt-8">
            <div className="p-3 bg-muted rounded-full text-muted-foreground mb-4">
              <FileCode2 className="size-8" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">No challenges found</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              We couldn&apos;t find any challenges in the &quot;{getChallengeTypeLabel(activeFilter)}&quot; category.
            </p>
          </div>
        ) : (
          /* Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredChallenges.map((challenge) => {
              const isStarting = startingId === challenge.id;
              return (
                <div
                  key={challenge.id}
                  className="group relative flex flex-col justify-between bg-card border border-border rounded-2xl p-6 shadow-sm hover:-translate-y-1 hover:border-primary/50 hover:shadow-md transition-all duration-200"
                >
                  <div>
                    {/* Badge Row */}
                    <div className="flex items-center justify-between mb-4">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${getDifficultyStyles(
                          challenge.difficulty
                        )}`}
                      >
                        {challenge.difficulty.charAt(0).toUpperCase() + challenge.difficulty.slice(1)}
                      </span>
                      <span className="text-xs font-semibold text-muted-foreground bg-muted/60 border border-border/50 px-2.5 py-1 rounded-full">
                        {getChallengeTypeLabel(challenge.challenge_type)}
                      </span>
                    </div>

                    {/* Challenge Title */}
                    <h3 className="text-foreground font-bold text-lg leading-snug group-hover:text-primary transition-colors duration-150 mb-2">
                      {challenge.title}
                    </h3>

                    {/* Challenge Description */}
                    <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3 mb-6">
                      {challenge.description}
                    </p>
                  </div>

                  {/* Bottom Row */}
                  <div className="flex flex-col gap-3 pt-4 border-t border-border mt-auto">
                    <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
                      {getChallengeIcon(challenge.challenge_type)}
                      <span>{getChallengeTypeLabel(challenge.challenge_type)}</span>
                    </div>

                    <div className="flex items-center gap-2 w-full">
                      <button
                        onClick={() => {
                          setSchedulingChallenge(challenge);
                          setScheduleOpen(true);
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted border border-border px-3 py-2 rounded-xl text-sm font-semibold shadow-sm transition-all duration-150 cursor-pointer"
                      >
                        <Calendar className="size-4" />
                        <span>Schedule</span>
                      </button>
                      <button
                        onClick={() => handleStart(challenge.id)}
                        disabled={startingId !== null}
                        className="flex-[1.5] inline-flex items-center justify-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 px-3 py-2 rounded-xl text-sm font-semibold shadow-sm hover:shadow transition-all duration-150 cursor-pointer"
                      >
                        {isStarting ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            <span>Starting...</span>
                          </>
                        ) : (
                          <>
                            <span>Start Now</span>
                            <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      
      <ScheduleModal 
        open={scheduleOpen} 
        onOpenChange={setScheduleOpen} 
        defaultTitle={schedulingChallenge?.title || "Coding Challenge"} 
      />
    </div>
  );
}
