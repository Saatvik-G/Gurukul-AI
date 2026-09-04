"use client";

import React from "react";
import { ConceptPlan } from "@/lib/types";

interface ConceptMapGraphProps {
  concepts: ConceptPlan[];
  currentIndex: number;
  masteries?: Record<number, "turmeric" | "sindoor" | "moss">;
}

export const ConceptMapGraph: React.FC<ConceptMapGraphProps> = ({
  concepts,
  currentIndex,
  masteries = {},
}) => {
  return (
    <div className="p-3 bg-[#EFE9DA] border border-[#8E9C88]/40 text-[#2A2A26] rounded-sm">
      <div className="text-xs font-serif-heading font-bold text-[#2A2A26] mb-2 border-b border-[#8E9C88]/30 pb-1 flex items-center justify-between">
        <span>Concept Graph (संकल्पना चित्र)</span>
        <span className="text-[10px] font-body text-[#8E9C88]">Growing map</span>
      </div>

      {/* Schematic Nodes */}
      <div className="space-y-2 py-1">
        {concepts.map((concept, idx) => {
          const isCurrent = idx === currentIndex;
          const status = masteries[idx] || (idx < currentIndex ? "turmeric" : idx === currentIndex ? "turmeric" : "moss");
          const isSindoor = masteries[idx] === "sindoor";

          let circleColor = "#8E9C88";
          let labelColor = "text-[#8E9C88]";
          let statusText = "Upcoming";

          if (status === "turmeric" && !isSindoor) {
            circleColor = "#E3A23B";
            labelColor = "text-[#2A2A26] font-medium";
            statusText = isCurrent ? "In progress" : "Understood (1st try)";
          } else if (isSindoor) {
            circleColor = "#B5482F";
            labelColor = "text-[#B5482F] font-medium";
            statusText = "Re-explained";
          }

          return (
            <div key={idx} className="relative flex items-center gap-2.5">
              {/* Vertical connector line */}
              {idx < concepts.length - 1 && (
                <div
                  className="absolute left-2.5 top-5 w-[1.5px] h-4 bg-[#8E9C88]/50 pointer-events-none"
                />
              )}

              {/* Node Circle */}
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 border"
                style={{
                  backgroundColor: circleColor,
                  color: circleColor === "#E3A23B" ? "#2A2A26" : "#F3EFE3",
                  borderColor: circleColor,
                }}
              >
                {idx + 1}
              </div>

              {/* Concept Label */}
              <div className="flex-1 min-w-0">
                <div className={`text-xs truncate ${labelColor}`}>
                  {concept.name}
                </div>
                <div className="text-[9px] text-[#8E9C88] leading-none">
                  {statusText} {concept.interaction_type === "feynman" && "• Feynman"}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 pt-2 border-t border-[#8E9C88]/30 flex items-center justify-between text-[9px] text-[#8E9C88]">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#E3A23B]" /> Understood
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#B5482F]" /> Re-explained
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#8E9C88]" /> Upcoming
        </span>
      </div>
    </div>
  );
};
