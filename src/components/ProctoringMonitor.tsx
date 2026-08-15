"use client";

import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { ShieldAlert, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [isFullscreenExitBlocking, setIsFullscreenExitBlocking] = useState(false);

  // The total, and whether to show the halfway warning, are both facts about
  // `violations` — so they are computed here rather than mirrored into state
  // and pushed by an effect. What we do store is the count the candidate has
  // already acknowledged, which is the only part the render cannot know.
  const totalViolationCount = useMemo(
    () => violations.reduce((acc, v) => acc + v.count, 0),
    [violations]
  );
  const [acknowledgedCount, setAcknowledgedCount] = useState(0);
  const showWarningModal =
    totalViolationCount >= 3 &&
    totalViolationCount < threshold &&
    totalViolationCount > acknowledgedCount;

  const faceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // The parent passes fresh function identities on every render. Depending on
  // them directly made `addViolation` change identity too, which tore down and
  // re-registered the visibilitychange / paste / fullscreenchange listeners on
  // every unrelated parent re-render — and restarted the multiple-faces
  // debounce timer with them, so a second face could stay on camera
  // indefinitely without ever completing the 3-second window.
  const onViolationCountChangeRef = useRef(onViolationCountChange);
  const onViolationLoggedRef = useRef(onViolationLogged);
  const onTerminateRef = useRef(onTerminate);
  useEffect(() => {
    onViolationCountChangeRef.current = onViolationCountChange;
    onViolationLoggedRef.current = onViolationLogged;
    onTerminateRef.current = onTerminate;
  }, [onViolationCountChange, onViolationLogged, onTerminate]);

  const addViolation = useCallback(
    (type: ViolationType) => {
      const timestamp = new Date().toISOString();
      setViolations((prev) => {
        return prev.find((v) => v.type === type)
          ? prev.map((v) => (v.type === type ? { ...v, count: v.count + 1, timestamp } : v))
          : [...prev, { type, timestamp, count: 1 }];
      });

      // Set appropriate toast warnings
      let message = "";
      switch (type) {
        case "tab_switch":
          message = "Tab switch detected — please stay on this page during your interview.";
          break;
        case "copy_paste":
          message = "Pasted text detected — please answer in your own words.";
          break;
        case "multiple_faces":
          message = "Multiple faces detected — please ensure you are alone during the interview.";
          break;
        case "fullscreen_exit":
          message = "Please return to fullscreen to continue your interview.";
          break;
      }
      setWarningMessage(message);
    },
    []
  );

  // Report violations outward. This is the effect's whole job now: telling the
  // parent and, at the limit, ending the interview. Nothing in here sets our
  // own state, so there is no render cascade to chase.
  useEffect(() => {
    if (violations.length === 0) return;
    onViolationCountChangeRef.current(totalViolationCount);
    onViolationLoggedRef.current(violations);

    if (totalViolationCount >= threshold) {
      onTerminateRef.current();
    }
  }, [violations, totalViolationCount, threshold]);

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
  }, [active, addViolation]);

  // 2. Clipboard copy/cut/paste detection
  useEffect(() => {
    if (!active) return;

    // This rule used to be exactly backwards: it skipped INPUT and TEXTAREA
    // ("so normal typing pasting is fine") and blocked everything else. Pasting
    // a prepared answer INTO the answer box is the behaviour proctoring exists
    // to catch, and copying the question text is harmless — so the exemption
    // permitted the only thing worth flagging, while preventDefault stopped
    // candidates from copying a question they wanted to re-read.
    const handlePaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      const intoAnswerField =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable === true;
      if (!intoAnswerField) return;
      // Recorded, not blocked: the log should reflect what happened, and a
      // hostile editor helps nobody.
      addViolation("copy_paste");
    };

    document.addEventListener("paste", handlePaste);

    return () => {
      document.removeEventListener("paste", handlePaste);
    };
  }, [active, addViolation]);

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
  }, [active, addViolation]);

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
  }, [faceCount, active, addViolation]);

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
        warningsCount={totalViolationCount}
        maxWarnings={threshold}
        onDismiss={() => setAcknowledgedCount(totalViolationCount)}
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

            <Button
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold h-11 cursor-pointer"
              onClick={handleRequestFullscreen}
            >
              <Maximize className="mr-2 size-3.5 inline-block" size={14} strokeWidth={1.75} />
              Re-enter Fullscreen
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
