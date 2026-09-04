"use client";

import React from "react";
import { Language } from "@/lib/types";
import { ChalkWavyLine } from "./ChalkWavyLine";

interface NavbarProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onNewLesson: () => void;
  onOpenProfile: () => void;
  sessionTitle?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  language,
  onLanguageChange,
  onNewLesson,
  onOpenProfile,
  sessionTitle,
}) => {
  return (
    <header className="w-full border-b border-[#8E9C88]/40 bg-[#1A2B22] text-[#F3EFE3] font-body sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={onNewLesson}>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-serif-heading font-bold text-[#F3EFE3] tracking-wide">
                Gurukul AI (गुरुकुल)
              </span>
              <span className="text-[11px] font-body px-1.5 py-0.5 bg-[#E3A23B] text-[#2A2A26] font-bold rounded-xs">
                Chalkboard Classroom
              </span>
            </div>
            <ChalkWavyLine className="w-20 -mt-0.5 opacity-80" />
          </div>
        </div>

        {/* Center Session Title */}
        {sessionTitle && (
          <div className="hidden md:flex items-center text-xs text-[#8E9C88] max-w-sm truncate">
            <span className="text-[#F3EFE3] font-serif-heading truncate">{sessionTitle}</span>
          </div>
        )}

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {/* Language Switcher */}
          <div className="flex items-center border border-[#8E9C88]/50 bg-[#22362B] rounded-xs text-xs">
            <button
              onClick={() => onLanguageChange("en")}
              className={`px-2.5 py-1 font-medium transition ${
                language === "en"
                  ? "bg-[#E3A23B] text-[#2A2A26] font-bold"
                  : "text-[#8E9C88] hover:text-[#F3EFE3]"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => onLanguageChange("hi")}
              className={`px-2.5 py-1 font-medium transition ${
                language === "hi"
                  ? "bg-[#E3A23B] text-[#2A2A26] font-bold"
                  : "text-[#8E9C88] hover:text-[#F3EFE3]"
              }`}
            >
              हिन्दी
            </button>
          </div>

          {/* Learner Profile */}
          <button
            onClick={onOpenProfile}
            className="text-xs px-3 py-1.5 border border-[#8E9C88]/50 hover:border-[#F3EFE3] text-[#F3EFE3] rounded-xs transition"
          >
            {language === "hi" ? "विद्यार्थी बहीखाता" : "Learner profile"}
          </button>

          {/* New Lesson button */}
          <button
            onClick={onNewLesson}
            className="text-xs font-bold px-3.5 py-1.5 bg-[#E3A23B] text-[#2A2A26] hover:bg-[#d4942d] rounded-xs transition"
          >
            {language === "hi" ? "नया पाठ शुरू करें" : "New lesson"}
          </button>
        </div>
      </div>
    </header>
  );
};
