"use client";

import React from "react";
import { Award, BookOpen, CheckCircle2, History, Sparkles, TrendingUp, X, XCircle } from "lucide-react";
import { LearnerProfile } from "@/lib/types";

interface LearnerProfileViewProps {
  isOpen: boolean;
  onClose: () => void;
  profile: LearnerProfile | null;
  language?: "en" | "hi";
}

export const LearnerProfileView: React.FC<LearnerProfileViewProps> = ({
  isOpen,
  onClose,
  profile,
  language = "en",
}) => {
  if (!isOpen) return null;

  const isHi = language === "hi";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/30">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {isHi ? "विद्यार्थी संज्ञानात्मक प्रोफ़ाइल" : "Learner Cognitive Profile"}
              </h2>
              <p className="text-xs text-slate-400">
                {isHi
                  ? "दीर्घकालिक ज्ञान स्मृति एवं अनुकूलन इतिहास"
                  : "Cross-session mastery & memory tracking for personalized adaptation"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
              <span className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
                {isHi ? "सत्र संख्या" : "Sessions Completed"}
              </span>
              <span className="text-2xl font-black text-indigo-400">
                {profile?.session_history?.length || 0}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
              <span className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
                {isHi ? "मजबूत अवधारणाएं" : "Mastered Concepts"}
              </span>
              <span className="text-2xl font-black text-emerald-400">
                {profile?.strong_concepts.length || 0}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 col-span-2 sm:col-span-1">
              <span className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
                {isHi ? "पुनरावलोकन लक्ष्य" : "Target Weak Areas"}
              </span>
              <span className="text-2xl font-black text-amber-400">
                {profile?.weak_concepts.length || 0}
              </span>
            </div>
          </div>

          {/* Mastered Concepts */}
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>{isHi ? "सत्यापित महारत (Mastered Concepts)" : "Verified Masteries"}</span>
            </div>
            {profile?.strong_concepts && profile.strong_concepts.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profile.strong_concepts.map((c, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 rounded-xl bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 text-xs font-medium"
                  >
                    ✓ {c}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No masteries recorded yet.</p>
            )}
          </div>

          {/* Weak Focus Areas */}
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 mb-2.5">
              <XCircle className="w-4 h-4" />
              <span>{isHi ? "सक्रिय सुदृढ़ीकरण बिंदु (Weak Areas)" : "Active Reinforcement Targets"}</span>
            </div>
            {profile?.weak_concepts && profile.weak_concepts.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profile.weak_concepts.map((c, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 rounded-xl bg-amber-950/60 text-amber-300 border border-amber-800/40 text-xs font-medium"
                  >
                    ⚠ {c}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-emerald-400">No active conceptual deficits! 🎉</p>
            )}
          </div>

          {/* Session History */}
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2.5">
              <History className="w-4 h-4" />
              <span>{isHi ? "सत्र इतिहास (Past Sessions)" : "Session History"}</span>
            </div>
            {profile?.session_history && profile.session_history.length > 0 ? (
              <div className="space-y-2">
                {profile.session_history.map((sess, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-sm text-slate-200">{sess.topic}</div>
                      <div className="text-[11px] text-slate-400">{sess.date}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-amber-400">{sess.score}%</span>
                      <span className="text-[10px] text-slate-500 block">Mastery</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No past sessions recorded.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
