"use client";

import React from "react";
import { LearnerProfile } from "@/lib/types";
import { ChalkWavyLine } from "./ChalkWavyLine";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs font-body">
      <div className="w-full max-w-xl bg-[#EFE9DA] text-[#2A2A26] border-2 border-[#8E9C88] rounded-sm p-6 space-y-4 max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#8E9C88]/40 pb-2">
          <div>
            <h2 className="text-xl font-serif-heading font-bold text-[#2A2A26]">
              {isHi ? "विद्यार्थी संज्ञानात्मक बहीखाता" : "Learner Cognitive Ledger"}
            </h2>
            <ChalkWavyLine className="w-24 mt-1" />
          </div>
          <button
            onClick={onClose}
            className="text-xs text-[#2A2A26] hover:text-[#E3A23B] underline font-body"
          >
            Close
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2.5 bg-[#E6DEC9] border border-[#8E9C88]/40 rounded-xs text-center">
            <div className="text-[10px] text-[#8E9C88]">Sessions</div>
            <div className="text-xl font-serif-heading font-bold text-[#2A2A26]">
              {profile?.session_history?.length || 0}
            </div>
          </div>
          <div className="p-2.5 bg-[#E6DEC9] border border-[#8E9C88]/40 rounded-xs text-center">
            <div className="text-[10px] text-[#8E9C88]">Mastered</div>
            <div className="text-xl font-serif-heading font-bold text-[#E3A23B]">
              {profile?.strong_concepts.length || 0}
            </div>
          </div>
          <div className="p-2.5 bg-[#E6DEC9] border border-[#8E9C88]/40 rounded-xs text-center">
            <div className="text-[10px] text-[#8E9C88]">Focus targets</div>
            <div className="text-xl font-serif-heading font-bold text-[#B5482F]">
              {profile?.weak_concepts.length || 0}
            </div>
          </div>
        </div>

        {/* Mastered list */}
        <div>
          <div className="text-xs font-serif-heading font-bold text-[#2A2A26] mb-1">
            Mastered concepts (सत्यापित महारत)
          </div>
          {profile?.strong_concepts && profile.strong_concepts.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {profile.strong_concepts.map((c, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 bg-[#E6DEC9] border border-[#8E9C88]/50 text-xs text-[#2A2A26] rounded-xs"
                >
                  ✓ {c}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#8E9C88] italic">No masteries recorded yet.</p>
          )}
        </div>

        {/* Focus areas */}
        <div>
          <div className="text-xs font-serif-heading font-bold text-[#B5482F] mb-1">
            Reinforcement targets (सक्रिय सुधार बिंदु)
          </div>
          {profile?.weak_concepts && profile.weak_concepts.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {profile.weak_concepts.map((c, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 bg-[#F8F3B8] border border-[#E3A23B] text-xs text-[#2A2A26] rounded-xs font-medium"
                >
                  • {c}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#8E9C88]">No active weak concepts.</p>
          )}
        </div>

        {/* Session history */}
        <div>
          <div className="text-xs font-serif-heading font-bold text-[#2A2A26] mb-1">
            Past session ledger
          </div>
          {profile?.session_history && profile.session_history.length > 0 ? (
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {profile.session_history.map((sess, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-[#E6DEC9] border border-[#8E9C88]/30 rounded-xs flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-medium text-[#2A2A26]">{sess.topic}</div>
                    <div className="text-[10px] text-[#8E9C88]">{sess.date}</div>
                  </div>
                  <div className="font-bold text-[#E3A23B]">{sess.score}%</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#8E9C88] italic">No past sessions.</p>
          )}
        </div>
      </div>
    </div>
  );
};
