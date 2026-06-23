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
  HelpCircle
} from "lucide-react";

interface Challenge {
  id: string;
  title: string;
  description: string;
  challenge_type: string;
  difficulty: string;
  starter_code: any;
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

  // Load challenges
  useEffect(() => {
    async function loadChallenges() {
      try {
        // Fetch from api route start or load mock db start
        // Since we want to make it robust, we can hit an endpoint to get challenges.
        // Wait, did we create a GET /api/interview/challenges? 
        // No, but we can write a quick endpoint, or just fetch them from a small local helper.
        // Wait, let's create a small client-side API call to get all challenges, 
        // or we can write a simple client-side load.
        // Let's call /api/interview/start with an empty body to fetch challenges if allowed,
        // or we can fetch a static JSON, or just use the local seed data.
        // Wait, to keep it clean, let's add a GET method in /api/interview/start/route.ts to return all challenges!
        // That is super elegant and keeps things grouped!
        const res = await fetch("/api/interview/start", { method: "GET" });
        if (res.ok) {
          const data = await res.json();
          setChallenges(data.challenges || []);
        } else {
          throw new Error("Failed to load challenges");
        }
      } catch (err: any) {
        console.error(err);
        showToast("Could not load challenges. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    }

    loadChallenges();
  }, []);

  const showToast = (msg: string) => {
    setErrorToast(msg);
    setTimeout(() => {
      setErrorToast(null);
    }, 4000);
  };

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
        router.push(`/interview/session/${data.session_id}`);
      } else {
        throw new Error(data.error || "Failed to initiate session");
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to start interview. Try again.");
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
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "medium":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "hard":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
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
    <div className="almaprep-theme min-h-screen bg-[#F9FAFB] text-[#334155] flex flex-col">
      {/* Toast Alert */}
      {errorToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#062b22] text-[#a7f3d0] border border-[#059669]/20 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-bounce">
          <Activity className="size-5 animate-pulse text-[#10b981]" />
          <span className="text-sm font-medium">{errorToast}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-[1140px] w-full mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10 text-left">
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0f172a] sm:text-4xl mb-2 font-serif">
            Coding Interviews
          </h1>
          <p className="text-[#6B7280] text-base sm:text-lg max-w-2xl font-sans leading-relaxed">
            Practice agentic interviews where you direct an AI agent to solve real engineering problems.
          </p>
        </div>

        {/* Tab Filters */}
        <div className="mb-8 border-b border-[#e2e8f0] overflow-x-auto scrollbar-none">
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
                      ? "text-[#059669] border-[#059669]"
                      : "text-[#6B7280] border-transparent hover:text-[#0f172a]"
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
            <Loader2 className="size-8 animate-spin text-[#059669] mb-4" />
            <p className="text-sm text-[#6b7280] font-medium">Fetching active challenges...</p>
          </div>
        ) : filteredChallenges.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-dashed border-[#cbd5e1] p-8 max-w-lg mx-auto mt-8">
            <div className="p-3 bg-[#f8fafc] rounded-full text-[#9CA3AF] mb-4">
              <FileCode2 className="size-8" />
            </div>
            <h3 className="text-lg font-semibold text-[#0f172a] mb-1">No challenges found</h3>
            <p className="text-sm text-[#9CA3AF] max-w-xs">
              We couldn't find any challenges in the "{getChallengeTypeLabel(activeFilter)}" category.
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
                  className="group relative flex flex-col justify-between bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm hover:-translate-y-1 hover:border-[#059669] hover:shadow-md transition-all duration-200"
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
                      <span className="text-xs font-semibold text-[#374151] bg-[#F3F4F6] px-2.5 py-1 rounded-full">
                        {getChallengeTypeLabel(challenge.challenge_type)}
                      </span>
                    </div>

                    {/* Challenge Title */}
                    <h3 className="text-[#0f172a] font-bold text-lg leading-snug group-hover:text-[#059669] transition-colors duration-150 mb-2">
                      {challenge.title}
                    </h3>

                    {/* Challenge Description */}
                    <p className="text-[#6B7280] text-sm leading-relaxed line-clamp-3 mb-6">
                      {challenge.description}
                    </p>
                  </div>

                  {/* Bottom Row */}
                  <div className="flex items-center justify-between pt-4 border-t border-[#f1f5f9] mt-auto">
                    <div className="flex items-center gap-1.5 text-[#6B7280] text-xs font-medium">
                      {getChallengeIcon(challenge.challenge_type)}
                      <span>{getChallengeTypeLabel(challenge.challenge_type)}</span>
                    </div>

                    <button
                      onClick={() => handleStart(challenge.id)}
                      disabled={startingId !== null}
                      className="inline-flex items-center justify-center gap-1.5 bg-[#059669] text-white hover:bg-[#047857] disabled:opacity-60 px-4 py-2 rounded-xl text-sm font-semibold shadow-sm hover:shadow transition-all duration-150 cursor-pointer min-w-[130px]"
                    >
                      {isStarting ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          <span>Starting...</span>
                        </>
                      ) : (
                        <>
                          <span>Start Interview</span>
                          <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
