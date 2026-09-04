"use client";

import React, { useEffect, useRef, useState } from "react";
import { Sparkles, Volume2, VolumeX } from "lucide-react";

interface AvatarCanvasProps {
  amplitude: number; // 0.0 to 1.0 (driven by Web Audio API AnalyserNode)
  isSpeaking: boolean;
  teacherMood?: "welcoming" | "explaining" | "encouraging" | "correcting";
  size?: number;
}

export const AvatarCanvas: React.FC<AvatarCanvasProps> = ({
  amplitude,
  isSpeaking,
  teacherMood = "explaining",
  size = 280,
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
    }, 3800 + Math.random() * 2000);
    return () => clearInterval(blinkInterval);
  }, []);

  // Calculate dynamic mouth geometry based on audio amplitude
  const mouthOpenHeight = Math.max(3, smoothedAmp * 24);
  const mouthWidth = 24 + smoothedAmp * 8;
  const mouthY = 152 + smoothedAmp * 3;

  // Eyebrows styling based on teacher mood
  const leftEyebrowY = teacherMood === "encouraging" ? 88 : teacherMood === "correcting" ? 94 : 91;
  const rightEyebrowY = teacherMood === "encouraging" ? 88 : 91;

  return (
    <div className="relative flex flex-col items-center justify-center">
      {/* Teacher Ambient Glow Aura */}
      <div
        className={`absolute inset-0 rounded-full blur-2xl transition-all duration-700 pointer-events-none ${
          isSpeaking
            ? "bg-amber-400/25 scale-110 opacity-100"
            : teacherMood === "correcting"
            ? "bg-orange-500/20 scale-100 opacity-70"
            : "bg-indigo-500/20 scale-95 opacity-50"
        }`}
        style={{ width: size, height: size }}
      />

      {/* Main SVG Avatar Face */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 240 240"
        className="relative z-10 transition-transform duration-300 drop-shadow-xl"
        style={{
          transform: isSpeaking ? `translateY(${Math.sin(Date.now() / 200) * 1.5}px)` : "none",
        }}
      >
        <defs>
          <linearGradient id="guruSkin" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f7d0b3" />
            <stop offset="100%" stopColor="#e8b18d" />
          </linearGradient>

          <linearGradient id="guruTurban" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>

          <linearGradient id="guruGlow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
          </linearGradient>

          <radialGradient id="eyeIris" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#4338ca" />
            <stop offset="100%" stopColor="#1e1b4b" />
          </radialGradient>
        </defs>

        {/* Aura Ring */}
        <circle cx="120" cy="120" r="110" fill="url(#guruGlow)" />

        {/* Traditional Guru Turban / Crown Halo */}
        <path
          d="M 50 100 Q 120 20 190 100 Q 200 65 160 40 Q 120 25 80 40 Q 40 65 50 100 Z"
          fill="url(#guruTurban)"
        />
        <circle cx="120" cy="55" r="7" fill="#fbbf24" />
        <circle cx="120" cy="55" r="3.5" fill="#ef4444" />

        {/* Face Base */}
        <path
          d="M 65 95 C 65 65, 175 65, 175 95 C 175 160, 155 195, 120 195 C 85 195, 65 160, 65 95 Z"
          fill="url(#guruSkin)"
        />

        {/* Tilak / Third-Eye Mark of Wisdom */}
        <path d="M 117 76 Q 120 70 123 76 L 122 88 Q 120 90 118 88 Z" fill="#dc2626" />
        <circle cx="120" cy="92" r="2" fill="#fbbf24" />

        {/* Left Eyebrow */}
        <path
          d={`M 78 ${leftEyebrowY} Q 92 ${leftEyebrowY - 5} 104 ${leftEyebrowY}`}
          stroke="#451a03"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Right Eyebrow */}
        <path
          d={`M 136 ${rightEyebrowY} Q 148 ${rightEyebrowY - 5} 162 ${rightEyebrowY}`}
          stroke="#451a03"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Left Eye */}
        {blink ? (
          <path d="M 80 108 Q 92 112 104 108" stroke="#312e81" strokeWidth="2.5" fill="none" />
        ) : (
          <g>
            <ellipse cx="92" cy="107" rx="10" ry="7" fill="#ffffff" />
            <circle cx="92" cy="107" r="4.5" fill="url(#eyeIris)" />
            <circle cx="90.5" cy="105" r="1.5" fill="#ffffff" />
          </g>
        )}

        {/* Right Eye */}
        {blink ? (
          <path d="M 136 108 Q 148 112 160 108" stroke="#312e81" strokeWidth="2.5" fill="none" />
        ) : (
          <g>
            <ellipse cx="148" cy="107" rx="10" ry="7" fill="#ffffff" />
            <circle cx="148" cy="107" r="4.5" fill="url(#eyeIris)" />
            <circle cx="146.5" cy="105" r="1.5" fill="#ffffff" />
          </g>
        )}

        {/* Nose */}
        <path
          d="M 120 104 L 117 128 Q 120 132 123 128 Z"
          stroke="#c2835a"
          strokeWidth="2"
          fill="#d4936a"
          strokeLinejoin="round"
        />

        {/* Guru Glasses (Academic & Wise) */}
        <g stroke="#3b82f6" strokeWidth="1.8" fill="rgba(255,255,255,0.15)">
          <circle cx="92" cy="107" r="14" />
          <circle cx="148" cy="107" r="14" />
          <path d="M 106 107 Q 120 103 134 107" fill="none" strokeWidth="2" />
        </g>

        {/* Mustache */}
        <path
          d="M 98 143 Q 120 148 142 143 Q 132 148 120 146 Q 108 148 98 143 Z"
          fill="#3b2210"
        />

        {/* Mouth - Amplitude Driven (Web Audio API AnalyserNode) */}
        {smoothedAmp > 0.08 ? (
          <g>
            {/* Open mouth cavity */}
            <ellipse
              cx="120"
              cy={mouthY}
              rx={mouthWidth / 2}
              ry={mouthOpenHeight / 2}
              fill="#7f1d1d"
            />
            {/* Upper teeth */}
            <path
              d={`M ${120 - mouthWidth / 3} ${mouthY - mouthOpenHeight / 4} Q 120 ${
                mouthY - mouthOpenHeight / 6
              } ${120 + mouthWidth / 3} ${mouthY - mouthOpenHeight / 4}`}
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Tongue */}
            <ellipse
              cx="120"
              cy={mouthY + mouthOpenHeight / 4}
              rx={mouthWidth / 3}
              ry={mouthOpenHeight / 4}
              fill="#f87171"
            />
          </g>
        ) : (
          /* Closed smiling mouth */
          <path
            d="M 106 150 Q 120 156 134 150"
            stroke="#78350f"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
        )}

        {/* Neatly Groomed Guru Beard */}
        <path
          d="M 75 140 C 75 185 100 205 120 205 C 140 205 165 185 165 140 Q 150 160 120 162 Q 90 160 75 140 Z"
          fill="#29180d"
          opacity="0.95"
        />
      </svg>

      {/* Voice Activity Status Badge */}
      <div className="mt-3 flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-700 text-xs font-medium text-slate-300 backdrop-blur-md shadow-md">
        {isSpeaking ? (
          <>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <Volume2 className="w-3.5 h-3.5" /> Speaking
            </span>
          </>
        ) : (
          <>
            <span className="h-2 w-2 rounded-full bg-slate-500"></span>
            <span className="text-slate-400 flex items-center gap-1">
              <VolumeX className="w-3.5 h-3.5" /> Listening / Waiting
            </span>
          </>
        )}
      </div>
    </div>
  );
};
