"use client";

import React from "react";
import { BookOpen, Flame, Globe2, Sparkles, User, RotateCcw } from "lucide-react";
import { Language } from "@/lib/types";

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
    <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={onNewLesson}>
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-orange-500 to-indigo-600 shadow-lg shadow-amber-500/20">
            <Flame className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold bg-gradient-to-r from-amber-400 via-orange-300 to-indigo-400 bg-clip-text text-transparent">
                Gurukul AI
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                AI Guru
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">
              {language === "hi"
                ? "अनुकूलित एवं व्यक्तिगत शिक्षण प्रणाली"
                : "Adaptive Cognition & Grounded RAG Teacher"}
            </p>
          </div>
        </div>

        {/* Center Session Title if in progress */}
        {sessionTitle && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300 max-w-sm truncate">
            <BookOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate">{sessionTitle}</span>
          </div>
        )}

        {/* Right Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language Toggle (English / Hindi) */}
          <div className="flex items-center rounded-xl bg-slate-900 border border-slate-800 p-1 text-xs">
            <button
              onClick={() => onLanguageChange("en")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                language === "en"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => onLanguageChange("hi")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                language === "hi"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              हिन्दी
            </button>
          </div>

          {/* Learner Profile Button */}
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 transition"
          >
            <User className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">
              {language === "hi" ? "विद्यार्थी प्रोफ़ाइल" : "Learner Profile"}
            </span>
          </button>

          {/* New Lesson / Reset */}
          <button
            onClick={onNewLesson}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-semibold text-xs shadow-md shadow-amber-500/20 transition active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{language === "hi" ? "नया पाठ" : "New Lesson"}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
