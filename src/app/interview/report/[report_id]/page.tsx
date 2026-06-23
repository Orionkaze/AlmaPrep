"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  RotateCcw,
  BookOpen,
  Loader2,
  Calendar,
  Clock,
  Sparkles
} from "lucide-react";

interface TestResult {
  test_id: string;
  description: string;
  passed: boolean;
  error?: string;
}

interface ReportData {
  id: string;
  session_id: string;
  user_id: string;
  scores: {
    prompt_engineering: number;
    problem_decomposition: number;
    context_management: number;
    debugging_ability: number;
    testing_strategy: number;
    code_review_quality: number;
    security_awareness: number;
  };
  strengths: string[];
  weaknesses: string[];
  hiring_recommendation: string;
  recommendation_reasoning: string;
  overall_score: number;
  test_results: TestResult[];
  generated_at: string;
  challenge_title: string;
  session?: {
    challenge_id: string;
    started_at: string;
    submitted_at: string;
  };
}

const categories = [
  { key: "prompt_engineering", label: "Prompt Engineering" },
  { key: "problem_decomposition", label: "Problem Decomposition" },
  { key: "context_management", label: "Context Management" },
  { key: "debugging_ability", label: "Debugging Ability" },
  { key: "testing_strategy", label: "Testing Strategy" },
  { key: "code_review_quality", label: "Code Review Quality" },
  { key: "security_awareness", label: "Security Awareness" }
];

