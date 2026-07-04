"use client";

import React, { useEffect, useState, useRef } from "react";
import { ShieldAlert, Maximize } from "lucide-react";
import { GlowButton } from "@/components/ui/glow-button";
import ProctoringWarning from "./ProctoringWarning";
import ViolationModal from "./ViolationModal";

export type ViolationType = "tab_switch" | "copy_paste" | "multiple_faces" | "fullscreen_exit";

export interface ViolationRecord {
  type: ViolationType;
  timestamp: string;
  count: number;
}

interface ProctoringMonitorProps {
  active: boolean;
  faceCount: number;
  threshold?: number;
  onViolationLogged: (violations: ViolationRecord[]) => void;
  onViolationCountChange: (count: number) => void;
  onTerminate: () => void;
}

export default function ProctoringMonitor({
  active,
  faceCount,
  threshold = 5,
  onViolationLogged,
  onViolationCountChange,
  onTerminate,
}: ProctoringMonitorProps) {
  const [violations, setViolations] = useState<ViolationRecord[]>([]);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [isFullscreenExitBlocking, setIsFullscreenExitBlocking] = useState(false);

  const violationsRef = useRef<ViolationRecord[]>([]);
  const faceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state ref
  useEffect(() => {
    violationsRef.current = violations;
    const totalCount = violations.reduce((acc, v) => acc + v.count, 0);
    onViolationCountChange(totalCount);
    onViolationLogged(violations);

    if (totalCount === 3) {
      setShowWarningModal(true);
    } else if (totalCount >= threshold) {
      onTerminate();
    }
  }, [violations]);

  const addViolation = (type: ViolationType) => {
    const timestamp = new Date().toISOString();
    setViolations((prev) => {
      const existing = prev.find((v) => v.type === type);
      if (existing) {
        return prev.map((v) =>
          v.type === type ? { ...v, count: v.count + 1, timestamp } : v
        );
      } else {
        return [...prev, { type, timestamp, count: 1 }];
      }
    });

    // Set appropriate toast warnings
    let message = "";
    switch (type) {
      case "tab_switch":
        message = "Tab switch detected — please stay on this page during your interview.";
        break;
      case "copy_paste":
        message = "Copy/paste detected — please answer in your own words.";
        break;
      case "multiple_faces":
        message = "Multiple faces detected — please ensure you are alone during the interview.";
        break;
      case "fullscreen_exit":
        message = "Please return to fullscreen to continue your interview.";
        break;
    }
    setWarningMessage(message);
  };

  // 1. Visibility API Tab Switch Detection
  useEffect(() => {
    if (!active) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        addViolation("tab_switch");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [active]);

  // 2. Clipboard copy/cut/paste detection
  useEffect(() => {
    if (!active) return;

    const handleClipboardEvent = (e: ClipboardEvent) => {
      // Exclude text input and textarea fields so normal typing pasting is fine
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }
      e.preventDefault();
      addViolation("copy_paste");
    };

    document.addEventListener("copy", handleClipboardEvent);
    document.addEventListener("cut", handleClipboardEvent);
    document.addEventListener("paste", handleClipboardEvent);

    return () => {
      document.removeEventListener("copy", handleClipboardEvent);
      document.removeEventListener("cut", handleClipboardEvent);
      document.removeEventListener("paste", handleClipboardEvent);
    };
  }, [active]);

  // 3. Fullscreen Enforcement
  useEffect(() => {
    if (!active) return;

    const handleFullscreenChange = () => {
      const isFullscreen = document.fullscreenElement !== null;
      setIsFullscreenExitBlocking(!isFullscreen);
      if (!isFullscreen) {
        addViolation("fullscreen_exit");
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [active]);

  // 4. Multiple Face Detection with 3-second debounce
  useEffect(() => {
    if (!active) {
      if (faceTimerRef.current) {
        clearTimeout(faceTimerRef.current);
        faceTimerRef.current = null;
      }
      return;
    }

    if (faceCount > 1) {
      if (!faceTimerRef.current) {
        faceTimerRef.current = setTimeout(() => {
          addViolation("multiple_faces");
          faceTimerRef.current = null;
        }, 3000);
      }
    } else {
      if (faceTimerRef.current) {
        clearTimeout(faceTimerRef.current);
        faceTimerRef.current = null;
      }
    }

    return () => {
      if (faceTimerRef.current) {
        clearTimeout(faceTimerRef.current);
      }
    };
  }, [faceCount, active]);

  const handleRequestFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        setIsFullscreenExitBlocking(false);
      }
    } catch (err) {
      console.warn("Re-entering fullscreen failed:", err);
    }
  };

  const totalWarnings = violations.reduce((acc, v) => acc + v.count, 0);

  return (
    <>
      {/* 1. Dismissible toast alerts */}
      {warningMessage && (
        <ProctoringWarning
          message={warningMessage}
          onDismiss={() => setWarningMessage(null)}
        />
      )}

      {/* 2. Warning Modal at 3 violations */}
      <ViolationModal
        isOpen={showWarningModal}
        warningsCount={totalWarnings}
        maxWarnings={threshold}
        onDismiss={() => setShowWarningModal(false)}
      />

      {/* 3. Fullscreen Exit Blocking Overlay */}
      {active && isFullscreenExitBlocking && (
        <div className="fixed inset-0 z-40 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="max-w-md w-full text-center p-8 bg-[#121212]/80 border border-rose-500/20 rounded-3xl shadow-[0_0_40px_rgba(239,68,68,0.1)]">
            <div className="size-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 mx-auto mb-5">
              <ShieldAlert size={28} strokeWidth={1.75} />
            </div>

            <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "var(--font-head), serif", letterSpacing: "-0.015em", fontWeight: 600 }}>
              Fullscreen Required
            </h3>
            <p className="text-sm text-body leading-relaxed mb-6">
              You have exited fullscreen mode. Please click the button below to return to fullscreen to resume your mock interview.
            </p>

            <GlowButton
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold h-11"
              onClick={handleRequestFullscreen}
            >
              <Maximize className="mr-2 size-3.5 inline-block" size={14} strokeWidth={1.75} />
              Re-enter Fullscreen
            </GlowButton>
          </div>
        </div>
      )}
    </>
  );
}
