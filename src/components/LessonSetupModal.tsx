"use client";

import React, { useState } from "react";
import {
  BookOpen,
  Calendar,
  Clock,
  FileText,
  Flame,
  Globe2,
  GraduationCap,
  Layers,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import { Language, LearnerDepth } from "@/lib/types";

interface LessonSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartLesson: (config: {
    file?: File;
    topic?: string;
    timeMinutes: number;
    depth: LearnerDepth;
    language: Language;
  }) => void;
  priorWeakConcepts?: string[];
  initialLanguage?: Language;
}

const SAMPLE_TOPICS = [
  {
    en: "Quantum Superposition & Qubits",
    hi: "क्वांटम सुपरपोजिशन और क्यूबिट्स",
    visual: "diagram",
  },
  {
    en: "Photosynthesis & The Calvin Cycle",
    hi: "प्रकाश संश्लेषण और केल्विन चक्र",
    visual: "equation",
  },
  {
    en: "Neural Attention Mechanism & Transformers",
    hi: "ट्रांसफॉर्मर और न्यूरल अटेंशन मैकेनिज्म",
    visual: "code",
  },
  {
    en: "Calculus: Derivatives & Chain Rule",
    hi: "कैलकुलस: अवकलज और श्रृंखला नियम",
    visual: "equation",
  },
];

