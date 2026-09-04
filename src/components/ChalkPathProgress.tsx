"use client";

import React from "react";
import { ConceptPlan } from "@/lib/types";

interface ChalkPathProgressProps {
  concepts: ConceptPlan[];
  currentIndex: number;
  masteries?: Record<number, "turmeric" | "sindoor" | "moss">;
}

export const ChalkPathProgress: React.FC<ChalkPathProgressProps> = ({
  concepts,
  currentIndex,
  masteries = {},
}) => {
  return (
    <div className="w-full py-2">
      <div className="flex items-center justify-between relative max-w-full overflow-x-auto pb-1">
        {/* Chalk dashed connector track */}
        <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 h-[2px] border-t-2 border-dashed border-[#8E9C88]/40 pointer-events-none z-0" />

        {concepts.map((concept, idx) => {
          const isCurrent = idx === currentIndex;
          const mastery = masteries[idx];

          let nodeBg = "bg-[#22362B] text-[#8E9C88] border-[#8E9C88]/60";
          if (mastery === "turmeric") {
            nodeBg = "bg-[#E3A23B] text-[#2A2A26] border-[#E3A23B] font-bold";
          } else if (mastery === "sindoor") {
            nodeBg = "bg-[#B5482F] text-[#F3EFE3] border-[#B5482F] font-bold";
          } else if (isCurrent) {
            nodeBg = "bg-[#F3EFE3] text-[#22362B] border-[#E3A23B] ring-2 ring-[#E3A23B] font-bold";
          }

          return (
            <div key={idx} className="relative z-10 flex flex-col items-center shrink-0 px-2 group">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs border-2 transition-colors ${nodeBg}`}
              >
                {idx + 1}
              </div>
              <span
                className={`mt-1 text-[11px] max-w-[80px] truncate text-center font-body ${
                  isCurrent ? "text-[#E3A23B] font-medium" : "text-[#8E9C88]"
                }`}
              >
                {concept.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
