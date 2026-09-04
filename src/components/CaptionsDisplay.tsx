"use client";

import React, { useEffect, useState } from "react";

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
  const [isWiping, setIsWiping] = useState(false);

  // Trigger chalk eraser wipe motion on reexplanation
  useEffect(() => {
    if (isReexplanation) {
      setIsWiping(true);
      const timer = setTimeout(() => setIsWiping(false), 450);
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
      className={`w-full p-5 border border-[#8E9C88] bg-[#EFE9DA] text-[#2A2A26] rounded-sm transition-all relative ${
        isWiping ? "eraser-wipe-active" : ""
      } ${
        isReexplanation ? "border-l-4 border-l-[#B5482F]" : ""
      }`}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#8E9C88]/30 text-xs font-body">
        <span
          className={`font-semibold ${
            isReexplanation ? "text-[#B5482F]" : "text-[#2A2A26]"
          }`}
        >
          {isReexplanation
            ? language === "hi"
              ? "पुनर्व्याख्या (नई सादृश्य)"
              : "Re-explanation (Novel Analogy)"
            : language === "hi"
            ? "गुरु व्याख्या"
            : "Guru Explanation"}
        </span>

        {onReplay && (
          <button
            onClick={onReplay}
            className="text-xs text-[#2A2A26] hover:text-[#E3A23B] underline underline-offset-2 font-body"
          >
            {language === "hi" ? "पुनः सुनें" : "Replay voice"}
          </button>
        )}
      </div>

      {/* Main explanation body */}
      <p className="text-base sm:text-lg leading-relaxed font-body text-[#2A2A26]">
        {fullText.slice(0, displayedLength)}
        {isSpeaking && displayedLength < fullText.length && (
          <span className="inline-block w-2 h-4 ml-1 bg-[#E3A23B] align-middle" />
        )}
      </p>
    </div>
  );
};
