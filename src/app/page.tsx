"use client";

import React, { useEffect, useState } from "react";
import { AssessmentReport } from "@/components/AssessmentReport";
import { ChalkWavyLine } from "@/components/ChalkWavyLine";
import { LearnerProfileView } from "@/components/LearnerProfileView";
import { LessonSetupModal } from "@/components/LessonSetupModal";
import { Navbar } from "@/components/Navbar";
import { TeachingLoop } from "@/components/TeachingLoop";
import { Language, LearnerDepth, LearnerProfile, LessonPlan, Session } from "@/lib/types";

export default function Home() {
  const [view, setView] = useState<"landing" | "lesson" | "assessment">("landing");
  const [language, setLanguage] = useState<Language>("en");
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [activeLessonPlan, setActiveLessonPlan] = useState<LessonPlan | null>(null);
  const [learnerProfile, setLearnerProfile] = useState<LearnerProfile | null>(null);

  const [quickTopic, setQuickTopic] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/session?userId=default_user");
        const data = await res.json();
        if (data.profile) {
          setLearnerProfile(data.profile);
        }
      } catch (err) {
        console.warn("Profile load notice:", err);
      }
    }
    loadProfile();
  }, []);

  const handleLanguageChange = async (newLang: Language) => {
    setLanguage(newLang);
    if (activeSession && view === "lesson") {
      try {
        await fetch("/api/teach/step", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: activeSession.id,
            action: "switch_language",
            targetLanguage: newLang,
          }),
        });
        setActiveSession((prev) => (prev ? { ...prev, language: newLang } : null));
      } catch (err) {
        console.warn("Language switch sync notice:", err);
      }
    }
  };

  const handleStartLesson = async (config: {
    file?: File;
    topic?: string;
    timeMinutes: number;
    depth: LearnerDepth;
    language: Language;
  }) => {
    setIsLoading(true);
    setIsSetupOpen(false);
    setLoadingMessage(
      config.language === "hi"
        ? "दस्तावेज़ का विश्लेषण एवं अवधारणा निष्कर्षण जारी है..."
        : "Extracting concepts & chunking knowledge into pgvector..."
    );

    try {
      let sessionId = "";
      if (config.file) {
        const formData = new FormData();
        formData.append("file", config.file);
        if (config.topic) formData.append("topic", config.topic);
        formData.append("language", config.language);
        formData.append("targetDepth", config.depth);
        formData.append("timeMinutes", config.timeMinutes.toString());

        const res = await fetch("/api/ingest", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to ingest document");
        sessionId = data.sessionId;
      } else {
        const res = await fetch("/api/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: config.topic || quickTopic || "Quantum Computing",
            language: config.language,
            targetDepth: config.depth,
            timeMinutes: config.timeMinutes,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to ingest topic");
        sessionId = data.sessionId;
      }

      setLoadingMessage(
        config.language === "hi"
          ? "अनुकूलित पाठ योजना एवं फेनमैन चेकपॉइंट तैयार किए जा रहे हैं..."
          : "Structuring adaptive lesson plan & Feynman checkpoints..."
      );

      const plannerRes = await fetch("/api/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          topicOrDocument: config.topic || config.file?.name || quickTopic,
          timeMinutes: config.timeMinutes,
          depth: config.depth,
          language: config.language,
        }),
      });
      const plannerData = await plannerRes.json();
      if (!plannerRes.ok) throw new Error(plannerData.error || "Failed to generate lesson plan");

      const sessionRes = await fetch(`/api/session?sessionId=${sessionId}`);
      const sessionData = await sessionRes.json();

      setActiveSession(sessionData.session);
      setActiveLessonPlan(plannerData.plan);
      setLanguage(config.language);
      setView("lesson");
    } catch (err: any) {
      alert(`Error starting lesson: ${err.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const isHi = language === "hi";

  return (
    <div className="min-h-screen flex flex-col bg-[#22362B] text-[#F3EFE3] font-body">
      {/* Chalkboard Navigation */}
      <Navbar
        language={language}
        onLanguageChange={handleLanguageChange}
        onNewLesson={() => setIsSetupOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        sessionTitle={activeSession?.title}
      />

      <main className="flex-1 flex flex-col">
        {/* VIEW 1: LOADING */}
        {isLoading && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 min-h-[50vh]">
            <h3 className="text-2xl font-serif-heading font-bold text-[#F3EFE3]">
              {isHi ? "गुरुकुल शिक्षक सक्रिय हो रहा है..." : "Gurukul AI Chalkboard Active"}
            </h3>
            <ChalkWavyLine className="w-32" />
            <p className="text-xs text-[#8E9C88] max-w-sm">{loadingMessage}</p>
          </div>
        )}

        {/* VIEW 2: TEACHING LOOP */}
        {!isLoading && view === "lesson" && activeSession && activeLessonPlan && (
          <TeachingLoop
            session={activeSession}
            lessonPlan={activeLessonPlan}
            onLessonComplete={() => setView("assessment")}
            onLanguageChange={handleLanguageChange}
          />
        )}

        {/* VIEW 3: ASSESSMENT REPORT */}
        {!isLoading && view === "assessment" && activeSession && (
          <AssessmentReport
            sessionId={activeSession.id}
            language={language}
            onFinish={() => setView("landing")}
            onRetakeLesson={() => setView("lesson")}
          />
        )}

        {/* VIEW 4: CHALKBOARD LANDING VIEW */}
        {!isLoading && view === "landing" && (
          <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12 max-w-5xl mx-auto w-full space-y-12">
            {/* Chalkboard Title Section */}
            <div className="text-center space-y-4 max-w-2xl">
              <div className="text-xs text-[#8E9C88] tracking-wider uppercase font-medium">
                Digital Gurukul • Adaptive Cognition • Grounded RAG
              </div>

              <h1 className="text-3xl sm:text-5xl font-serif-heading font-bold text-[#F3EFE3] leading-tight">
                {isHi ? (
                  <>
                    आपकी समझ के अनुसार सिखाने वाला <br />
                    <span className="text-[#E3A23B]">डिजिटल गुरुकुल</span>
                  </>
                ) : (
                  <>
                    The AI Teacher That Teaches On A Slate &amp;{" "}
                    <span className="text-[#E3A23B]">Dismantles Misconceptions</span>
                  </>
                )}
              </h1>

              <div className="flex justify-center">
                <ChalkWavyLine className="w-40" />
              </div>

              <p className="text-sm sm:text-base text-[#8E9C88] leading-relaxed">
                {isHi
                  ? "दस्तावेज़ (PDF/DOCX/PPTX) अपलोड करें या विषय चुनें। गुरुकुल AI आपकी समझ की जांच करता है, फेनमैन विधि से समझाता है, और गलत उत्तर मिलने पर नए उदाहरणों से दोबारा सिखाता है।"
                  : "Upload a document or choose any topic. Gurukul AI delivers a grounded spoken lesson, probes your understanding with Feynman checkpoints, and pivots with fresh mental models when you stumble."}
              </p>

              {/* Quick Input Box */}
              <div className="pt-2 max-w-md mx-auto">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={quickTopic}
                    onChange={(e) => setQuickTopic(e.target.value)}
                    placeholder={
                      isHi
                        ? "विषय दर्ज करें (उदा. क्वांटम सुपरपोजिशन)..."
                        : "Enter a topic (e.g. Quantum Superposition)..."
                    }
                    className="flex-1 p-2.5 bg-[#1B2D24] border border-[#8E9C88] text-sm text-[#F3EFE3] placeholder-[#8E9C88] rounded-xs outline-none focus:border-[#E3A23B]"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && quickTopic.trim()) {
                        setIsSetupOpen(true);
                      }
                    }}
                  />
                  <button
                    onClick={() => setIsSetupOpen(true)}
                    className="px-4 py-2.5 bg-[#E3A23B] text-[#2A2A26] font-bold text-xs hover:bg-[#d4942d] rounded-xs transition whitespace-nowrap"
                  >
                    Start lesson
                  </button>
                </div>

                <div className="mt-2 text-xs text-[#8E9C88]">
                  Or{" "}
                  <button
                    onClick={() => setIsSetupOpen(true)}
                    className="text-[#E3A23B] underline underline-offset-2 hover:text-[#F3EFE3]"
                  >
                    upload PDF, DOCX, or PPTX
                  </button>
                </div>
              </div>
            </div>

            {/* Chalkboard Concept Panels */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
              <div className="p-4 border border-[#8E9C88]/40 bg-[#1A2B22] rounded-xs space-y-2">
                <div className="text-xs font-serif-heading font-bold text-[#E3A23B]">
                  Pedagogical State Machine
                </div>
                <p className="text-xs text-[#8E9C88] leading-relaxed">
                  Explicit transitions: explaining &rarr; questioning &rarr; evaluating &rarr; re-explaining &rarr; adapting. Visible state inspector for pedagogical transparency.
                </p>
              </div>

              <div className="p-4 border border-[#8E9C88]/40 bg-[#1A2B22] rounded-xs space-y-2">
                <div className="text-xs font-serif-heading font-bold text-[#E3A23B]">
                  Feynman Mode Checkpoints
                </div>
                <p className="text-xs text-[#8E9C88] leading-relaxed">
                  Asks students to explain concepts back in their own words. Gemini diagnoses missing causal gaps and triggers targeted re-explanations.
                </p>
              </div>

              <div className="p-4 border border-[#8E9C88]/40 bg-[#1A2B22] rounded-xs space-y-2">
                <div className="text-xs font-serif-heading font-bold text-[#E3A23B]">
                  Cross-Session Memory
                </div>
                <p className="text-xs text-[#8E9C88] leading-relaxed">
                  Persistent learner profiles remember past weak areas and open new sessions with personalized refresher sticky notes.
                </p>
              </div>
            </div>

            {/* Pinned Prior Memory Note banner if returning student */}
            {learnerProfile?.weak_concepts && learnerProfile.weak_concepts.length > 0 && (
              <div className="w-full sticky-pinned-note p-3.5 text-xs rounded-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <span className="font-bold">Returning learner detected:</span> You have active focus targets on{" "}
                  <span className="underline">{learnerProfile.weak_concepts.slice(0, 2).join(", ")}</span>.
                </div>
                <button
                  onClick={() => setIsProfileOpen(true)}
                  className="text-xs text-[#2A2A26] underline font-semibold"
                >
                  View ledger
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <LessonSetupModal
        isOpen={isSetupOpen}
        onClose={() => setIsSetupOpen(false)}
        onStartLesson={handleStartLesson}
        priorWeakConcepts={learnerProfile?.weak_concepts}
        initialLanguage={language}
      />

      <LearnerProfileView
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        profile={learnerProfile}
        language={language}
      />
    </div>
  );
}
