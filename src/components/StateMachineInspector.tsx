"use client";

import React, { useState } from "react";
import { EvaluationResult, SessionState } from "@/lib/types";

interface StateMachineInspectorProps {
  currentState: SessionState;
  conceptName: string;
  conceptIndex: number;
  totalConcepts: number;
  retrievedChunks?: Array<{ concept_name: string; definition?: string; similarity?: number }>;
  lastEvaluation?: EvaluationResult | null;
  targetDepth?: string;
  language?: string;
  interactionType?: string;
}

const STATE_FLOW: Array<{ key: SessionState; label: string }> = [
  { key: "explaining", label: "Explaining" },
  { key: "questioning", label: "Questioning" },
  { key: "evaluating", label: "Evaluating" },
  { key: "hinting", label: "Supportive Hint" },
  { key: "reexplaining", label: "Re-explaining" },
  { key: "adapting", label: "Adapting" },
  { key: "done", label: "Mastery" },
];

export const StateMachineInspector: React.FC<StateMachineInspectorProps> = ({
  currentState,
  conceptName,
  conceptIndex,
  totalConcepts,
  retrievedChunks = [],
  lastEvaluation,
  targetDepth = "beginner",
  language = "en",
  interactionType = "question",
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="w-full border border-[#8E9C88]/50 bg-[#1B2D24] text-[#F3EFE3] rounded-sm font-body">
      {/* Header Bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between px-4 py-2.5 bg-[#17261E] border-b border-[#8E9C88]/40 cursor-pointer select-none"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-serif-heading font-bold text-[#E3A23B]">
            Pedagogical State Machine
          </span>
          <span className="text-[11px] text-[#8E9C88]">
            (Concept {conceptIndex + 1} of {totalConcepts || 1})
          </span>
        </div>

        <button className="text-xs text-[#8E9C88] hover:text-[#F3EFE3]">
          {isExpanded ? "Hide inspector" : "Show inspector"}
        </button>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-3 text-xs">
          {/* State Sequence */}
          <div>
            <div className="text-[11px] text-[#8E9C88] mb-1.5 font-medium">
              Active Cognitive Cycle:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5">
              {STATE_FLOW.map((step) => {
                const isActive = currentState === step.key;
                const isReexplain = step.key === "reexplaining";

                let stepClass = "bg-[#22362B] text-[#8E9C88] border-[#8E9C88]/40";
                if (isActive) {
                  stepClass = isReexplain
                    ? "bg-[#B5482F] text-[#F3EFE3] border-[#B5482F] font-bold"
                    : "bg-[#E3A23B] text-[#2A2A26] border-[#E3A23B] font-bold";
                }

                return (
                  <div
                    key={step.key}
                    className={`p-2 border rounded-sm flex items-center justify-between text-xs ${stepClass}`}
                  >
                    <span>{step.label}</span>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Details Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-[#8E9C88]/30">
            {/* Active Node */}
            <div className="p-2.5 bg-[#22362B] border border-[#8E9C88]/40 rounded-sm">
              <div className="text-[11px] text-[#8E9C88] mb-1">Knowledge Node</div>
              <div className="text-xs font-semibold text-[#F3EFE3] truncate">{conceptName}</div>
              <div className="text-[10px] text-[#8E9C88] mt-1">
                Level: {targetDepth} • Mode: {interactionType === "feynman" ? "Feynman" : "Direct Q&A"}
              </div>
            </div>

            {/* RAG Citations */}
            <div className="p-2.5 bg-[#22362B] border border-[#8E9C88]/40 rounded-sm">
              <div className="text-[11px] text-[#8E9C88] mb-1">
                pgvector Citations ({retrievedChunks.length})
              </div>
              {retrievedChunks.length > 0 ? (
                <div className="space-y-1">
                  {retrievedChunks.slice(0, 2).map((c, i) => (
                    <div key={i} className="text-[10px] text-[#F3EFE3] truncate">
                      • {c.concept_name}{" "}
                      {c.similarity !== undefined && (
                        <span className="text-[#E3A23B]">
                          ({Math.round(c.similarity * 100)}%)
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[10px] text-[#8E9C88] italic">No active chunks</div>
              )}
            </div>

            {/* Diagnostic Result */}
            <div className="p-2.5 bg-[#22362B] border border-[#8E9C88]/40 rounded-sm">
              <div className="text-[11px] text-[#8E9C88] mb-1">Diagnostic Evaluation</div>
              {lastEvaluation ? (
                <div>
                  <div
                    className={`text-xs font-semibold ${
                      lastEvaluation.correct ? "text-[#E3A23B]" : "text-[#B5482F]"
                    }`}
                  >
                    {lastEvaluation.correct
                      ? "Understood"
                      : lastEvaluation.interaction_type === "feynman"
                      ? "Feynman Gaps Detected"
                      : "Misconception Diagnosed"}
                  </div>
                  {lastEvaluation.misconception && (
                    <div className="text-[10px] text-[#F3EFE3]/90 mt-1 leading-snug">
                      {lastEvaluation.misconception}
                    </div>
                  )}
                  {lastEvaluation.gaps && lastEvaluation.gaps.length > 0 && (
                    <div className="text-[10px] text-[#B5482F] mt-1">
                      Gaps: {lastEvaluation.gaps.join("; ")}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-[10px] text-[#8E9C88] italic">Awaiting response</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
