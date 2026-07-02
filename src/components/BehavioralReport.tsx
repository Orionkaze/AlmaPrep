"use client";

import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEye,
  faUserTie,
  faSmile,
  faHands,
  faFileContract,
  faChartSimple,
} from "@fortawesome/free-solid-svg-icons";
import { GlassCard } from "@/components/ui/glass-card";

interface AnswerScore {
  star_score: number;
  relevance_score: number;
  clarity_score: number;
  confidence_score: number;
  hints: string[];
  summary: string;
}

interface PhysicalMetric {
  interval_index: number;
  eye_contact_percent: number;
  posture_stability_score: number;
  facial_engagement: "nodding" | "neutral" | "distracted";
  fidgeting_count: number;
}

interface BehavioralReportProps {
  answerScores: AnswerScore[];
  physicalMetrics: PhysicalMetric[];
  finalReport: string;
}

export default function BehavioralReport({
  answerScores,
  physicalMetrics,
  finalReport,
}: BehavioralReportProps) {
  // 1. Calculate averages for Physical Metrics
  const totalIntervals = physicalMetrics.length;
  const avgEyeContact =
    totalIntervals > 0
      ? Math.round(
          physicalMetrics.reduce((acc, m) => acc + m.eye_contact_percent, 0) / totalIntervals
        )
      : 85;

  const avgPosture =
    totalIntervals > 0
      ? Math.round(
          physicalMetrics.reduce((acc, m) => acc + m.posture_stability_score, 0) / totalIntervals
        )
      : 80;

  const totalFidgets =
    totalIntervals > 0 ? physicalMetrics.reduce((acc, m) => acc + m.fidgeting_count, 0) : 12;

  // Most common facial engagement
  const engagementCounts = physicalMetrics.reduce(
    (acc, m) => {
      acc[m.facial_engagement] = (acc[m.facial_engagement] || 0) + 1;
      return acc;
    },
    { nodding: 0, neutral: 0, distracted: 0 } as Record<string, number>
  );

  let primaryEngagement = "Neutral";
  if (engagementCounts.nodding > engagementCounts.neutral && engagementCounts.nodding > engagementCounts.distracted) {
    primaryEngagement = "Nodding & Engaged";
  } else if (engagementCounts.distracted > engagementCounts.neutral && engagementCounts.distracted > engagementCounts.nodding) {
    primaryEngagement = "Distracted";
  }

  // 2. Calculate averages for Answer Quality
  const totalAnswers = answerScores.length;
  const avgStar =
    totalAnswers > 0
      ? Math.round(
          (answerScores.reduce((acc, a) => acc + a.star_score, 0) / totalAnswers) * 10
        )
      : 75;

  const avgRelevance =
    totalAnswers > 0
      ? Math.round(
          (answerScores.reduce((acc, a) => acc + a.relevance_score, 0) / totalAnswers) * 10
        )
      : 80;

  const avgClarity =
    totalAnswers > 0
      ? Math.round(
          (answerScores.reduce((acc, a) => acc + a.clarity_score, 0) / totalAnswers) * 10
        )
      : 70;

  const avgConfidence =
    totalAnswers > 0
      ? Math.round(
          (answerScores.reduce((acc, a) => acc + a.confidence_score, 0) / totalAnswers) * 10
        )
      : 75;

  // Helpers for visual feedback
  const getProgressColor = (score: number) => {
    if (score >= 80) return "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]";
    if (score >= 60) return "bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.4)]";
    return "bg-rose-500 shadow-[0_0_10px_rgba(239,110,110,0.4)]";
  };

  return (
    <div className="space-y-8">
      {/* section 1: Coach Feedback Report */}
      <GlassCard className="border border-emerald-500/10 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span className="size-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-sm">
            <FontAwesomeIcon icon={faFileContract} className="text-emerald-400" />
          </span>
          Behavioral Coaching Feedback
        </h2>
        <div className="text-white/80 leading-relaxed text-sm space-y-4 font-sans whitespace-pre-wrap">
          {finalReport}
        </div>
      </GlassCard>

      {/* section 2: Physical Metrics & Answer Quality side-by-side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Physical Metrics card */}
        <GlassCard className="border border-emerald-500/10">
          <h3 className="text-lg font-semibold mb-5 flex items-center gap-2">
            <span className="size-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-sm">
              <FontAwesomeIcon icon={faEye} className="text-purple-400" />
            </span>
            Physical Behavior
          </h3>

          <div className="space-y-5">
            {/* Eye contact */}
            <div>
              <div className="flex justify-between items-center text-xs mb-2">
                <span className="text-white/70 flex items-center gap-2">
                  <FontAwesomeIcon icon={faEye} className="text-white/40 size-3" />
                  Eye Contact
                </span>
                <span className="font-bold text-white">{avgEyeContact}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-[1.5s] ${getProgressColor(
                    avgEyeContact
                  )}`}
                  style={{ width: `${avgEyeContact}%` }}
                />
              </div>
            </div>

            {/* Posture stability */}
            <div>
              <div className="flex justify-between items-center text-xs mb-2">
                <span className="text-white/70 flex items-center gap-2">
                  <FontAwesomeIcon icon={faUserTie} className="text-white/40 size-3" />
                  Posture Stability
                </span>
                <span className="font-bold text-white">{avgPosture}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-[1.5s] ${getProgressColor(
                    avgPosture
                  )}`}
                  style={{ width: `${avgPosture}%` }}
                />
              </div>
            </div>

            {/* Engagement */}
            <div className="flex items-center justify-between border-t border-white/5 pt-3">
              <span className="text-xs text-white/70 flex items-center gap-2">
                <FontAwesomeIcon icon={faSmile} className="text-white/40 size-3" />
                Facial Engagement
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
                {primaryEngagement}
              </span>
            </div>

            {/* Fidgeting */}
            <div className="flex items-center justify-between border-t border-white/5 pt-3">
              <span className="text-xs text-white/70 flex items-center gap-2">
                <FontAwesomeIcon icon={faHands} className="text-white/40 size-3" />
                Fidgeting Detections
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-400">
                {totalFidgets} events
              </span>
            </div>
          </div>
        </GlassCard>

        {/* Answer Quality card */}
        <GlassCard className="border border-emerald-500/10">
          <h3 className="text-lg font-semibold mb-5 flex items-center gap-2">
            <span className="size-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-sm">
              <FontAwesomeIcon icon={faChartSimple} className="text-emerald-400" />
            </span>
            Speech & Content Quality
          </h3>

          <div className="space-y-5">
            {/* STAR score */}
            <div>
              <div className="flex justify-between items-center text-xs mb-2">
                <span className="text-white/70">STAR Structure</span>
                <span className="font-bold text-white">{avgStar}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-[1.5s] ${getProgressColor(
                    avgStar
                  )}`}
                  style={{ width: `${avgStar}%` }}
                />
              </div>
            </div>

            {/* Relevance */}
            <div>
              <div className="flex justify-between items-center text-xs mb-2">
                <span className="text-white/70">Question Relevance</span>
                <span className="font-bold text-white">{avgRelevance}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-[1.5s] ${getProgressColor(
                    avgRelevance
                  )}`}
                  style={{ width: `${avgRelevance}%` }}
                />
              </div>
            </div>

            {/* Clarity */}
            <div>
              <div className="flex justify-between items-center text-xs mb-2">
                <span className="text-white/70">Clarity & Conciseness</span>
                <span className="font-bold text-white">{avgClarity}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-[1.5s] ${getProgressColor(
                    avgClarity
                  )}`}
                  style={{ width: `${avgClarity}%` }}
                />
              </div>
            </div>

            {/* Confidence */}
            <div>
              <div className="flex justify-between items-center text-xs mb-2">
                <span className="text-white/70">Assertiveness & Confidence</span>
                <span className="font-bold text-white">{avgConfidence}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-[1.5s] ${getProgressColor(
                    avgConfidence
                  )}`}
                  style={{ width: `${avgConfidence}%` }}
                />
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* section 3: Per-Answer Breakdown */}
      {answerScores.length > 0 && (
        <GlassCard className="border border-emerald-500/10">
          <h3 className="text-lg font-semibold mb-5 flex items-center gap-2">
            <span className="size-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-sm">
              <FontAwesomeIcon icon={faChartSimple} className="text-emerald-400" />
            </span>
            Speech Quality per Question
          </h3>

          <div className="space-y-6">
            {answerScores.map((ans, idx) => (
              <div key={idx} className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded">
                    Answer {idx + 1}
                  </span>
                  <div className="flex gap-4 text-xs font-semibold">
                    <span className="text-white/80">STAR: {ans.star_score}/10</span>
                    <span className="text-white/80">Relevance: {ans.relevance_score}/10</span>
                    <span className="text-white/80">Clarity: {ans.clarity_score}/10</span>
                    <span className="text-white/80">Confidence: {ans.confidence_score}/10</span>
                  </div>
                </div>

                <div className="text-xs leading-relaxed text-white/80 font-sans italic border-l-2 border-emerald-500/40 pl-3 py-1">
                  {ans.summary}
                </div>

                {ans.hints && ans.hints.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {ans.hints.map((hint, hIdx) => (
                      <span
                        key={hIdx}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-400"
                      >
                        {hint}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
