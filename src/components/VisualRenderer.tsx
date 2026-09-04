"use client";

import React, { useEffect, useRef, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import mermaid from "mermaid";
import { VisualType } from "@/lib/types";

interface VisualRendererProps {
  type: VisualType;
  content: string;
  conceptName?: string;
}

export const VisualRenderer: React.FC<VisualRendererProps> = ({
  type,
  content,
  conceptName = "Board Visual",
}) => {
  const [copied, setCopied] = useState(false);
  const mathRef = useRef<HTMLDivElement>(null);
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
          theme: "base",
          themeVariables: {
            primaryColor: "#EFE9DA",
            primaryTextColor: "#2A2A26",
            primaryBorderColor: "#8E9C88",
            lineColor: "#E3A23B",
            secondaryColor: "#EFE9DA",
            tertiaryColor: "#F3EFE3",
            fontFamily: "Work Sans, sans-serif",
          },
        });

        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const cleanGraph = content.trim().replace(/\\n/g, "\n");
        mermaid.render(id, cleanGraph).then((res) => {
          setMermaidSvg(res.svg);
        }).catch(() => {
          mermaid.render(id, "graph TD\n  A[Concept Principle] --> B[Mechanism] --> C[Outcome]").then((res) => {
            setMermaidSvg(res.svg);
          }).catch(() => {});
        });
      } catch (err) {
        console.warn("Mermaid error:", err);
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
      <div className="h-full min-h-[160px] p-4 bg-[#1B2D24] border border-[#8E9C88]/40 rounded-sm flex items-center justify-center text-xs text-[#8E9C88] font-body text-center">
        Conceptual explanation in progress. Listen to the guru and follow on-screen notes.
      </div>
    );
  }

  return (
    <div className="w-full border border-[#8E9C88] bg-[#EFE9DA] text-[#2A2A26] rounded-sm font-body overflow-hidden">
      {/* Visual Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#E6DEC9] border-b border-[#8E9C88]/40 text-xs">
        <span className="font-semibold text-[#2A2A26]">
          {type === "equation" && "Mathematical Equation"}
          {type === "diagram" && "Concept Diagram"}
          {type === "code" && "Code Snippet"}
          {type === "timeline" && "Sequence Timeline"}
        </span>

        {type === "code" && (
          <button
            onClick={handleCopy}
            className="text-[11px] text-[#2A2A26] hover:text-[#E3A23B] underline underline-offset-2"
          >
            {copied ? "Copied" : "Copy code"}
          </button>
        )}
      </div>

      {/* Visual Body */}
      <div className="p-4 flex items-center justify-center min-h-[160px] overflow-x-auto text-[#2A2A26]">
        {/* EQUATION */}
        {type === "equation" && (
          <div className="text-center py-2 px-2 w-full text-lg">
            <div ref={mathRef} />
          </div>
        )}

        {/* DIAGRAM */}
        {type === "diagram" && (
          <div className="w-full flex justify-center py-1">
            {mermaidSvg ? (
              <div
                dangerouslySetInnerHTML={{ __html: mermaidSvg }}
                className="w-full flex justify-center [&>svg]:max-h-[220px]"
              />
            ) : (
              <div className="text-xs text-[#8E9C88]">Rendering diagram...</div>
            )}
          </div>
        )}

        {/* CODE */}
        {type === "code" && (
          <pre className="w-full p-3 bg-[#22362B] text-[#F3EFE3] text-xs overflow-x-auto border border-[#8E9C88]/40 leading-relaxed rounded-sm">
            <code>{content}</code>
          </pre>
        )}

        {/* TIMELINE */}
        {type === "timeline" && (
          <div className="w-full space-y-2 py-1">
            {content.split(/->|\n/).map((step, idx) => {
              const clean = step.trim();
              if (!clean) return null;
              return (
                <div key={idx} className="flex items-start gap-2.5 p-2 bg-[#E6DEC9] border border-[#8E9C88]/40 rounded-sm text-xs">
                  <span className="w-5 h-5 rounded-full bg-[#E3A23B] text-[#2A2A26] font-bold text-[11px] flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-[#2A2A26]">{clean}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
