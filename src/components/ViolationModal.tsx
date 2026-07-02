"use client";

import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShieldHalved, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { GlowButton } from "@/components/ui/glow-button";

interface ViolationModalProps {
  isOpen: boolean;
  warningsCount: number;
  maxWarnings: number;
  onDismiss: () => void;
}

export default function ViolationModal({
  isOpen,
  warningsCount,
  maxWarnings,
  onDismiss,
}: ViolationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[#121212]/90 border border-amber-500/20 p-8 rounded-3xl max-w-md w-full text-center relative overflow-hidden shadow-[0_0_50px_rgba(245,158,11,0.1)]">
        {/* Amber glowing background blob */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/5 rounded-full blur-[60px] pointer-events-none" />

        <div className="size-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 mx-auto mb-5">
          <FontAwesomeIcon icon={faShieldHalved} className="size-8" />
        </div>

        <h3 className="text-xl font-bold text-white mb-2 flex items-center justify-center gap-2">
          <FontAwesomeIcon icon={faTriangleExclamation} className="text-amber-500 size-4.5 animate-pulse" />
          Proctoring Warning Issued
        </h3>

        <p className="text-sm text-foreground/75 leading-relaxed mb-6 font-sans">
          You have received <span className="font-extrabold text-amber-400">{warningsCount} warnings</span>.
          Please note that your mock interview session will be <span className="font-bold text-rose-400">terminated automatically</span> if you reach <span className="font-bold text-rose-400">{maxWarnings} violations</span>.
        </p>

        <div className="space-y-3">
          <div className="text-left text-xs bg-white/5 border border-white/5 p-4 rounded-xl space-y-2 text-white/60 font-medium">
            <div>• Stay in fullscreen mode at all times.</div>
            <div>• Avoid switching browser tabs or minimizing windows.</div>
            <div>• Do not copy, cut, or paste content on this page.</div>
            <div>• Ensure you remain alone in front of the camera.</div>
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <GlowButton
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 border border-amber-500 hover:from-amber-600 hover:to-amber-700 text-black font-semibold h-11"
            onClick={onDismiss}
          >
            I Understand & Will Comply
          </GlowButton>
        </div>
      </div>
    </div>
  );
}
