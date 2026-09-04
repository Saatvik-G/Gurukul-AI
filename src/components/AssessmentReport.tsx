"use client";

import React, { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import {
  Award,
  CheckCircle2,
  ChevronRight,
  Flame,
  HelpCircle,
  RotateCcw,
  Sparkles,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { AssessmentResult, Language, QuizQuestion } from "@/lib/types";

interface AssessmentReportProps {
  sessionId: string;
  language: Language;
  onFinish: () => void;
  onRetakeLesson: () => void;
}

export const AssessmentReport: React.FC<AssessmentReportProps> = ({
  sessionId,
  language,
  onFinish,
  onRetakeLesson,
}) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(true);
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);

  // Fetch or generate quiz questions
  useEffect(() => {
    async function loadQuiz() {
      try {
        setIsLoadingQuiz(true);
        const res = await fetch("/api/assess", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            action: "generate_quiz",
          }),
        });
        const data = await res.json();
        if (data.questions) {
          setQuestions(data.questions);
        }
      } catch (err) {
        console.error("Failed to load quiz:", err);
      } finally {
        setIsLoadingQuiz(false);
      }
    }
    loadQuiz();
  }, [sessionId]);

  const handleSelectOption = (questionId: number, optionIndex: number) => {
    if (assessmentResult) return; // Locked after submission
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const handleSubmitQuiz = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          action: "submit_quiz",
          questions,
          userAnswers: selectedAnswers,
        }),
      });
      const data = await res.json();
      if (data.result) {
        setAssessmentResult(data.result);
        // Trigger celebratory confetti
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
        });
      }
    } catch (err) {
      console.error("Quiz submission error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isHi = language === "hi";

  if (isLoadingQuiz) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[400px] text-center space-y-4">
        <Sparkles className="w-12 h-12 text-indigo-400 animate-spin" />
        <h3 className="text-xl font-bold text-white">
          {isHi ? "मूल्यांकन प्रश्नोत्तरी तैयार हो रही है..." : "Generating Adaptive Assessment Quiz..."}
        </h3>
        <p className="text-sm text-slate-400">
          {isHi
            ? "पाठ में सीखी गई अवधारणाओं के आधार पर विशेष प्रश्न तैयार किए जा रहे हैं।"
            : "Calibrating diagnostic questions tailored to the concepts covered."}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-8 animate-fade-in">
      {/* Quiz Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-950 border border-indigo-500/30 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/40">
            <Award className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">
              {isHi ? "सत्र समाप्ति मूल्यांकन" : "End-of-Lesson Assessment"}
            </h2>
            <p className="text-xs text-slate-400">
              {isHi
                ? "अपनी समझ की पुष्टि करें और व्यक्तिगत प्रतिक्रिया प्राप्त करें"
                : "Verify your conceptual mastery and update your learner profile"}
            </p>
          </div>
        </div>

        {assessmentResult && (
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-slate-900 border border-slate-700">
            <div className="text-right">
              <span className="text-xs text-slate-400 uppercase font-semibold block">
                {isHi ? "मास्टरी स्कोर" : "Mastery Score"}
              </span>
              <span className="text-2xl font-black text-amber-400">
                {assessmentResult.percentage}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Result Overview Cards (if submitted) */}
      {assessmentResult && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Score Card */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-400 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>{isHi ? "परिणाम सारांश" : "Performance"}</span>
            </div>
            <div className="text-3xl font-extrabold text-slate-100">
              {assessmentResult.score} / {assessmentResult.total_questions}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {assessmentResult.percentage >= 70
                ? isHi
                  ? "शानदार! आपने अवधारणाओं को बहुत अच्छे से समझा।"
                  : "Great work! Concepts strongly retained."
                : isHi
                ? "अच्छा प्रयास! कुछ अवधारणाओं पर दोबारा ध्यान दें।"
                : "Good attempt! Review identified gaps below."}
            </p>
          </div>

          {/* Strong Concepts */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-400 mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{isHi ? "मजबूत अवधारणाएं" : "Mastered Concepts"}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {assessmentResult.strong_concepts.length > 0 ? (
                assessmentResult.strong_concepts.map((c, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 text-xs font-medium"
                  >
                    ✓ {c}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500 italic">None recorded</span>
              )}
            </div>
          </div>

          {/* Weak / Focus Concepts */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-400 mb-2">
              <XCircle className="w-4 h-4 text-amber-400" />
              <span>{isHi ? "पुनरावलोकन बिंदु" : "Focus Areas"}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {assessmentResult.weak_concepts.length > 0 ? (
                assessmentResult.weak_concepts.map((c, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg bg-amber-950/60 text-amber-300 border border-amber-800/40 text-xs font-medium"
                  >
                    ⚠ {c}
                  </span>
                ))
              ) : (
                <span className="text-xs text-emerald-400 font-medium">All concepts mastered! 🎉</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Questions List */}
      <div className="space-y-4">
        {questions.map((q, qIndex) => {
          const userAnswer = selectedAnswers[q.id];
          const isSubmitted = Boolean(assessmentResult);
          const isCorrect = userAnswer === q.correct_option_index;

          return (
            <div
              key={q.id}
              className={`p-6 rounded-3xl border transition-all ${
                isSubmitted
                  ? isCorrect
                    ? "bg-emerald-950/20 border-emerald-500/40"
                    : "bg-red-950/20 border-red-500/40"
                  : "bg-slate-900/90 border-slate-800"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-800 text-indigo-300 border border-slate-700">
                  {isHi ? `प्रश्न ${qIndex + 1}` : `Question ${qIndex + 1}`}
                </span>
                <span className="text-xs text-slate-400 font-medium">{q.concept_name}</span>
              </div>

              <h4 className="text-base sm:text-lg font-semibold text-slate-100 mb-4">
                {q.question}
              </h4>

              {/* Options */}
              <div className="grid grid-cols-1 gap-2.5">
                {q.options.map((opt, optIndex) => {
                  const isSelected = userAnswer === optIndex;
                  const isAnswerKey = q.correct_option_index === optIndex;

                  let optionClass = "bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700";

                  if (isSelected && !isSubmitted) {
                    optionClass = "bg-indigo-600/30 border-indigo-500 text-white ring-2 ring-indigo-500/30";
                  } else if (isSubmitted) {
                    if (isAnswerKey) {
                      optionClass = "bg-emerald-950/80 border-emerald-500 text-emerald-200 font-semibold";
                    } else if (isSelected && !isAnswerKey) {
                      optionClass = "bg-red-950/80 border-red-500 text-red-200";
                    } else {
                      optionClass = "bg-slate-950/40 border-slate-900 text-slate-600 opacity-50";
                    }
                  }

                  return (
                    <button
                      key={optIndex}
                      type="button"
                      disabled={isSubmitted}
                      onClick={() => handleSelectOption(q.id, optIndex)}
                      className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition ${optionClass}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 font-mono text-xs flex items-center justify-center shrink-0">
                          {String.fromCharCode(65 + optIndex)}
                        </span>
                        <span className="text-sm">{opt}</span>
                      </div>
                      {isSubmitted && isAnswerKey && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 ml-2" />
                      )}
                      {isSubmitted && isSelected && !isAnswerKey && (
                        <XCircle className="w-5 h-5 text-red-400 shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Explanation note after submission */}
              {isSubmitted && (
                <div className="mt-4 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300">
                  <span className="font-bold text-indigo-400 mr-1.5">
                    {isHi ? "अवधारणा स्पष्टीकरण:" : "Insight:"}
                  </span>
                  {q.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
        <button
          onClick={onRetakeLesson}
          className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-sm flex items-center justify-center gap-2 transition"
        >
          <RotateCcw className="w-4 h-4" />
          <span>{isHi ? "पाठ दोबारा पढ़ें" : "Revise Lesson"}</span>
        </button>

        {!assessmentResult ? (
          <button
            onClick={handleSubmitQuiz}
            disabled={
              isSubmitting ||
              Object.keys(selectedAnswers).length < questions.length
            }
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-amber-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>{isHi ? "मूल्यांकन हो रहा है..." : "Scoring Responses..."}</span>
              </>
            ) : (
              <>
                <span>{isHi ? "मूल्यांकन जमा करें" : "Submit Assessment"}</span>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        ) : (
          <button
            onClick={onFinish}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm shadow-xl shadow-emerald-500/25 transition flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isHi ? "नया विषय शुरू करें" : "Explore Next Topic"}</span>
          </button>
        )}
      </div>
    </div>
  );
};
