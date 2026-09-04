"use client";

import React, { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  Cpu,
  FileText,
  Flame,
  Globe2,
  GraduationCap,
  Layers,
  Mic,
  RotateCcw,
  Sparkles,
  TrendingUp,
  UploadCloud,
  Zap,
} from "lucide-react";
import { AssessmentReport } from "@/components/AssessmentReport";
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

  // Quick prompt from hero input
  const [quickTopic, setQuickTopic] = useState("");

  // Load learner profile on initial load
  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/session?userId=default_user");
        const data = await res.json();
        if (data.profile) {
          setLearnerProfile(data.profile);
        }
      } catch (err) {
        console.warn("Failed to load learner profile:", err);
      }
    }
    loadProfile();
  }, []);

  // Handle Mid-Lesson or Global Language Switching
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

  // Start Lesson Workflow
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
      // Step 1: Ingestion & RAG
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

      // Step 2: Lesson Planning with Gemini structured JSON
      setLoadingMessage(
        config.language === "hi"
          ? "अनुकूलित पाठ योजना एवं चेकपॉइंट प्रश्न तैयार किए जा रहे हैं..."
          : "Structuring adaptive lesson plan & interactive checkpoints..."
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
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Top Navigation */}
      <Navbar
        language={language}
        onLanguageChange={handleLanguageChange}
        onNewLesson={() => setIsSetupOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        sessionTitle={activeSession?.title}
      />

      {/* Main Content View Switcher */}
      <main className="flex-1 flex flex-col">
        {/* VIEW 1: LOADING SCREEN */}
        {isLoading && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6 min-h-[60vh]">
            <div className="relative">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 to-indigo-600 animate-spin blur-md opacity-70" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-white animate-bounce" />
              </div>
            </div>
            <div className="max-w-md space-y-2">
              <h3 className="text-xl font-bold text-white">
                {isHi ? "गुरुकुल AI सक्रिय हो रहा है..." : "Gurukul AI Pedagogical Engine Active"}
              </h3>
              <p className="text-sm text-slate-400 animate-pulse">{loadingMessage}</p>
            </div>
          </div>
        )}

        {/* VIEW 2: TEACHING LOOP (Active Classroom) */}
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

        {/* VIEW 4: HERO LANDING SCREEN */}
        {!isLoading && view === "landing" && (
          <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12 max-w-7xl mx-auto w-full space-y-16 animate-fade-in">
            {/* Hero Section */}
            <div className="text-center space-y-6 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs font-semibold text-amber-400 shadow-md">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>
                  {isHi
                    ? "संज्ञानात्मक अनुकूलन • RAG ग्राउंडिंग • ध्वनि और अवतार"
                    : "Cognitive State Machine • Grounded RAG • Google Cloud TTS Voice"}
                </span>
              </div>

              <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
                {isHi ? (
                  <>
                    आपकी गति से सिखाने वाला <br />
                    <span className="bg-gradient-to-r from-amber-400 via-orange-300 to-indigo-400 bg-clip-text text-transparent">
                      अनुकूलित AI शिक्षक
                    </span>
                  </>
                ) : (
                  <>
                    The Adaptive AI Teacher That <br />
                    <span className="bg-gradient-to-r from-amber-400 via-orange-300 to-indigo-400 bg-clip-text text-transparent">
                      Dismantles Misconceptions
                    </span>
                  </>
                )}
              </h1>

              <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
                {isHi
                  ? "दस्तावेज़ (PDF/DOCX/PPTX) अपलोड करें या विषय चुनें। गुरुकुल AI वास्तविक शिक्षक की तरह आपकी समझ की जांच करता है और गलत उत्तर देने पर बिल्कुल नए उदाहरण से दोबारा समझाता है।"
                  : "Upload any document (PDF/DOCX/PPTX) or type a topic. Gurukul AI delivers a grounded spoken lesson, probes your understanding with checkpoints, and adapts with fresh mental models when you stumble."}
              </p>

              {/* Quick Topic Input Bar */}
              <div className="max-w-xl mx-auto w-full flex flex-col sm:flex-row gap-2.5 p-2 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl">
                <input
                  type="text"
                  value={quickTopic}
                  onChange={(e) => setQuickTopic(e.target.value)}
                  placeholder={
                    isHi
                      ? "विषय लिखें (उदा. क्वांटम सुपरपोजिशन, डीएनए प्रतिकृति)..."
                      : "Enter any topic (e.g. Quantum Superposition, DNA Replication)..."
                  }
                  className="flex-1 px-4 py-3 bg-transparent text-slate-100 placeholder-slate-500 text-sm outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && quickTopic.trim()) {
                      setIsSetupOpen(true);
                    }
                  }}
                />
                <button
                  onClick={() => setIsSetupOpen(true)}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition active:scale-95"
                >
                  <span>{isHi ? "शुरू करें" : "Start Session"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Or Upload file shortcut */}
              <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                <span>{isHi ? "या सीधे सामग्री अपलोड करें:" : "Or ingest learning material:"}</span>
                <button
                  onClick={() => setIsSetupOpen(true)}
                  className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-4 flex items-center gap-1"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>{isHi ? "PDF / DOCX / PPTX अपलोड" : "Upload PDF / DOCX / PPTX"}</span>
                </button>
              </div>
            </div>

            {/* Feature Architecture Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
              {/* Card 1: State Machine */}
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 transition backdrop-blur-md space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                  <Activity className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-100">
                  {isHi ? "पारदर्शी संज्ञानात्मक स्टेट मशीन" : "Pedagogical State Machine"}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {isHi
                    ? "व्याख्या -> प्रश्न -> मूल्यांकन -> पुनर्व्याख्या -> अनुकूलन चक्र। हर निर्णय और स्थिति को लाइव डिबग पैनल में देखा जा सकता है।"
                    : "Explicit state transitions: explaining -> questioning -> evaluating -> reexplaining -> adapting. Visible state inspectability for full pedagogical transparency."}
                </p>
              </div>

              {/* Card 2: Novel Analogy Repair */}
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-amber-500/40 transition backdrop-blur-md space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-100">
                  {isHi ? "भ्रांति-निवारक पुनर्व्याख्या" : "Misconception-Aware Re-Explanation"}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {isHi
                    ? "गलत उत्तर मिलने पर समान वाक्य दोहराने के बजाय, शिक्षक छात्र की विशिष्ट भ्रांति पहचानकर एक सर्वथा नई सादृश्यता से समझाता है।"
                    : "When answers falter, Gurukul diagnoses the specific misconception and presents a completely novel analogy rather than repeating the same explanation."}
                </p>
              </div>

              {/* Card 3: Amplitude Avatar & Visuals */}
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 transition backdrop-blur-md space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <Cpu className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-100">
                  {isHi ? "ऑडियो विश्लेषक अवतार एवं दृश्य" : "Amplitude Avatar & Rich Visuals"}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {isHi
                    ? "Google Cloud TTS ध्वनि, Web Audio API से संचालित SVG मुख-मुद्रा, सिंक किए गए कैप्शन, और KaTeX/Mermaid/कोड दृश्य सहायक।"
                    : "Google Cloud TTS voice in EN/HI, Web Audio API AnalyserNode driving mouth amplitude with zero per-render API calls, plus KaTeX, Mermaid, & Code visuals."}
                </p>
              </div>
            </div>

            {/* Prior Learner Profile Banner if available */}
            {learnerProfile && (learnerProfile.strong_concepts.length > 0 || learnerProfile.weak_concepts.length > 0) && (
              <div className="w-full p-5 rounded-3xl bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-950 border border-indigo-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">
                      {isHi ? "निरंतर शिक्षार्थी प्रगति उपलब्ध" : "Continuous Cognitive Memory Active"}
                    </div>
                    <div className="text-xs text-slate-400">
                      {learnerProfile.strong_concepts.length} {isHi ? "महारत अवधारणाएं" : "masteries"} •{" "}
                      {learnerProfile.weak_concepts.length} {isHi ? "पुनरावलोकन बिंदु" : "reinforcement targets"}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setIsProfileOpen(true)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition"
                >
                  {isHi ? "प्रोफ़ाइल देखें" : "View Cognitive Profile"}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
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
