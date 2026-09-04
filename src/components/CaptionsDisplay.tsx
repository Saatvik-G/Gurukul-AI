"use client";

import React, { useEffect, useState } from "react";

interface CaptionsDisplayProps {
  fullText: string;
  isSpeaking: boolean;
  onReplay?: () => void;
  language?: "en" | "hi";
  isReexplanation?: boolean;
  isLoading?: boolean;
  conceptName?: string;
}

export const CaptionsDisplay: React.FC<CaptionsDisplayProps> = ({
  fullText,
  isSpeaking,
  onReplay,
  language = "en",
  isReexplanation = false,
  isLoading = false,
  conceptName,
}) => {
  const [displayedLength, setDisplayedLength] = useState(0);
  const [isWiping, setIsWiping] = useState(false);

  // Trigger dramatic chalk eraser wipe animation on re-explanation (~850ms)
  useEffect(() => {
    if (isReexplanation) {
      setIsWiping(true);
      const timer = setTimeout(() => setIsWiping(false), 850);
      return () => clearTimeout(timer);
    }
  }, [isReexplanation, fullText]);

  // Synced text reveal pacing
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
    const stepTime = 25;
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

  if (!fullText && isLoading) {
    return (
      <div className="w-full p-5 border border-[#8E9C88] bg-[#EFE9DA] text-[#2A2A26] rounded-sm relative overflow-hidden animate-pulse">
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#8E9C88]/30 text-xs font-body">
          <span className="font-semibold text-[#2A2A26]">
            {language === "hi" ? "गुरु व्याख्या" : "Guru Explanation"}
          </span>
          <span className="text-[11px] text-[#E3A23B] font-bold">
            {language === "hi" ? "तैयार हो रहा है..." : "Writing on slate..."}
          </span>
        </div>
        <div className="flex items-center gap-3 py-3 text-sm font-body text-[#2A2A26]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#E3A23B] animate-ping shrink-0" />
          <span className="text-[#2A2A26]/85">
            {language === "hi"
              ? `"${conceptName || "अवधारणा"}" के लिए मुख्य बिंदु और सादृश्य तैयार किए जा रहे हैं...`
              : `Structuring core intuition and physical models for "${conceptName || "this concept"}"...`}
          </span>
        </div>
      </div>
    );
  }

  if (!fullText) return null;

  return (
    <div
      className={`w-full p-5 border bg-[#EFE9DA] text-[#2A2A26] rounded-sm transition-all relative overflow-hidden ${
        isReexplanation
          ? "border-2 border-[#B5482F] bg-[#F7F2E7]"
          : "border border-[#8E9C88]"
      }`}
    >
      {/* Visual Chalk Eraser / Duster Sweep Bar Overlay */}
      {isWiping && (
        <div className="absolute inset-0 z-30 pointer-events-none overflow-hidden">
          {/* Sweeping Duster Bar */}
          <div className="eraser-duster-bar absolute top-0 bottom-0 w-16 bg-gradient-to-r from-transparent via-[#E3A23B]/60 to-[#8E9C88]/70 flex items-center justify-center shadow-lg">
            {/* Wooden Duster Handle */}
            <div className="w-5 h-20 bg-[#6d4c41] border-2 border-[#3e2723] rounded-xs shadow-md flex items-center justify-center">
              <span className="text-[8px] text-[#F3EFE3] font-bold rotate-90 tracking-tighter">
                DUSTER
              </span>
            </div>
          </div>
          {/* Chalk dust mist overlay */}
          <div className="absolute inset-0 bg-white/30 backdrop-blur-xs animate-pulse" />
        </div>
      )}

      {/* Header bar */}
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#8E9C88]/30 text-xs font-body">
        <div className="flex items-center gap-2">
          <span
            className={`font-semibold ${
              isReexplanation ? "text-[#B5482F] font-bold" : "text-[#2A2A26]"
            }`}
          >
            {isReexplanation
              ? language === "hi"
                ? "💡 अनुकूलित पुनर्व्याख्या (नई सादृश्यता)"
                : "💡 Adaptive Re-Explanation (Novel Analogy)"
              : language === "hi"
              ? "गुरु व्याख्या"
              : "Guru Explanation"}
          </span>

          {isReexplanation && (
            <span className="text-[10px] px-2 py-0.5 bg-[#B5482F] text-[#F3EFE3] font-bold rounded-xs">
              Eraser Wipe Applied
            </span>
          )}
        </div>

        {onReplay && (
          <button
            onClick={onReplay}
            className="text-xs text-[#2A2A26] hover:text-[#E3A23B] underline underline-offset-2 font-body"
          >
            {language === "hi" ? "पुनः सुनें" : "Replay voice"}
          </button>
        )}
      </div>

      {/* Main explanation body with chalk reveal effect */}
      <div className={isWiping ? "eraser-reveal-text" : ""}>
        <p className="text-base sm:text-lg leading-relaxed font-body text-[#2A2A26]">
          {fullText.slice(0, displayedLength)}
          {isSpeaking && displayedLength < fullText.length && (
            <span className="inline-block w-2 h-4 ml-1 bg-[#E3A23B] align-middle" />
          )}
        </p>
      </div>
    </div>
  );
};
