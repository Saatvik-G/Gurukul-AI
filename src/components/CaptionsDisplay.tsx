"use client";

import React, { useEffect, useState } from "react";
import { MessageSquareQuote, RotateCcw, Volume2 } from "lucide-react";

interface CaptionsDisplayProps {
  fullText: string;
  isSpeaking: boolean;
  onReplay?: () => void;
  language?: "en" | "hi";
  isReexplanation?: boolean;
}

export const CaptionsDisplay: React.FC<CaptionsDisplayProps> = ({
  fullText,
  isSpeaking,
  onReplay,
  language = "en",
  isReexplanation = false,
}) => {
  const [displayedLength, setDisplayedLength] = useState(0);

  // Animate text reveal smoothly when speaking
  useEffect(() => {
    if (!fullText) {
      setDisplayedLength(0);
      return;
    }

    if (!isSpeaking) {
      setDisplayedLength(fullText.length);
      return;
    }

    setDisplayedLength(0);
    const totalChars = fullText.length;
    // Estimate reading pace: ~18 chars per second
    const stepTime = 30;
    const charsPerStep = Math.max(1, Math.ceil(totalChars / (stepTime * 5)));

    const interval = setInterval(() => {
      setDisplayedLength((prev) => {
        const next = prev + charsPerStep;
        if (next >= totalChars) {
          clearInterval(interval);
          return totalChars;
        }
        return next;
      });
    }, stepTime);

    return () => clearInterval(interval);
  }, [fullText, isSpeaking]);

  if (!fullText) return null;

  return (
    <div
      className={`relative w-full rounded-2xl p-5 border transition-all duration-300 backdrop-blur-md shadow-lg ${
        isReexplanation
          ? "bg-amber-950/40 border-amber-500/40 text-amber-100 shadow-amber-900/20"
          : "bg-slate-900/80 border-slate-800 text-slate-100 shadow-black/40"
      }`}
    >
      {/* Header Badge */}
      <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
          <MessageSquareQuote className={`w-4 h-4 ${isReexplanation ? "text-amber-400" : "text-indigo-400"}`} />
          <span className={isReexplanation ? "text-amber-400" : "text-indigo-400"}>
            {isReexplanation
              ? language === "hi"
                ? "💡 अनुकूलित पुनर्व्याख्या (नई सादृश्य)"
                : "💡 Adaptive Re-Explanation (Novel Analogy)"
              : language === "hi"
              ? "गुरु की व्याख्या (Live Guru Captions)"
              : "Live Spoken Guru Captions"}
          </span>
        </div>

        {onReplay && (
          <button
            onClick={onReplay}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 transition"
            title="Replay Voice Audio"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{language === "hi" ? "पुनः सुनें" : "Replay"}</span>
          </button>
        )}
      </div>

      {/* Main Spoken Text */}
      <p className="text-base sm:text-lg leading-relaxed font-normal tracking-wide font-sans">
        <span>{fullText.slice(0, displayedLength)}</span>
        {isSpeaking && displayedLength < fullText.length && (
          <span className="inline-block w-2 h-4 ml-1 bg-amber-400 animate-pulse align-middle rounded-sm" />
        )}
      </p>
    </div>
  );
};
