"use client";

import React, { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { AssessmentResult, Language, QuizQuestion } from "@/lib/types";
import { ChalkWavyLine } from "./ChalkWavyLine";

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
    if (assessmentResult) return;
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
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
        });
      }
    } catch (err) {
      console.error("Quiz error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isHi = language === "hi";

  if (isLoadingQuiz) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[350px] text-center space-y-3 font-body">
        <h3 className="text-xl font-serif-heading font-bold text-[#F3EFE3]">
          {isHi ? "मूल्यांकन तैयार हो रहा है..." : "Generating End-of-Lesson Assessment..."}
        </h3>
        <p className="text-xs text-[#8E9C88]">
          {isHi
            ? "पाठ में सीखी गई अवधारणाओं के आधार पर प्रश्न तैयार किए जा रहे हैं।"
            : "Synthesizing diagnostic questions based on covered concepts."}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 font-body">
      {/* Header */}
      <div className="border border-[#8E9C88]/40 bg-[#1A2B22] p-5 rounded-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-serif-heading font-bold text-[#F3EFE3]">
            {isHi ? "सत्र समाप्ति मूल्यांकन" : "End-of-Lesson Assessment"}
          </h2>
          <ChalkWavyLine className="w-28 mt-1" />
        </div>

        {assessmentResult && (
          <div className="text-right">
            <span className="text-xs text-[#8E9C88] block">Mastery Score</span>
            <span className="text-2xl font-serif-heading font-bold text-[#E3A23B]">
              {assessmentResult.percentage}% ({assessmentResult.score}/{assessmentResult.total_questions})
            </span>
          </div>
        )}
      </div>

      {/* Result Breakdown */}
      {assessmentResult && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-[#EFE9DA] text-[#2A2A26] border border-[#E3A23B] rounded-sm">
            <div className="font-serif-heading font-bold text-xs text-[#2A2A26] mb-1 flex items-center justify-between">
              <span>Mastered Concepts (समझी गई अवधारणाएं)</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-[#E3A23B] text-[#2A2A26] font-bold rounded-xs">Turmeric</span>
            </div>
            <div className="text-xs space-y-1">
              {assessmentResult.strong_concepts && assessmentResult.strong_concepts.length > 0 ? (
                assessmentResult.strong_concepts.map((c, i) => (
                  <div key={i} className="text-[#2A2A26]">• {c}</div>
                ))
              ) : (
                <div className="text-[#8E9C88] italic">No concepts mastered yet</div>
              )}
            </div>
          </div>

          <div className="p-4 bg-[#EFE9DA] text-[#2A2A26] border border-[#B5482F] rounded-sm">
            <div className="font-serif-heading font-bold text-xs text-[#B5482F] mb-1 flex items-center justify-between">
              <span>Diagnosed Misconceptions (सुधार)</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-[#B5482F] text-[#F3EFE3] font-bold rounded-xs">Sindoor</span>
            </div>
            <div className="text-xs space-y-1">
              {assessmentResult.misconceptions && assessmentResult.misconceptions.length > 0 ? (
                assessmentResult.misconceptions.map((c, i) => (
                  <div key={i} className="text-[#B5482F]">• {c} (flawed model)</div>
                ))
              ) : (
                <div className="text-[#2A2A26]">No active misconceptions diagnosed</div>
              )}
            </div>
          </div>

          <div className="p-4 bg-[#EFE9DA] text-[#2A2A26] border border-[#8E9C88] rounded-sm">
            <div className="font-serif-heading font-bold text-xs text-[#2A2A26] mb-1 flex items-center justify-between">
              <span>Foundational Review (शुरुआती)</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-[#8E9C88] text-[#F3EFE3] font-bold rounded-xs">Parchment</span>
            </div>
            <div className="text-xs space-y-1">
              {assessmentResult.unexplored_concepts && assessmentResult.unexplored_concepts.length > 0 ? (
                assessmentResult.unexplored_concepts.map((c, i) => (
                  <div key={i} className="text-[#2A2A26]">• {c} (unexplored / needed hint)</div>
                ))
              ) : (
                <div className="text-[#2A2A26]">{assessmentResult.recommended_next}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Questions */}
      <div className="space-y-4">
        {questions.map((q, qIndex) => {
          const userAnswer = selectedAnswers[q.id];
          const isSubmitted = Boolean(assessmentResult);
          const isCorrect = userAnswer === q.correct_option_index;

          return (
            <div
              key={q.id}
              className={`p-5 border rounded-sm ${
                isSubmitted
                  ? isCorrect
                    ? "bg-[#1A2B22] border-[#E3A23B]"
                    : "bg-[#2A1813] border-[#B5482F]"
                  : "bg-[#1B2D24] border-[#8E9C88]/40"
              }`}
            >
              <div className="flex items-center justify-between mb-2 text-xs text-[#8E9C88]">
                <span>Question {qIndex + 1}</span>
                <span>{q.concept_name}</span>
              </div>

              <h4 className="text-base font-serif-heading text-[#F3EFE3] mb-3">
                {q.question}
              </h4>

              {/* Options */}
              <div className="space-y-2">
                {q.options.map((opt, optIndex) => {
                  const isSelected = userAnswer === optIndex;
                  const isKey = q.correct_option_index === optIndex;

                  let optClass = "bg-[#22362B] text-[#F3EFE3] border-[#8E9C88]/40 hover:border-[#F3EFE3]";
                  if (isSelected && !isSubmitted) {
                    optClass = "bg-[#E3A23B] text-[#2A2A26] border-[#E3A23B] font-bold";
                  } else if (isSubmitted) {
                    if (isKey) {
                      optClass = "bg-[#EFE9DA] text-[#2A2A26] border-[#E3A23B] font-bold";
                    } else if (isSelected && !isKey) {
                      optClass = "bg-[#B5482F] text-[#F3EFE3] border-[#B5482F]";
                    } else {
                      optClass = "bg-[#22362B]/50 text-[#8E9C88] border-transparent";
                    }
                  }

                  return (
                    <button
                      key={optIndex}
                      type="button"
                      disabled={isSubmitted}
                      onClick={() => handleSelectOption(q.id, optIndex)}
                      className={`w-full p-2.5 border text-left text-xs rounded-xs flex items-center gap-2 transition ${optClass}`}
                    >
                      <span className="font-bold">{String.fromCharCode(65 + optIndex)}.</span>
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>

              {isSubmitted && (
                <div className="mt-3 p-2 bg-[#EFE9DA] text-[#2A2A26] border border-[#8E9C88] text-[11px] rounded-xs">
                  <span className="font-bold">Explanation:</span> {q.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-between pt-2 border-t border-[#8E9C88]/40">
        <button
          onClick={onRetakeLesson}
          className="text-xs px-4 py-2 border border-[#8E9C88] hover:border-[#F3EFE3] text-[#F3EFE3] rounded-xs"
        >
          {isHi ? "पाठ दोबारा पढ़ें" : "Revise lesson"}
        </button>

        {!assessmentResult ? (
          <button
            onClick={handleSubmitQuiz}
            disabled={isSubmitting || Object.keys(selectedAnswers).length < questions.length}
            className="text-xs font-bold px-5 py-2.5 bg-[#E3A23B] text-[#2A2A26] hover:bg-[#d4942d] disabled:opacity-40 disabled:cursor-not-allowed rounded-xs"
          >
            {isSubmitting ? "Scoring..." : "Submit assessment"}
          </button>
        ) : (
          <button
            onClick={onFinish}
            className="text-xs font-bold px-5 py-2.5 bg-[#E3A23B] text-[#2A2A26] hover:bg-[#d4942d] rounded-xs"
          >
            {isHi ? "नया पाठ शुरू करें" : "Explore next topic"}
          </button>
        )}
      </div>
    </div>
  );
};
