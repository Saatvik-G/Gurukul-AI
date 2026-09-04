"use client";

import React, { useEffect, useRef, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import mermaid from "mermaid";
import { Check, Code, Copy, GitBranch, Layers, Sigma, Milestone } from "lucide-react";
import { VisualType } from "@/lib/types";

interface VisualRendererProps {
  type: VisualType;
  content: string;
  conceptName?: string;
}

export const VisualRenderer: React.FC<VisualRendererProps> = ({
  type,
  content,
  conceptName = "Concept Visual",
}) => {
  const [copied, setCopied] = useState(false);
  const mathRef = useRef<HTMLDivElement>(null);
  const mermaidRef = useRef<HTMLDivElement>(null);
  const [mermaidSvg, setMermaidSvg] = useState<string>("");

  // LaTeX KaTeX rendering
  useEffect(() => {
    if (type === "equation" && mathRef.current && content) {
      try {
        katex.render(content.replace(/\\n/g, "\n"), mathRef.current, {
          displayMode: true,
          throwOnError: false,
        });
      } catch (err) {
        console.warn("KaTeX render notice:", err);
      }
    }
  }, [type, content]);

  // Mermaid diagram rendering
  useEffect(() => {
    if (type === "diagram" && content) {
      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          securityLevel: "loose",
          fontFamily: "inherit",
          themeVariables: {
            primaryColor: "#4f46e5",
            primaryTextColor: "#ffffff",
            primaryBorderColor: "#6366f1",
            lineColor: "#818cf8",
            secondaryColor: "#1e1b4b",
            tertiaryColor: "#0f172a",
          },
        });

        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const cleanGraph = content.trim().replace(/\\n/g, "\n");
        mermaid.render(id, cleanGraph).then((res) => {
          setMermaidSvg(res.svg);
        }).catch((err) => {
          console.warn("Mermaid render notice:", err);
          // Fallback diagram
          mermaid.render(id, "graph TD\n  A[Concept Principle] --> B[Processing] --> C[Output Result]").then((res) => {
            setMermaidSvg(res.svg);
          }).catch(() => {});
        });
      } catch (err) {
        console.warn("Mermaid init error:", err);
      }
    }
  }, [type, content]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (type === "none" || !content) {
    return (
      <div className="h-full min-h-[220px] rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col items-center justify-center p-6 text-center text-slate-400">
        <Layers className="w-10 h-10 text-indigo-400/50 mb-2 animate-pulse" />
        <p className="text-sm font-medium text-slate-300">Grounded Conceptual Module</p>
        <p className="text-xs text-slate-500 mt-1">Focus on audio &amp; interactive checkpoint questioning</p>
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl overflow-hidden backdrop-blur-md flex flex-col">
      {/* Visual Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          {type === "equation" && <Sigma className="w-4 h-4 text-pink-400" />}
          {type === "diagram" && <GitBranch className="w-4 h-4 text-indigo-400" />}
          {type === "code" && <Code className="w-4 h-4 text-emerald-400" />}
          {type === "timeline" && <Milestone className="w-4 h-4 text-amber-400" />}
          <span className="capitalize">{type} Visual Aid: {conceptName}</span>
        </div>

        {type === "code" && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        )}
      </div>

      {/* Visual Body */}
      <div className="p-5 flex-1 flex items-center justify-center min-h-[240px] overflow-auto">
        {/* EQUATION / LATEX */}
        {type === "equation" && (
          <div className="text-center py-4 px-2 w-full overflow-x-auto text-xl text-slate-100">
            <div ref={mathRef} />
          </div>
        )}

        {/* DIAGRAM / MERMAID */}
        {type === "diagram" && (
          <div className="w-full flex justify-center items-center py-2">
            {mermaidSvg ? (
              <div
                dangerouslySetInnerHTML={{ __html: mermaidSvg }}
                className="w-full flex justify-center [&>svg]:max-h-[280px] [&>svg]:w-auto"
              />
            ) : (
              <div className="flex items-center gap-2 text-slate-400 text-xs animate-pulse">
                <GitBranch className="w-4 h-4 text-indigo-400" />
                <span>Rendering interactive diagram...</span>
              </div>
            )}
          </div>
        )}

        {/* CODE BLOCK */}
        {type === "code" && (
          <pre className="w-full p-4 rounded-xl bg-slate-950 text-emerald-300 font-mono text-xs sm:text-sm overflow-x-auto border border-slate-800 leading-relaxed">
            <code>{content}</code>
          </pre>
        )}

        {/* TIMELINE */}
        {type === "timeline" && (
          <div className="w-full space-y-3 py-2">
            {content.split(/->|\n/).map((step, idx) => {
              const clean = step.trim();
              if (!clean) return null;
              return (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs border border-amber-500/40 shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-200">{clean}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
