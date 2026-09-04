"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Brain,
  CheckCircle2,
  HelpCircle,
  Mic,
  MicOff,
  RotateCcw,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import { AudioAmplitudeTracker } from "@/lib/audio-analyser";
import {
  ConceptPlan,
  EvaluationResult,
  ExplanationResponse,
  Language,
  LearnerDepth,
  LessonPlan,
  Session,
  SessionState,
} from "@/lib/types";
import { AvatarCanvas } from "./AvatarCanvas";
import { CaptionsDisplay } from "./CaptionsDisplay";
import { StateMachineInspector } from "./StateMachineInspector";
import { VisualRenderer } from "./VisualRenderer";

interface TeachingLoopProps {
  session: Session;
  lessonPlan: LessonPlan;
  onLessonComplete: () => void;
  onLanguageChange: (lang: Language) => void;
}

export const TeachingLoop: React.FC<TeachingLoopProps> = ({
  session,
  lessonPlan,
  onLessonComplete,
  onLanguageChange,
}) => {
  // State Machine State
  const [currentState, setCurrentState] = useState<SessionState>(session.state || "explaining");
  const [currentConceptIndex, setCurrentConceptIndex] = useState<number>(
    session.current_concept_index || 0
  );
  const [currentExplanation, setCurrentExplanation] = useState<ExplanationResponse | null>(null);
  const [studentAnswer, setStudentAnswer] = useState<string>("");
  const [lastEvaluation, setLastEvaluation] = useState<EvaluationResult | null>(null);
  const [retrievedChunks, setRetrievedChunks] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [teacherMood, setTeacherMood] = useState<
    "welcoming" | "explaining" | "encouraging" | "correcting"
  >("explaining");

  // Voice & Audio Analyser State
  const [amplitude, setAmplitude] = useState<number>(0);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trackerRef = useRef<AudioAmplitudeTracker | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const currentConcept: ConceptPlan =
    lessonPlan.concepts[currentConceptIndex] || lessonPlan.concepts[0];

  // Initialize Audio Amplitude Tracker
  useEffect(() => {
    trackerRef.current = new AudioAmplitudeTracker();

    const updateLoop = () => {
      if (trackerRef.current) {
        const amp = trackerRef.current.getAmplitude();
        setAmplitude(amp);
      }
      animFrameRef.current = requestAnimationFrame(updateLoop);
    };
    animFrameRef.current = requestAnimationFrame(updateLoop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (trackerRef.current) trackerRef.current.cleanup();
    };
  }, []);

  // Play TTS audio or Web Speech API fallback
  const speakText = async (text: string, lang: Language) => {
    if (isMuted || !text) return;

    try {
      setIsSpeaking(true);
      // 1. Try Google Cloud TTS backend
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language: lang }),
      });
      const data = await res.json();

      if (data.audioBase64 && audioRef.current) {
        const audioBlobUrl = `data:${data.mimeType};base64,${data.audioBase64}`;
        audioRef.current.src = audioBlobUrl;

        // Connect analyser to audio element on first play
        if (trackerRef.current) {
          trackerRef.current.init(audioRef.current);
        }

        audioRef.current.onended = () => {
          setIsSpeaking(false);
          setAmplitude(0);
        };
        audioRef.current.onerror = () => {
          fallbackWebSpeech(text, lang);
        };

        await audioRef.current.play();
      } else {
        fallbackWebSpeech(text, lang);
      }
    } catch (e) {
      console.warn("TTS fetch error, using Web Speech fallback:", e);
      fallbackWebSpeech(text, lang);
    }
  };

  // Client Web Speech Synthesis fallback
  const fallbackWebSpeech = (text: string, lang: Language) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setIsSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === "hi" ? "hi-IN" : "en-US";
    utterance.rate = 1.0;

    // Simulate mouth amplitude rhythm for fallback
    let simInterval: any;
    utterance.onstart = () => {
      setIsSpeaking(true);
      simInterval = setInterval(() => {
        setAmplitude(0.2 + Math.random() * 0.6);
      }, 100);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setAmplitude(0);
      if (simInterval) clearInterval(simInterval);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setAmplitude(0);
      if (simInterval) clearInterval(simInterval);
    };

    window.speechSynthesis.speak(utterance);
  };

  // Start Explanation for the Current Concept
  const triggerExplanation = async (conceptIdx = currentConceptIndex) => {
    setIsProcessing(true);
    setTeacherMood("explaining");
    setCurrentState("explaining");

    try {
      const res = await fetch("/api/teach/step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          action: "explain",
        }),
      });
      const data = await res.json();

      if (data.explanation) {
        setCurrentExplanation(data.explanation);
        setRetrievedChunks(data.retrievedChunks || []);
        setCurrentState("questioning");
        speakText(data.explanation.spoken_text, session.language);
      }
    } catch (e) {
      console.error("Failed to fetch explanation:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  // Trigger on initial mount or concept change
  useEffect(() => {
    triggerExplanation(currentConceptIndex);
  }, [currentConceptIndex]);

  // Handle Answer Submission (evaluating state)
  const handleAnswerSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!studentAnswer.trim() || isProcessing) return;

    setIsProcessing(true);
    setCurrentState("evaluating");
    const submittedAnswer = studentAnswer;
    setStudentAnswer("");

    try {
      const res = await fetch("/api/teach/step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          action: "evaluate",
          studentAnswer: submittedAnswer,
          previousExplanation: currentExplanation?.spoken_text || "",
        }),
      });
      const data = await res.json();

      if (data.evaluation) {
        setLastEvaluation(data.evaluation);

        // BRANCH A: INCORRECT -> RE-EXPLAINING WITH NOVEL ANALOGY
        if (!data.evaluation.correct && data.reExplanation) {
          setCurrentState("reexplaining");
          setTeacherMood("correcting");
          setCurrentExplanation(data.reExplanation);
          speakText(
            `${data.evaluation.feedback} ${data.reExplanation.spoken_text}`,
            session.language
          );
        }
        // BRANCH B: CORRECT -> ADAPTING & MOVING FORWARD
        else if (data.evaluation.correct) {
          setTeacherMood("encouraging");
          setCurrentState("adapting");

          speakText(data.evaluation.feedback, session.language);

          setTimeout(() => {
            if (data.isLessonComplete || data.sessionState === "done") {
              setCurrentState("done");
              onLessonComplete();
            } else {
              const nextIdx = data.nextConceptIndex ?? currentConceptIndex + 1;
              setCurrentConceptIndex(nextIdx);
            }
          }, 2400);
        }
      }
    } catch (e) {
      console.error("Evaluation error:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  // Speech Recognition (Speech-to-text mic input)
  const toggleSpeechRecognition = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      alert("Speech recognition is not supported in this browser. Please use text input.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.lang = session.language === "hi" ? "hi-IN" : "en-US";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setStudentAnswer((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognition.start();
    } catch (e) {
      console.warn("Speech recognition error:", e);
      setIsListening(false);
    }
  };

  const isHi = session.language === "hi";

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Hidden audio element for Web Audio API AnalyserNode */}
      <audio ref={audioRef} className="hidden" crossOrigin="anonymous" />

      {/* Progress & Breadcrumbs Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600/30 text-indigo-400 font-bold text-sm border border-indigo-500/40">
            {currentConceptIndex + 1}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-100 text-sm sm:text-base truncate">
                {currentConcept.name}
              </h3>
              {currentConcept.day && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Day {currentConcept.day}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {isHi
                ? `अवधारणा ${currentConceptIndex + 1} / ${lessonPlan.concepts.length}`
                : `Concept ${currentConceptIndex + 1} of ${lessonPlan.concepts.length} • ${
                    currentConcept.depth
                  } depth`}
            </p>
          </div>
        </div>

        {/* Mute Audio Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2 rounded-xl text-xs flex items-center gap-1.5 transition ${
              isMuted
                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span>{isMuted ? (isHi ? "ध्वनि बंद" : "Unmute") : isHi ? "ध्वनि चालू" : "Mute"}</span>
          </button>
        </div>
      </div>

      {/* Main Teaching Stage: Avatar + Captions (Left) & Visual Aid (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Avatar & Spoken Captions */}
        <div className="lg:col-span-5 flex flex-col items-center gap-4">
          {/* Animated Teacher Avatar */}
          <div className="w-full flex justify-center py-2">
            <AvatarCanvas
              amplitude={amplitude}
              isSpeaking={isSpeaking}
              teacherMood={teacherMood}
              size={240}
            />
          </div>

          {/* Synced On-screen Captions */}
          <CaptionsDisplay
            fullText={currentExplanation?.spoken_text || ""}
            isSpeaking={isSpeaking}
            language={session.language}
            isReexplanation={currentExplanation?.is_reexplanation}
            onReplay={() =>
              currentExplanation?.spoken_text &&
              speakText(currentExplanation.spoken_text, session.language)
            }
          />
        </div>

        {/* Right Column: Visual Renderer & Checkpoint Question Box */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Dynamic Visual Aid Component */}
          <div className="flex-1 min-h-[260px]">
            <VisualRenderer
              type={currentExplanation?.visual_type || currentConcept.visual_type || "none"}
              content={currentExplanation?.visual_content || currentConcept.visual_content || ""}
              conceptName={currentConcept.name}
            />
          </div>

          {/* Interactive Checkpoint Question Box */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
              <HelpCircle className="w-4 h-4" />
              <span>
                {currentExplanation?.is_reexplanation
                  ? isHi
                    ? "पुनर्व्याख्या परीक्षण प्रश्न"
                    : "Misconception Checkpoint Question"
                  : isHi
                  ? "जांच प्रश्न (Checkpoint Question)"
                  : "Conceptual Checkpoint Question"}
              </span>
            </div>

            <p className="text-sm sm:text-base font-medium text-slate-100 mb-4 leading-relaxed">
              {currentExplanation?.checkpoint_question ||
                currentConcept.checkpoint_question ||
                "Explain the core principle in your own words."}
            </p>

            {/* Answer Input Form */}
            <form onSubmit={handleAnswerSubmit} className="space-y-3">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={studentAnswer}
                  onChange={(e) => setStudentAnswer(e.target.value)}
                  placeholder={
                    isHi
                      ? "अपना उत्तर यहाँ लिखें या माइक का उपयोग करें..."
                      : "Type your answer or speak to your AI Guru..."
                  }
                  disabled={isProcessing}
                  className="w-full pl-4 pr-24 py-3.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-100 placeholder-slate-500 text-sm outline-none transition disabled:opacity-50"
                />

                <div className="absolute right-2 flex items-center gap-1.5">
                  {/* Mic Speech-to-Text Button */}
                  <button
                    type="button"
                    onClick={toggleSpeechRecognition}
                    className={`p-2 rounded-lg transition ${
                      isListening
                        ? "bg-red-500 text-white animate-pulse"
                        : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                    title="Voice input"
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={!studentAnswer.trim() || isProcessing}
                    className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-indigo-600/30"
                  >
                    {isProcessing ? (
                      <Sparkles className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Instant feedback notification pill */}
              {lastEvaluation && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 transition-all ${
                    lastEvaluation.correct
                      ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-200"
                      : "bg-amber-950/40 border-amber-500/40 text-amber-200"
                  }`}
                >
                  {lastEvaluation.correct ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold mr-1">
                      {lastEvaluation.correct
                        ? isHi
                          ? "उत्कृष्ट!"
                          : "Correct!"
                        : isHi
                        ? "सुझाव:"
                        : "Misconception Identified:"}
                    </span>
                    <span>{lastEvaluation.feedback}</span>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* State Machine Debug Inspector (Judges Transparency Panel) */}
      <div className="pt-2">
        <StateMachineInspector
          currentState={currentState}
          conceptName={currentConcept.name}
          conceptIndex={currentConceptIndex}
          totalConcepts={lessonPlan.concepts.length}
          retrievedChunks={retrievedChunks}
          lastEvaluation={lastEvaluation}
          targetDepth={currentConcept.depth || session.target_depth}
          language={session.language}
        />
      </div>
    </div>
  );
};
