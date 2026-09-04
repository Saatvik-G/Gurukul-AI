"use client";

import React, { useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Code2,
  Database,
  Layers,
  Sparkles,
  Zap,
} from "lucide-react";
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
}

const STATE_FLOW: Array<{ key: SessionState; label: string; desc: string }> = [
  { key: "explaining", label: "Explaining", desc: "Grounded RAG generation & citations" },
  { key: "questioning", label: "Questioning", desc: "Interactive checkpoint probe" },
  { key: "evaluating", label: "Evaluating", desc: "Gemini diagnostic answer grading" },
  { key: "reexplaining", label: "Re-Explaining", desc: "Novel analogy & misconception repair" },
  { key: "adapting", label: "Adapting", desc: "Calibrating depth & next node" },
  { key: "done", label: "Mastery", desc: "Lesson complete & assessment" },
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
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="w-full rounded-2xl bg-slate-950/90 border border-indigo-500/30 overflow-hidden backdrop-blur-xl shadow-2xl transition-all">
      {/* Header Bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-950 border-b border-indigo-500/20 cursor-pointer hover:bg-slate-900 transition select-none"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Activity className="w-4 h-4 animate-pulse text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                Pedagogical State Machine
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Live Active
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Deterministic cognitive loop &amp; RAG grounding engine
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-medium px-2.5 py-1 rounded-md bg-slate-800 text-slate-200 border border-slate-700">
            Node {conceptIndex + 1}/{totalConcepts || 1}
          </span>
          <button className="text-slate-400 hover:text-white p-1">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4 text-xs">
          {/* State Transition Pipeline */}
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-2">
              State Flow Execution Graph
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {STATE_FLOW.map((step) => {
                const isActive = currentState === step.key;
                const isReexplain = step.key === "reexplaining";
                return (
                  <div
                    key={step.key}
                    className={`relative p-2.5 rounded-xl border flex flex-col justify-between transition-all duration-300 ${
                      isActive
                        ? isReexplain
                          ? "bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/30 text-amber-200 shadow-lg shadow-amber-500/20"
                          : "bg-indigo-600/30 border-indigo-400 ring-2 ring-indigo-400/30 text-white shadow-lg shadow-indigo-500/20"
                        : "bg-slate-900/50 border-slate-800/80 text-slate-400 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[11px] truncate">{step.label}</span>
                      {isActive && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      )}
                    </div>
                    <span className="text-[10px] leading-tight text-slate-300 line-clamp-2">
                      {step.desc}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Context & Diagnosis Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-800">
            {/* 1. Active Concept */}
            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold mb-1.5">
                <Brain className="w-3.5 h-3.5 text-indigo-400" />
                <span>Active Knowledge Node</span>
              </div>
              <div className="font-semibold text-slate-100 truncate text-sm">{conceptName}</div>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/50 text-[10px]">
                  Depth: {targetDepth}
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px]">
                  Lang: {language.toUpperCase()}
                </span>
              </div>
            </div>

            {/* 2. Vector RAG Retrieval */}
            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-emerald-400" />
                  <span>pgvector Grounding</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">
                  {retrievedChunks.length} Chunks
                </span>
              </div>
              {retrievedChunks.length > 0 ? (
                <div className="space-y-1">
                  {retrievedChunks.slice(0, 2).map((c, i) => (
                    <div
                      key={i}
                      className="p-1.5 rounded bg-slate-950/80 border border-slate-800 text-[10px] flex items-center justify-between"
                    >
                      <span className="truncate text-slate-300">{c.concept_name}</span>
                      {c.similarity !== undefined && (
                        <span className="text-emerald-400 font-mono ml-2">
                          {(c.similarity * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-slate-500 italic">No retrieved chunks</div>
              )}
            </div>

            {/* 3. Diagnostic Misconception / Evaluator */}
            <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold mb-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Diagnostic Assessment</span>
              </div>
              {lastEvaluation ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-semibold text-xs ${
                        lastEvaluation.correct ? "text-emerald-400" : "text-amber-400"
                      }`}
                    >
                      {lastEvaluation.correct ? "✓ Correct Answer" : "⚠ Misconception Detected"}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Conf: {(lastEvaluation.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  {lastEvaluation.misconception && (
                    <p className="text-[10px] text-amber-300/90 leading-tight bg-amber-950/40 p-1.5 rounded border border-amber-800/40">
                      {lastEvaluation.misconception}
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-[11px] text-slate-500 italic">
                  Awaiting student answer evaluation...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
