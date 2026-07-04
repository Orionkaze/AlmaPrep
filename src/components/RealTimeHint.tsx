"use client";

import React, { useEffect, useState } from "react";
import { Lightbulb, X } from "lucide-react";

interface RealTimeHintProps {
  hints: string[];
  visible: boolean;
  onDismiss: () => void;
}

export default function RealTimeHint({ hints, visible, onDismiss }: RealTimeHintProps) {
  const [shouldRender, setShouldRender] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    if (visible && hints.length > 0) {
      setShouldRender(true);
      // Stagger slightly for transition trigger
      setTimeout(() => setAnimateIn(true), 50);

      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        handleDismiss();
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      setAnimateIn(false);
      const timer = setTimeout(() => setShouldRender(false), 300); // Wait for transition
      return () => clearTimeout(timer);
    }
  }, [visible, hints]);

  const handleDismiss = () => {
    setAnimateIn(false);
    setTimeout(() => {
      setShouldRender(false);
      onDismiss();
    }, 300);
  };

  if (!shouldRender || hints.length === 0) return null;

  return (
    <div
      className={`fixed bottom-24 right-6 z-50 max-w-sm w-80 bg-[#0a3a2f]/80 border border-emerald-500/20 rounded-2xl p-4 shadow-2xl backdrop-blur-md transition-all duration-300 transform ${
        animateIn
          ? "opacity-100 translate-y-0 scale-100"
          : "opacity-0 translate-y-4 scale-95 pointer-events-none"
      }`}
    >
      <div className="flex gap-3">
        <div className="size-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
          <Lightbulb className="text-emerald-400 size-4 animate-pulse" size={16} strokeWidth={1.75} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
            Real-Time Tip
          </h4>
          <ul className="space-y-1.5">
            {hints.map((hint, idx) => (
              <li key={idx} className="text-xs text-body leading-relaxed font-medium">
                {hint}
              </li>
            ))}
          </ul>
        </div>
        <button
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-white transition-colors size-6 flex items-center justify-center rounded-lg hover:bg-white/5 cursor-pointer shrink-0"
        >
          <X className="size-3" size={12} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
