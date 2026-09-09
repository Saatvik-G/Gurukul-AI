"use client";

import React, { useEffect, useRef, useState } from "react";
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
import { ChalkPathProgress } from "./ChalkPathProgress";
import { ChalkWavyLine } from "./ChalkWavyLine";
import { ConceptMapGraph } from "./ConceptMapGraph";
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

  // Pre-seed current explanation so chalkboard visuals and questions render on frame 0
  const initialConcept = lessonPlan.concepts[session.current_concept_index || 0] || lessonPlan.concepts[0];
  const [currentExplanation, setCurrentExplanation] = useState<ExplanationResponse | null>(() => {
    if (!initialConcept) return null;
    return {
      spoken_text: initialConcept.spoken_text || "",
      visual_type: initialConcept.visual_type || "diagram",
      visual_content: initialConcept.visual_content || "",
      citations: [initialConcept.name],
      concept_name: initialConcept.name,
      checkpoint_question: initialConcept.checkpoint_question || "",
      interaction_type: initialConcept.interaction_type || "question",
    };
  });

  const [studentAnswer, setStudentAnswer] = useState<string>("");
  const [lastEvaluation, setLastEvaluation] = useState<EvaluationResult | null>(null);
  const [retrievedChunks, setRetrievedChunks] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(!initialConcept?.spoken_text);
  const [teacherMood, setTeacherMood] = useState<
    "welcoming" | "explaining" | "encouraging" | "correcting"
  >("explaining");
  const [conceptMasteries, setConceptMasteries] = useState<Record<number, "turmeric" | "sindoor" | "moss">>(
    session.metadata?.conceptMasteries || {}
  );
  const [priorMemoryCallback, setPriorMemoryCallback] = useState<string | null>(
    lessonPlan.prior_memory_callback || null
  );

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

  // Initialize Web Audio Amplitude Tracker
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

  // Fast Voice synthesis player with instant timeout fallback
  const speakText = async (text: string, lang: Language) => {
    if (isMuted || !text) return;

    try {
      setIsSpeaking(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);

      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language: lang }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await res.json();

      if (data.audioBase64 && audioRef.current) {
        const audioBlobUrl = `data:${data.mimeType};base64,${data.audioBase64}`;
        audioRef.current.src = audioBlobUrl;

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

        try {
          await audioRef.current.play();
          return;
        } catch (playErr) {
          fallbackWebSpeech(text, lang);
          return;
        }
      }
    } catch (e) {
      // Audio synthesis network or timeout -> fallback immediately
    }

    fallbackWebSpeech(text, lang);
  };

  const fallbackWebSpeech = (text: string, lang: Language) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      simulateSpeechAnimation(text);
      return;
    }

    try {
      window.speechSynthesis.resume();
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }

      setTimeout(() => {
        try {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = lang === "hi" ? "hi-IN" : "en-US";
          utterance.rate = 1.0;
          utterance.pitch = 1.0;

          // Select matching voice
          const voices = window.speechSynthesis.getVoices();
          if (voices && voices.length > 0) {
            const targetLang = lang === "hi" ? "hi" : "en";
            const matchedVoice = voices.find((v) =>
              v.lang.toLowerCase().startsWith(targetLang) ||
              (lang === "hi" && v.name.toLowerCase().includes("hindi")) ||
              (lang === "en" && (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Microsoft")))
            );
            if (matchedVoice) {
              utterance.voice = matchedVoice;
            }
          }

          let simInterval: any = null;
          let fallbackTimeout: any = null;

          const cleanupSpeech = () => {
            setIsSpeaking(false);
            setAmplitude(0);
            if (simInterval) clearInterval(simInterval);
            if (fallbackTimeout) clearTimeout(fallbackTimeout);
          };

          utterance.onstart = () => {
            setIsSpeaking(true);
            simInterval = setInterval(() => {
              setAmplitude(0.25 + Math.random() * 0.55);
            }, 80);
          };

          utterance.onend = cleanupSpeech;
          utterance.onerror = () => cleanupSpeech();

          const wordCount = text.split(/\s+/).length;
          const estimatedDurationMs = Math.max(3000, (wordCount / 2.5) * 1000 + 500);
          fallbackTimeout = setTimeout(cleanupSpeech, estimatedDurationMs);

          setIsSpeaking(true);
          window.speechSynthesis.speak(utterance);
          window.speechSynthesis.resume();
        } catch (speechErr) {
          simulateSpeechAnimation(text);
        }
      }, 50);
    } catch (e) {
      simulateSpeechAnimation(text);
    }
  };

  const simulateSpeechAnimation = (text: string) => {
    setIsSpeaking(true);
    const wordCount = text.split(/\s+/).length;
    const durationMs = Math.max(3000, (wordCount / 2.8) * 1000);
    
    const interval = setInterval(() => {
      setAmplitude(0.25 + Math.random() * 0.55);
    }, 85);

    setTimeout(() => {
      clearInterval(interval);
      setIsSpeaking(false);
      setAmplitude(0);
    }, durationMs);
  };

  // Trigger Explanation for the Concept
  const triggerExplanation = async (conceptIdx = currentConceptIndex) => {
    const concept = lessonPlan.concepts[conceptIdx] || lessonPlan.concepts[0];
    
    // If spoken_text and visual_content already exist in the plan, start speaking immediately!
    if (concept && concept.spoken_text) {
      const speechLine =
        conceptIdx === 0 && priorMemoryCallback
          ? `${priorMemoryCallback} ${concept.spoken_text}`
          : concept.spoken_text;

      setCurrentExplanation({
        spoken_text: concept.spoken_text,
        visual_type: concept.visual_type || "diagram",
        visual_content: concept.visual_content || "",
        citations: [concept.name],
        concept_name: concept.name,
        checkpoint_question: concept.checkpoint_question || "",
        interaction_type: concept.interaction_type || "question",
      });
      setCurrentState("questioning");
      setIsProcessing(false);
      setTeacherMood("explaining");

      speakText(speechLine, session.language);
      return;
    }

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
        if (data.conceptMasteries) setConceptMasteries(data.conceptMasteries);
        if (data.priorMemoryCallback) setPriorMemoryCallback(data.priorMemoryCallback);
        setCurrentState("questioning");

        const speechLine =
          conceptIdx === 0 && (data.priorMemoryCallback || priorMemoryCallback)
            ? `${data.priorMemoryCallback || priorMemoryCallback} ${data.explanation.spoken_text}`
            : data.explanation.spoken_text;

        speakText(speechLine, session.language);
      }
    } catch (e) {
      console.error("Failed to fetch explanation:", e);
    } finally {
      setIsProcessing(false);
    }
  };

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
        if (data.conceptMasteries) setConceptMasteries(data.conceptMasteries);

        // ====================================================================
        // BRANCH 1: NON-ANSWER ("I don't know") -> SUPPORTIVE HINT
        // ====================================================================
        if (data.isHint && data.hintExplanation) {
          setCurrentState("hinting");
          setTeacherMood("encouraging");
          setCurrentExplanation({
            ...data.hintExplanation,
            is_hint: true,
          });
          speakText(
            `${data.evaluation.feedback} ${data.hintExplanation.spoken_text}`,
            session.language
          );
        }
        // ====================================================================
        // BRANCH 2: OFF-TOPIC / UNPARSEABLE -> GENTLE REFOCUS
        // ====================================================================
        else if (data.isOffTopic) {
          setCurrentState("questioning");
          setTeacherMood("explaining");
          speakText(data.evaluation.feedback, session.language);
        }
        // ====================================================================
        // BRANCH 3A: SUBSTANTIVE INCORRECT -> MISCONCEPTION RE-EXPLANATION
        // ====================================================================
        else if (!data.evaluation.correct && data.reExplanation) {
          setCurrentState("reexplaining");
          setTeacherMood("correcting");
          setCurrentExplanation({
            ...data.reExplanation,
            is_reexplanation: true,
          });
          speakText(
            `${data.evaluation.feedback} ${data.reExplanation.spoken_text}`,
            session.language
          );
        }
        // ====================================================================
        // BRANCH 3B: SUBSTANTIVE CORRECT -> ADAPTING & MOVING FORWARD
        // ====================================================================
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
          }, 2200);
        }
      }
    } catch (e) {
      console.error("Evaluation error:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  // Voice Input via Web Speech API (Part 4)
  const toggleSpeechRecognition = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      alert("Speech recognition is not supported in this browser. Please type your answer.");
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
      recognition.interimResults = true;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((r: any) => r[0].transcript)
          .join(" ");
        setStudentAnswer(transcript);
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
  const isFeynmanMode = currentConcept.interaction_type === "feynman";

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-5 font-body">
      <audio ref={audioRef} className="hidden" crossOrigin="anonymous" />

      {/* Top Chalkboard Sequence Path */}
      <div className="border border-[#8E9C88]/40 bg-[#1A2B22] p-3 rounded-sm">
        <div className="flex items-center justify-between mb-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-serif-heading text-sm font-bold text-[#F3EFE3]">
              {currentConcept.name}
            </span>
            {currentConcept.day && (
              <span className="text-[10px] px-1.5 py-0.5 bg-[#E3A23B] text-[#2A2A26] font-bold rounded-xs">
                Day {currentConcept.day}
              </span>
            )}
            {isFeynmanMode && (
              <span className="text-[10px] px-1.5 py-0.5 bg-[#B5482F] text-[#F3EFE3] font-bold rounded-xs">
                Feynman Mode
              </span>
            )}
          </div>

          <button
            onClick={() => setIsMuted(!isMuted)}
            className="text-[11px] text-[#8E9C88] hover:text-[#F3EFE3] underline underline-offset-2"
          >
            {isMuted ? "Unmute voice" : "Mute voice"}
          </button>
        </div>

        <ChalkPathProgress
          concepts={lessonPlan.concepts}
          currentIndex={currentConceptIndex}
          masteries={conceptMasteries}
        />
      </div>

      {/* Main Layout: Chalkboard Board (Left ~70%) + Notebook Margin (Right ~30%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (Chalkboard Teaching Stage) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Avatar Window + Spoken Text */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
            {/* Cut Inset Window Avatar */}
            <div className="sm:col-span-4 flex justify-center">
              <AvatarCanvas
                amplitude={amplitude}
                isSpeaking={isSpeaking}
                isThinking={isProcessing && !isSpeaking}
                teacherMood={teacherMood}
                size={160}
              />
            </div>

            {/* Pinned Paper Explanation Panel */}
            <div className="sm:col-span-8">
              <CaptionsDisplay
                fullText={currentExplanation?.spoken_text || ""}
                isSpeaking={isSpeaking}
                isLoading={isProcessing && !currentExplanation?.spoken_text}
                conceptName={currentConcept.name}
                language={session.language}
                isReexplanation={currentExplanation?.is_reexplanation}
                onReplay={() =>
                  currentExplanation?.spoken_text &&
                  speakText(currentExplanation.spoken_text, session.language)
                }
              />
            </div>
          </div>

          {/* Dynamic Visual Aid */}
          <VisualRenderer
            type={currentExplanation?.visual_type || currentConcept.visual_type || "none"}
            content={currentExplanation?.visual_content || currentConcept.visual_content || ""}
            conceptName={currentConcept.name}
          />

          {/* Checkpoint Question & Student Paper Note Answer */}
          {/* Checkpoint Question & Student Paper Note Answer */}
          <div className="border border-[#8E9C88]/50 bg-[#1B2D24] p-5 rounded-sm">
            {/* Question Label */}
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span
                className={`text-xs font-serif-heading font-bold ${
                  currentExplanation?.is_reexplanation
                    ? "text-[#B5482F]"
                    : currentExplanation?.is_hint
                    ? "text-[#E3A23B]"
                    : "text-[#E3A23B]"
                }`}
              >
                {currentExplanation?.is_hint
                  ? isHi
                    ? "💡 सहायक संकेत एवं मार्गदर्शन (Hint)"
                    : "💡 Supportive Hint & Scaffolded Step"
                  : currentExplanation?.is_reexplanation
                  ? isHi
                    ? "💡 नया सादृश्य परीक्षण प्रश्न (पुनर्व्याख्या)"
                    : "💡 Novel Analogy Checkpoint (Re-explanation)"
                  : isFeynmanMode
                  ? isHi
                    ? "फेनमैन विधि: अपनी समझ से समझाइए"
                    : "Feynman Method: Explain in your own words"
                  : isHi
                  ? "जांच प्रश्न"
                  : "Checkpoint Question"}
              </span>

              {currentExplanation?.is_hint && (
                <span className="text-[10px] px-2 py-0.5 bg-[#E3A23B] text-[#2A2A26] font-bold rounded-xs">
                  Supportive Step
                </span>
              )}

              {currentExplanation?.is_reexplanation && (
                <span className="text-[10px] px-2 py-0.5 bg-[#B5482F] text-[#F3EFE3] font-bold rounded-xs">
                  Misconception Pivot
                </span>
              )}
            </div>
            <ChalkWavyLine className="w-24 mb-2 opacity-75" />

            {/* Question Text */}
            <p className="text-base text-[#F3EFE3] font-serif-heading mb-4 leading-relaxed">
              {currentExplanation?.checkpoint_question ||
                currentConcept.checkpoint_question ||
                "Explain the core principle in your own words."}
            </p>

            {/* Thinking status indicator if processing */}
            {isProcessing && (
              <div className="mb-3 p-2.5 bg-[#17251E] border border-[#E3A23B]/60 rounded-xs text-xs text-[#E3A23B] flex items-center gap-2 animate-pulse font-body">
                <span className="w-2 h-2 rounded-full bg-[#E3A23B] animate-ping" />
                <span>
                  {isHi
                    ? "गुरुकुल शिक्षक आपके उत्तर का विश्लेषण कर रहे हैं..."
                    : "The Guru is analyzing your answer & updating the chalkboard..."}
                </span>
              </div>
            )}

            {/* Student Torn Paper Note Answer Form */}
            <form onSubmit={handleAnswerSubmit} className="space-y-3">
              <div className="torn-note p-3">
                <textarea
                  rows={2}
                  value={studentAnswer}
                  onChange={(e) => setStudentAnswer(e.target.value)}
                  placeholder={
                    currentExplanation?.is_hint
                      ? isHi
                        ? "संकेत के आधार पर अपना विचार लिखें..."
                        : "Write your answer based on this hint..."
                      : isFeynmanMode
                      ? isHi
                        ? "इस अवधारणा को अपनी भाषा में समझाइए, जैसे आप किसी नौसिखिए को पढ़ा रहे हों..."
                        : "Explain this concept back to me in your own words, as if teaching someone new..."
                      : isHi
                      ? "अपना उत्तर यहाँ लिखें या बोलकर दर्ज करें..."
                      : "Type your answer or speak with the microphone..."
                  }
                  disabled={isProcessing}
                  className="w-full bg-transparent text-[#2A2A26] placeholder-[#8E9C88] text-sm outline-none resize-none font-body"
                />
              </div>

              {/* Action Bar */}
              <div className="flex items-center justify-between pt-1">
                {/* Speech Recognition Mic Button (Part 4) */}
                <button
                  type="button"
                  onClick={toggleSpeechRecognition}
                  className={`text-xs px-3 py-1.5 border transition font-body flex items-center gap-1.5 rounded-xs ${
                    isListening
                      ? "bg-[#B5482F] text-[#F3EFE3] border-[#B5482F]"
                      : "border-[#8E9C88] text-[#F3EFE3] hover:border-[#E3A23B]"
                  }`}
                >
                  <span>{isListening ? "Listening... click to stop" : "Speak answer"}</span>
                </button>

                {/* Submit button: Solid turmeric, ink text, sentence case */}
                <button
                  type="submit"
                  disabled={!studentAnswer.trim() || isProcessing}
                  className="text-xs font-bold px-4 py-2 bg-[#E3A23B] text-[#2A2A26] hover:bg-[#d4942d] disabled:opacity-40 disabled:cursor-not-allowed rounded-xs transition"
                >
                  {isProcessing
                    ? isHi
                      ? "जांच हो रही है..."
                      : "Evaluating..."
                    : currentExplanation?.is_hint
                    ? "Try with hint"
                    : currentExplanation?.is_reexplanation
                    ? "Try another way"
                    : "Answer"}
                </button>
              </div>

              {/* Feedback Alert if present */}
              {lastEvaluation && (
                <div
                  className={`p-3 text-xs border rounded-xs font-body ${
                    lastEvaluation.is_hint
                      ? "bg-[#EFE9DA] text-[#2A2A26] border-[#E3A23B]"
                      : lastEvaluation.correct
                      ? "bg-[#EFE9DA] text-[#2A2A26] border-[#8E9C88]"
                      : "bg-[#2A1813] text-[#F3EFE3] border-[#B5482F]"
                  }`}
                >
                  <span className="font-bold mr-1.5">
                    {lastEvaluation.is_hint
                      ? "Guidance:"
                      : lastEvaluation.correct
                      ? "Understood:"
                      : "Correction needed:"}
                  </span>
                  <span>{lastEvaluation.feedback}</span>
                  {lastEvaluation.gaps && lastEvaluation.gaps.length > 0 && (
                    <div className="mt-1 text-[#B5482F] text-[11px]">
                      Identified gaps: {lastEvaluation.gaps.join("; ")}
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Right Column (Notebook Margin Column ~30%) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Part 3: Cross-Session Memory Callback Sticky Note */}
          {priorMemoryCallback && (
            <div className="sticky-pinned-note p-3 text-xs font-body rounded-xs relative">
              <div className="font-serif-heading font-bold text-xs text-[#2A2A26] mb-1 flex items-center justify-between">
                <span>Note from last session</span>
                <span className="text-[10px] text-[#B5482F]">Memory callback</span>
              </div>
              <p className="text-[11px] leading-relaxed text-[#2A2A26]">
                "{priorMemoryCallback}"
              </p>
            </div>
          )}

          {/* Part 5: Growing Concept Map Graph */}
          <ConceptMapGraph
            concepts={lessonPlan.concepts}
            currentIndex={currentConceptIndex}
            masteries={conceptMasteries}
          />

          {/* Ruled Notebook Margin Panel for Notes & Doubt Trail */}
          <div className="notebook-ruled p-3.5 border border-[#8E9C88]/40 text-xs rounded-sm space-y-3 min-h-[160px]">
            <div className="font-serif-heading font-bold text-xs border-b border-[#8E9C88]/30 pb-1 text-[#2A2A26]">
              Margin Notes &amp; Doubt Trail
            </div>

            <div className="space-y-2 text-[11px] leading-snug text-[#2A2A26]">
              <div>
                <span className="font-medium">Active Topic:</span> {session.title}
              </div>
              <div>
                <span className="font-medium">Teaching Level:</span> {currentConcept.depth}
              </div>
              <div>
                <span className="font-medium">Checkpoint Mode:</span>{" "}
                {isFeynmanMode ? "Feynman (own words)" : "Direct Conceptual"}
              </div>

              {lastEvaluation?.praise_point && (
                <div className="p-2 bg-[#E6DEC9] border border-[#8E9C88]/30 rounded-xs text-[11px]">
                  <span className="font-semibold text-[#2A2A26]">What you explained well:</span>{" "}
                  {lastEvaluation.praise_point}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* State Machine Inspector */}
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
          interactionType={currentConcept.interaction_type}
        />
      </div>
    </div>
  );
};