export const LessonSetupModal: React.FC<LessonSetupModalProps> = ({
  isOpen,
  onClose,
  onStartLesson,
  priorWeakConcepts = [],
  initialLanguage = "en",
}) => {
  const [activeTab, setActiveTab] = useState<"topic" | "upload">("topic");
  const [topic, setTopic] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [timeMinutes, setTimeMinutes] = useState<number>(20);
  const [depth, setDepth] = useState<LearnerDepth>("beginner");
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === "topic" && !topic.trim()) return;
    if (activeTab === "upload" && !selectedFile) return;

    setIsLoading(true);
    onStartLesson({
      file: activeTab === "upload" ? selectedFile || undefined : undefined,
      topic: activeTab === "topic" ? topic : undefined,
      timeMinutes,
      depth,
      language,
    });
  };

  const isHi = language === "hi";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8">
        {/* Glow Header */}
        <div className="relative p-6 bg-gradient-to-r from-amber-600/20 via-indigo-900/30 to-purple-900/20 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30">
                <Flame className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {isHi ? "गुरुकुल AI सत्र प्रारंभ करें" : "Configure Your Gurukul AI Session"}
                </h2>
                <p className="text-xs text-slate-400">
                  {isHi
                    ? "दस्तावेज़ अपलोड करें या कोई भी विषय चुनें"
                    : "Upload learning material or choose any custom topic"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Personalization Alert if prior weak concepts found */}
          {priorWeakConcepts.length > 0 && (
            <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2.5 text-xs text-amber-200">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                {isHi
                  ? `व्यक्तिगत अनुकूलन: आपके पिछले सत्र के कमजोर बिंदु (${priorWeakConcepts.slice(0, 2).join(", ")}) इस पाठ में स्वतः शामिल होंगे।`
                  : `Personalized Adaptation: Detected prior focus areas (${priorWeakConcepts.slice(0, 2).join(", ")}). Gurukul will seamlessly reinforce them.`}
              </span>
            </div>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Ingestion Mode Tabs */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              {isHi ? "1. ज्ञान का स्रोत (Input Source)" : "1. Learning Source"}
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-950 border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab("topic")}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-xs transition ${
                  activeTab === "topic"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>{isHi ? "विषय दर्ज करें (Free Topic)" : "Topic Prompt"}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("upload")}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-xs transition ${
                  activeTab === "upload"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <UploadCloud className="w-4 h-4" />
                <span>{isHi ? "दस्तावेज़ अपलोड (PDF/DOCX/PPTX)" : "Upload File"}</span>
              </button>
            </div>
          </div>

          {/* Topic Input or File Upload */}
          {activeTab === "topic" ? (
            <div className="space-y-3">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={
                  isHi
                    ? "उदा. क्वांटम कंप्यूटिंग और क्यूबिट्स, प्रकाश संश्लेषण, आदि..."
                    : "e.g., Quantum Computing Basics, DNA Replication, Transformers..."
                }
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-100 placeholder-slate-500 text-sm outline-none transition"
              />

              {/* Sample Topic Chips */}
              <div className="flex flex-wrap gap-2">
                {SAMPLE_TOPICS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setTopic(isHi ? item.hi : item.en)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800/70 hover:bg-slate-800 text-[11px] text-slate-300 border border-slate-700 hover:border-slate-600 transition"
                  >
                    + {isHi ? item.hi : item.en}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="relative border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-6 text-center cursor-pointer transition bg-slate-950/50">
              <input
                type="file"
                accept=".pdf,.docx,.pptx,.txt"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0]);
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <div className="flex flex-col items-center justify-center gap-2">
                <FileText className="w-10 h-10 text-indigo-400" />
                <div className="text-sm font-semibold text-slate-200">
                  {selectedFile ? selectedFile.name : isHi ? "फ़ाइल चुनें या यहाँ खींचें" : "Drop your PDF, DOCX, or PPTX"}
                </div>
                <div className="text-xs text-slate-500">
                  {isHi ? "अधिकतम आकार: 25MB" : "Up to 25MB • Grounded RAG & vector embedding"}
                </div>
              </div>
            </div>
          )}

          {/* Time & Roadmap Selector (5m, 20m, 60m, 7-day) */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              {isHi ? "2. उपलब्ध समय एवं प्रारूप" : "2. Session Duration / Mode"}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { time: 5, label: "5 Min", desc: isHi ? "त्वरित स्प्रिंट" : "Rapid Sprint" },
                { time: 20, label: "20 Min", desc: isHi ? "मानक पाठ" : "Standard Mastery" },
                { time: 60, label: "60 Min", desc: isHi ? "गहन अध्ययन" : "Deep Workshop" },
                { time: 7, label: "7 Days", desc: isHi ? "दैनिक रोडमैप" : "7-Day Roadmap" },
              ].map((opt) => (
                <button
                  key={opt.time}
                  type="button"
                  onClick={() => setTimeMinutes(opt.time)}
                  className={`p-3 rounded-2xl border text-left transition ${
                    timeMinutes === opt.time
                      ? "bg-indigo-600/30 border-indigo-500 ring-2 ring-indigo-500/30 text-white"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-slate-100">{opt.label}</span>
                    {opt.time === 7 ? (
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 block">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Depth Level & Language Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Depth Level */}
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                {isHi ? "3. शिक्षार्थी स्तर" : "3. Learner Level"}
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                {(["beginner", "intermediate", "advanced"] as LearnerDepth[]).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setDepth(lvl)}
                    className={`py-2 rounded-lg font-semibold capitalize transition ${
                      depth === lvl
                        ? "bg-indigo-600 text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {isHi
                      ? lvl === "beginner"
                        ? "आरंभिक"
                        : lvl === "intermediate"
                        ? "मध्यम"
                        : "उन्नत"
                      : lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Language Selection */}
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                {isHi ? "4. शिक्षण भाषा" : "4. Teaching Language"}
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setLanguage("en")}
                  className={`py-2 rounded-lg font-semibold transition ${
                    language === "en"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage("hi")}
                  className={`py-2 rounded-lg font-semibold transition ${
                    language === "hi"
                      ? "bg-amber-600 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  हिन्दी (Hindi)
                </button>
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isLoading || (activeTab === "topic" && !topic.trim()) || (activeTab === "upload" && !selectedFile)}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-bold text-base shadow-xl shadow-amber-500/25 transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Sparkles className="w-5 h-5 animate-spin" />
                <span>{isHi ? "पाठ योजना तैयार की जा रही है..." : "Architecting Adaptive Lesson..."}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>{isHi ? "शिक्षण सत्र प्रारंभ करें" : "Begin Gurukul AI Lesson"}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
