"use client";

import React, { useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTriangleExclamation, faXmark } from "@fortawesome/free-solid-svg-icons";

interface ProctoringWarningProps {
  message: string;
  onDismiss: () => void;
}

export default function ProctoringWarning({ message, onDismiss }: ProctoringWarningProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 4000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-6 fade-in duration-300 w-full max-w-md px-4 pointer-events-auto">
      <div className="bg-[#1A0B0B]/80 border border-rose-500/30 text-rose-200 px-4 py-3.5 rounded-2xl shadow-[0_0_20px_rgba(239,68,68,0.15)] backdrop-blur-md flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
            <FontAwesomeIcon icon={faTriangleExclamation} className="size-4 animate-pulse" />
          </div>
          <div className="text-xs font-semibold leading-relaxed">
            {message}
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-rose-400/50 hover:text-rose-300 transition-colors p-1 cursor-pointer"
        >
          <FontAwesomeIcon icon={faXmark} className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
