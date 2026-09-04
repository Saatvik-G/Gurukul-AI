"use client";

import React, { useEffect, useState } from "react";

interface AvatarCanvasProps {
  amplitude: number; // 0.0 to 1.0 (Web Audio API AnalyserNode)
  isSpeaking: boolean;
  teacherMood?: "welcoming" | "explaining" | "encouraging" | "correcting";
  size?: number;
}

export const AvatarCanvas: React.FC<AvatarCanvasProps> = ({
  amplitude,
  isSpeaking,
  teacherMood = "explaining",
  size = 200,
}) => {
  const [blink, setBlink] = useState(false);
  const [smoothedAmp, setSmoothedAmp] = useState(0);

  // Smooth amplitude updates
  useEffect(() => {
    const target = isSpeaking ? Math.min(1, amplitude * 1.8) : 0;
    const interval = setInterval(() => {
      setSmoothedAmp((prev) => prev + (target - prev) * 0.35);
    }, 30);
    return () => clearInterval(interval);
  }, [amplitude, isSpeaking]);

  // Natural blinking cycle
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 180);
    }, 4000 + Math.random() * 2000);
    return () => clearInterval(blinkInterval);
  }, []);

  // Calculate dynamic mouth geometry
  const mouthOpenHeight = Math.max(3, smoothedAmp * 22);
  const mouthWidth = 24 + smoothedAmp * 8;
  const mouthY = 152 + smoothedAmp * 3;

  return (
    <div className="flex flex-col items-center">
      {/* Chalk-dust inset rectangular window */}
      <div className="chalk-inset-window p-3 rounded-sm flex flex-col items-center justify-center">
        <svg
          width={size}
          height={size}
          viewBox="0 0 240 240"
          className="relative z-10"
        >
          <defs>
            <linearGradient id="guruSkin" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e8b18d" />
              <stop offset="100%" stopColor="#d4936a" />
            </linearGradient>

            <linearGradient id="guruTurban" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E3A23B" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
          </defs>

          {/* Chalkboard halo circle */}
          <circle cx="120" cy="120" r="105" fill="#1B2D24" stroke="#8E9C88" strokeWidth="1" strokeDasharray="3 3" />

          {/* Traditional Guru Turban */}
          <path
            d="M 50 100 Q 120 25 190 100 Q 200 65 160 40 Q 120 25 80 40 Q 40 65 50 100 Z"
            fill="url(#guruTurban)"
          />
          <circle cx="120" cy="55" r="6" fill="#F3EFE3" />
          <circle cx="120" cy="55" r="3" fill="#B5482F" />

          {/* Face Base */}
          <path
            d="M 65 95 C 65 65, 175 65, 175 95 C 175 160, 155 195, 120 195 C 85 195, 65 160, 65 95 Z"
            fill="url(#guruSkin)"
          />

          {/* Tilak */}
          <path d="M 117 76 Q 120 70 123 76 L 122 88 Q 120 90 118 88 Z" fill="#B5482F" />
          <circle cx="120" cy="92" r="2" fill="#E3A23B" />

          {/* Left Eyebrow */}
          <path
            d="M 78 91 Q 92 86 104 91"
            stroke="#2A2A26"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />

          {/* Right Eyebrow */}
          <path
            d="M 136 91 Q 148 86 162 91"
            stroke="#2A2A26"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />

          {/* Left Eye */}
          {blink ? (
            <path d="M 80 108 Q 92 112 104 108" stroke="#2A2A26" strokeWidth="2.5" fill="none" />
          ) : (
            <g>
              <ellipse cx="92" cy="107" rx="9" ry="6" fill="#F3EFE3" />
              <circle cx="92" cy="107" r="4" fill="#2A2A26" />
              <circle cx="90.5" cy="105" r="1.2" fill="#F3EFE3" />
            </g>
          )}

          {/* Right Eye */}
          {blink ? (
            <path d="M 136 108 Q 148 112 160 108" stroke="#2A2A26" strokeWidth="2.5" fill="none" />
          ) : (
            <g>
              <ellipse cx="148" cy="107" rx="9" ry="6" fill="#F3EFE3" />
              <circle cx="148" cy="107" r="4" fill="#2A2A26" />
              <circle cx="146.5" cy="105" r="1.2" fill="#F3EFE3" />
            </g>
          )}

          {/* Nose */}
          <path
            d="M 120 104 L 117 128 Q 120 132 123 128 Z"
            stroke="#c2835a"
            strokeWidth="2"
            fill="#d4936a"
          />

          {/* Glasses */}
          <g stroke="#E3A23B" strokeWidth="1.6" fill="rgba(243,239,227,0.1)">
            <circle cx="92" cy="107" r="13" />
            <circle cx="148" cy="107" r="13" />
            <path d="M 105 107 Q 120 104 135 107" fill="none" strokeWidth="1.8" />
          </g>

          {/* Mustache */}
          <path
            d="M 98 143 Q 120 148 142 143 Q 132 148 120 146 Q 108 148 98 143 Z"
            fill="#2A2A26"
          />

          {/* Mouth - Amplitude Driven */}
          {smoothedAmp > 0.08 ? (
            <g>
              <ellipse
                cx="120"
                cy={mouthY}
                rx={mouthWidth / 2}
                ry={mouthOpenHeight / 2}
                fill="#7f1d1d"
              />
              <path
                d={`M ${120 - mouthWidth / 3} ${mouthY - mouthOpenHeight / 4} Q 120 ${
                  mouthY - mouthOpenHeight / 6
                } ${120 + mouthWidth / 3} ${mouthY - mouthOpenHeight / 4}`}
                stroke="#F3EFE3"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </g>
          ) : (
            <path
              d="M 106 150 Q 120 155 134 150"
              stroke="#2A2A26"
              strokeWidth="2.8"
              strokeLinecap="round"
              fill="none"
            />
          )}

          {/* Beard */}
          <path
            d="M 75 140 C 75 185 100 205 120 205 C 140 205 165 185 165 140 Q 150 160 120 162 Q 90 160 75 140 Z"
            fill="#1E1E1C"
          />
        </svg>

        {/* Status label under avatar in Work Sans (no monospace) */}
        <div className="mt-2 text-[11px] font-body text-[#8E9C88] flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              isSpeaking ? "bg-[#E3A23B]" : "bg-[#8E9C88]"
            }`}
          />
          <span>{isSpeaking ? "Speaking" : "Listening"}</span>
        </div>
      </div>
    </div>
  );
};
