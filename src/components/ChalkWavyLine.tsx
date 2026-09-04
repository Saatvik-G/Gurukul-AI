"use client";

import React from "react";

export const ChalkWavyLine: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <svg
      viewBox="0 0 120 8"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`h-2 w-28 text-[#E3A23B] ${className}`}
      preserveAspectRatio="none"
    >
      <path
        d="M 2 4 Q 15 1, 30 4 T 60 4 T 90 4 T 118 4"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
};