export default function ReportPage({
  params
}: {
  params: Promise<{ report_id: string }>;
}) {
  const { report_id } = use(params);
  const router = useRouter();

  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [barWidths, setBarWidths] = useState<Record<string, number>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadReport() {
      try {
        const res = await fetch(`/api/interview/report/${report_id}`);
        if (!res.ok) throw new Error("Report not found");
        const data = await res.json();
        setReport(data);

        // Score Counter Animation
        const targetScore = data.overall_score || 0;
        let start = 0;
        const duration = 800; // 800ms
        const stepTime = Math.abs(Math.floor(duration / targetScore));
        const timer = setInterval(() => {
          start += 1;
          setAnimatedScore(start);
          if (start >= targetScore) {
            clearInterval(timer);
            setAnimatedScore(targetScore);
          }
        }, stepTime);

        // Staggered progress bar widths animation
        categories.forEach((cat, index) => {
          setTimeout(() => {
            const score = data.scores?.[cat.key] || 0;
            const percentage = score * 10;
            setBarWidths((prev) => ({
              ...prev,
              [cat.key]: percentage
            }));
          }, 150 + index * 80); // Stagger by 80ms
        });

      } catch (err: any) {
        console.error(err);
        showToast("Error retrieving interview evaluation report.");
      } finally {
        setLoading(false);
      }
    }

    loadReport();
  }, [report_id]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleTryAgain = async () => {
    if (!report || retrying) return;
    setRetrying(true);
    try {
      const challengeId = report.session?.challenge_id || "f1a8c9b3-4f9e-4e3a-96ad-d62fb5291b98";
      const res = await fetch("/api/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge_id: challengeId,
          user_id: report.user_id
        })
      });
      const data = await res.json();
      if (res.ok && data.session_id) {
        router.push(`/interview/session/${data.session_id}`);
      } else {
        throw new Error(data.error || "Failed to start attempt");
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to start a new interview attempt.");
      setRetrying(false);
    }
  };

  const getVerdictStyles = (verdict: string) => {
    switch (verdict) {
      case "Strong Hire":
        return {
          bg: "bg-emerald-50 border border-emerald-200",
          text: "text-emerald-900",
          icon: <CheckCircle className="size-6 text-emerald-600" />,
          accent: "text-emerald-700"
        };
      case "Hire":
        return {
          bg: "bg-blue-50 border border-blue-200",
          text: "text-blue-900",
          icon: <CheckCircle className="size-6 text-blue-600" />,
          accent: "text-blue-700"
        };
      default: // No Hire
        return {
          bg: "bg-rose-50 border border-rose-200",
          text: "text-rose-900",
          icon: <XCircle className="size-6 text-rose-600" />,
          accent: "text-rose-700"
        };
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-emerald-600 border-emerald-500 bg-emerald-50/50";
    if (score >= 50) return "text-amber-600 border-amber-500 bg-amber-50/50";
    return "text-rose-600 border-rose-500 bg-rose-50/50";
  };

  const getSkillBarColor = (score: number) => {
    if (score >= 7) return "bg-emerald-600";
    if (score >= 4) return "bg-amber-500";
    return "bg-rose-500";
  };

  const getElapsedMinutes = () => {
    if (!report || !report.session?.started_at || !report.session?.submitted_at) return "18 minutes";
    const start = new Date(report.session.started_at).getTime();
    const end = new Date(report.session.submitted_at).getTime();
    const elapsedMs = end - start;
    const minutes = Math.round(elapsedMs / 1000 / 60);
    return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center text-[#334155]">
        <Loader2 className="size-8 animate-spin text-[#059669] mb-4" />
        <p className="text-sm font-medium">Generating performance metrics...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center p-6 text-center text-[#334155]">
        <AlertTriangle className="size-12 text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Report Not Found</h2>
        <p className="text-sm text-slate-500 mb-6">The requested interview feedback report is missing or invalid.</p>
        <button
          onClick={() => router.push("/interview")}
          className="bg-[#059669] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#047857] shadow transition"
        >
          Back to Challenges
        </button>
      </div>
    );
  }

  const verdict = getVerdictStyles(report.hiring_recommendation);
  const passedTestsCount = report.test_results?.filter((t) => t.passed).length || 0;
  const totalTestsCount = report.test_results?.length || 0;

  return (
    <div className="almaprep-theme min-h-screen bg-[#F9FAFB] text-[#334155] py-12 px-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#062b22] text-[#a7f3d0] border border-[#059669]/20 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2">
          <AlertTriangle className="size-4 text-[#10b981]" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      <div className="max-w-[860px] mx-auto space-y-8 bg-white border border-[#E5E7EB] rounded-3xl p-8 md:p-12 shadow-sm">
        
        {/* Section 1: Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-[#f1f5f9] gap-4">
          <div>
            <span className="text-[10px] font-bold text-[#059669] uppercase tracking-widest block mb-1">
              Interview Feedback Report
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#0f172a] font-serif leading-tight">
              {report.challenge_title}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 font-sans">
            <div className="flex items-center gap-1">
              <Calendar className="size-3.5" />
              <span>{new Date(report.generated_at).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="size-3.5" />
              <span>Completed in {getElapsedMinutes()}</span>
            </div>
          </div>
        </div>

        {/* Section 2: Verdict Banner */}
        <div className={`p-6 rounded-2xl flex flex-col md:flex-row items-start gap-4 ${verdict.bg}`}>
          <div className="shrink-0 p-1 bg-white/60 rounded-full shadow-sm">
            {verdict.icon}
          </div>
          <div className="space-y-1.5">
            <h3 className={`text-lg font-bold ${verdict.text}`}>
              Recommendation: {report.hiring_recommendation}
            </h3>
            <p className={`text-sm leading-relaxed leading-6 ${verdict.accent}`}>
              {report.recommendation_reasoning}
            </p>
          </div>
        </div>

        {/* Circular Score Meter & Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-4 items-center">
          
          {/* Section 3: Circular Score Display (5 cols) */}
          <div className="md:col-span-4 flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-100 rounded-2xl text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-4">
              Overall Score
            </span>
            <div className={`size-32 rounded-full border-[10px] flex flex-col items-center justify-center shadow-inner relative transition-colors duration-500 ${getScoreColor(animatedScore)}`}>
              <span className="text-3xl font-extrabold tracking-tight font-mono leading-none">
                {animatedScore}
              </span>
              <span className="text-[10px] font-semibold text-slate-500 mt-1 uppercase tracking-wide">
                out of 100
              </span>
            </div>
          </div>

          {/* Section 4: Category Breakdown (8 cols) */}
          <div className="md:col-span-8 space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Skill Breakdown
            </h3>
            <div className="space-y-3">
              {categories.map((cat) => {
                const score = report.scores?.[cat.key as keyof typeof report.scores] ?? 0;
                const width = barWidths[cat.key] ?? 0;
                return (
                  <div key={cat.key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700">{cat.label}</span>
                      <span className="font-bold text-slate-800">{score}/10</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${getSkillBarColor(score)}`}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Section 5: Strengths & Weaknesses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-[#f1f5f9]">
          {/* Strengths */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="size-5 text-emerald-600 shrink-0" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Key Strengths
              </h3>
            </div>
            <ul className="space-y-2 text-sm leading-relaxed text-slate-600">
              {report.strengths?.length > 0 ? (
                report.strengths.map((str, idx) => (
                  <li key={`str-${idx}`} className="flex items-start gap-2">
                    <span className="text-[#059669] font-bold select-none">•</span>
                    <span>{str}</span>
                  </li>
                ))
              ) : (
                <li className="italic text-slate-400">No specific strengths documented.</li>
              )}
            </ul>
          </div>

          {/* Areas to Improve */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500 shrink-0" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Areas to Improve
              </h3>
            </div>
            <ul className="space-y-2 text-sm leading-relaxed text-slate-600">
              {report.weaknesses?.length > 0 ? (
                report.weaknesses.map((weak, idx) => (
                  <li key={`weak-${idx}`} className="flex items-start gap-2">
                    <span className="text-amber-500 font-bold select-none">•</span>
                    <span>{weak}</span>
                  </li>
                ))
              ) : (
                <li className="italic text-slate-400">No specific areas to improve documented.</li>
              )}
            </ul>
          </div>
        </div>

        {/* Section 6: Test Results */}
        <div className="pt-6 border-t border-[#f1f5f9] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Hidden Test Results
            </h3>
            <span className="text-xs bg-[#f8fafc] text-slate-500 border border-[#cbd5e1] px-2.5 py-0.5 rounded-full font-mono">
              Passed {passedTestsCount} of {totalTestsCount} tests
            </span>
          </div>

          <div className="border border-[#E5E7EB] rounded-2xl overflow-hidden">
            <table className="min-w-full divide-y divide-[#E5E7EB] text-left text-sm font-sans">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Test Case Description</th>
                  <th className="px-6 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] text-slate-700 bg-white">
                {report.test_results?.length > 0 ? (
                  report.test_results.map((test) => (
                    <tr key={test.test_id} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-4 flex flex-col gap-0.5">
                        <span className="font-medium text-slate-800">{test.description}</span>
                        {test.error && (
                          <span className="text-[10px] text-rose-500 font-mono line-clamp-1">
                            Error: {test.error}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <span
                          className={`inline-flex items-center justify-center text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                            test.passed
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                              : "bg-rose-50 text-rose-700 border-rose-100"
                          }`}
                        >
                          {test.passed ? "Passed" : "Failed"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="px-6 py-4 text-center italic text-slate-400">
                      No tests were executed.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 7: Actions */}
        <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-[#f1f5f9] justify-between">
          <button
            onClick={() => router.push("/interview")}
            className="flex items-center justify-center gap-1.5 bg-transparent hover:bg-slate-100 text-slate-700 font-semibold text-sm px-5 py-3 rounded-xl border border-slate-300 transition cursor-pointer"
          >
            <ArrowLeft className="size-4" />
            <span>Back to Challenges</span>
          </button>
          
          <button
            onClick={handleTryAgain}
            disabled={retrying}
            className="flex items-center justify-center gap-1.5 bg-[#059669] hover:bg-[#047857] disabled:opacity-50 text-white font-semibold text-sm px-6 py-3 rounded-xl shadow transition cursor-pointer"
          >
            {retrying ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Creating attempt...</span>
              </>
            ) : (
              <>
                <RotateCcw className="size-4" />
                <span>Try Challenge Again</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
