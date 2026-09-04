"use client";

import React, { useState } from "react";
import { Language, LearnerDepth } from "@/lib/types";
import { ChalkWavyLine } from "./ChalkWavyLine";

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
  { en: "Quantum Superposition & Qubits", hi: "क्वांटम सुपरपोजिशन और क्यूबिट्स" },
  { en: "Photosynthesis & The Calvin Cycle", hi: "प्रकाश संश्लेषण और केल्विन चक्र" },
  { en: "Neural Attention & Transformers", hi: "ट्रांसफॉर्मर और न्यूरल अटेंशन" },
  { en: "Calculus: Derivatives & Rates", hi: "कैलकुलस: अवकलज और सीमाएं" },
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs overflow-y-auto font-body">
      <div className="w-full max-w-xl bg-[#22362B] border-2 border-[#8E9C88] text-[#F3EFE3] rounded-sm p-6 space-y-5 my-8">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#8E9C88]/40 pb-3">
          <div>
            <h2 className="text-2xl font-serif-heading font-bold text-[#F3EFE3]">
              {isHi ? "नया पाठ कॉन्फ़िगर करें" : "Configure Lesson"}
            </h2>
            <ChalkWavyLine className="w-24 mt-1" />
          </div>
          <button
            onClick={onClose}
            className="text-xs text-[#8E9C88] hover:text-[#F3EFE3] underline"
          >
            Close
          </button>
        </div>

        {/* Prior Memory Note if exists */}
        {priorWeakConcepts.length > 0 && (
          <div className="sticky-pinned-note p-2.5 text-xs rounded-xs text-[#2A2A26]">
            <span className="font-bold">Prior session callback:</span> We will reinforce{" "}
            <span className="underline">{priorWeakConcepts[0]}</span> based on your previous session history.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Source Tabs */}
          <div>
            <div className="text-xs text-[#8E9C88] mb-1.5">1. Learning material</div>
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("topic")}
                className={`px-3 py-1.5 border rounded-xs font-medium transition ${
                  activeTab === "topic"
                    ? "bg-[#E3A23B] text-[#2A2A26] border-[#E3A23B] font-bold"
                    : "border-[#8E9C88]/50 text-[#8E9C88] hover:text-[#F3EFE3]"
                }`}
              >
                {isHi ? "विषय दर्ज करें" : "Topic prompt"}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("upload")}
                className={`px-3 py-1.5 border rounded-xs font-medium transition ${
                  activeTab === "upload"
                    ? "bg-[#E3A23B] text-[#2A2A26] border-[#E3A23B] font-bold"
                    : "border-[#8E9C88]/50 text-[#8E9C88] hover:text-[#F3EFE3]"
                }`}
              >
                {isHi ? "दस्तावेज़ अपलोड (PDF/DOCX/PPTX)" : "Upload document"}
              </button>
            </div>
          </div>

          {/* Topic or File input */}
          {activeTab === "topic" ? (
            <div className="space-y-2">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={
                  isHi
                    ? "विषय लिखें (उदा. क्वांटम सुपरपोजिशन, प्रकाश संश्लेषण)..."
                    : "Enter topic (e.g. Quantum Superposition, Transformers)..."
                }
                className="w-full p-2.5 bg-[#1B2D24] border border-[#8E9C88] text-sm text-[#F3EFE3] placeholder-[#8E9C88] rounded-xs outline-none focus:border-[#E3A23B]"
              />
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_TOPICS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setTopic(isHi ? item.hi : item.en)}
                    className="text-[11px] px-2 py-0.5 bg-[#1B2D24] border border-[#8E9C88]/50 hover:border-[#E3A23B] text-[#8E9C88] hover:text-[#F3EFE3] rounded-xs"
                  >
                    + {isHi ? item.hi : item.en}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 border-2 border-dashed border-[#8E9C88] bg-[#1B2D24] text-center rounded-xs relative">
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
              <div className="text-xs text-[#F3EFE3]">
                {selectedFile ? selectedFile.name : "Select PDF, DOCX, PPTX, or TXT file"}
              </div>
              <div className="text-[10px] text-[#8E9C88] mt-1">Grounded RAG chunking</div>
            </div>
          )}

          {/* Duration */}
          <div>
            <div className="text-xs text-[#8E9C88] mb-1.5">2. Session duration</div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              {[
                { time: 5, label: "5 min" },
                { time: 20, label: "20 min" },
                { time: 60, label: "60 min" },
                { time: 7, label: "7 days" },
              ].map((opt) => (
                <button
                  key={opt.time}
                  type="button"
                  onClick={() => setTimeMinutes(opt.time)}
                  className={`py-2 border text-center rounded-xs transition ${
                    timeMinutes === opt.time
                      ? "bg-[#E3A23B] text-[#2A2A26] border-[#E3A23B] font-bold"
                      : "border-[#8E9C88]/50 text-[#8E9C88] hover:text-[#F3EFE3]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Learner Level & Language */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-[#8E9C88] mb-1.5">3. Learner level</div>
              <div className="grid grid-cols-3 gap-1 text-xs">
                {(["beginner", "intermediate", "advanced"] as LearnerDepth[]).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setDepth(lvl)}
                    className={`py-1.5 border capitalize rounded-xs ${
                      depth === lvl
                        ? "bg-[#E3A23B] text-[#2A2A26] border-[#E3A23B] font-bold"
                        : "border-[#8E9C88]/50 text-[#8E9C88] hover:text-[#F3EFE3]"
                    }`}
                  >
                    {lvl.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs text-[#8E9C88] mb-1.5">4. Language</div>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setLanguage("en")}
                  className={`py-1.5 border rounded-xs ${
                    language === "en"
                      ? "bg-[#E3A23B] text-[#2A2A26] border-[#E3A23B] font-bold"
                      : "border-[#8E9C88]/50 text-[#8E9C88] hover:text-[#F3EFE3]"
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage("hi")}
                  className={`py-1.5 border rounded-xs ${
                    language === "hi"
                      ? "bg-[#E3A23B] text-[#2A2A26] border-[#E3A23B] font-bold"
                      : "border-[#8E9C88]/50 text-[#8E9C88] hover:text-[#F3EFE3]"
                  }`}
                >
                  हिन्दी
                </button>
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || (activeTab === "topic" && !topic.trim()) || (activeTab === "upload" && !selectedFile)}
            className="w-full py-3 bg-[#E3A23B] text-[#2A2A26] font-bold text-sm hover:bg-[#d4942d] disabled:opacity-40 disabled:cursor-not-allowed rounded-xs transition"
          >
            {isLoading ? "Preparing lesson plan..." : "Start lesson"}
          </button>
        </form>
      </div>
    </div>
  );
};
