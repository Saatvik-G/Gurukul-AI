import { NextRequest, NextResponse } from "next/server";
import { generateAssessmentQuiz } from "@/lib/gemini";
import {
  getLearnerProfile,
  getLessonPlan,
  getSession,
  saveAssessmentResult,
  updateLearnerProfile,
} from "@/lib/db";
import { AssessmentResult, Language, QuizQuestion } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, action, userAnswers, questions } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const session = await getSession(sessionId);
    const plan = await getLessonPlan(sessionId);

    // ACTION 1: GENERATE QUIZ
    if (action === "generate_quiz") {
      const coveredConcepts = plan?.concepts.map((c) => ({
        name: c.name,
        definition: c.checkpoint_question,
      })) || [{ name: session?.title || "Core Topic" }];

      const quizQuestions = await generateAssessmentQuiz({
        coveredConcepts,
        lessonTitle: session?.title || "Lesson Assessment",
        language: (session?.language as Language) || "en",
      });

      return NextResponse.json({
        success: true,
        questions: quizQuestions,
      });
    }

    // ACTION 2: SUBMIT & SCORE QUIZ
    if (action === "submit_quiz") {
      const typedQuestions: QuizQuestion[] = questions || [];
      const answers: Record<number, number> = userAnswers || {};

      let score = 0;
      const strongConcepts: string[] = [];
      const weakConcepts: string[] = [];

      const detailedResponses = typedQuestions.map((q) => {
        const userAnswer = answers[q.id];
        const isCorrect = userAnswer === q.correct_option_index;
        if (isCorrect) {
          score += 1;
          strongConcepts.push(q.concept_name);
        } else {
          weakConcepts.push(q.concept_name);
        }
        return {
          question_id: q.id,
          concept_name: q.concept_name,
          question: q.question,
          user_answer: userAnswer !== undefined ? userAnswer : -1,
          correct_answer: q.correct_option_index,
          is_correct: isCorrect,
          explanation: q.explanation,
        };
      });

      const total = typedQuestions.length || 1;
      const percentage = Math.round((score / total) * 100);

      // Extract session concept attempt signals
      const sessionAttempts = session?.metadata?.conceptAttempts || {};
      const sessionMisconceptions: string[] = [];
      const sessionNonAnswers: string[] = [];

      if (plan?.concepts) {
        plan.concepts.forEach((c, idx) => {
          const att = sessionAttempts[idx];
          if (att === "substantive_misconception") {
            sessionMisconceptions.push(c.name);
          } else if (att === "non_answer") {
            sessionNonAnswers.push(c.name);
          }
        });
      }

      const allWeak = Array.from(new Set([...weakConcepts, ...sessionMisconceptions, ...sessionNonAnswers]));
      const allMisconceptions = Array.from(new Set([...weakConcepts, ...sessionMisconceptions]));
      const allUnexplored = Array.from(new Set(sessionNonAnswers.filter((c) => !allMisconceptions.includes(c))));

      const isHi = session?.language === "hi";
      const recommendedNext =
        percentage >= 80
          ? isHi
            ? "उत्कृष्ट प्रदर्शन! आप अगले उन्नत स्तर के मॉड्यूल के लिए तैयार हैं।"
            : "Outstanding mastery! Ready to advance to the next level specialization."
          : isHi
          ? `सलाह: ${allWeak.join(", ") || "मुख्य अवधारणाओं"} का एक बार फिर पुनरावलोकन करें।`
          : `Recommendation: Focus on revising ${allWeak.join(", ") || "core mechanics"} before taking the mastery challenge.`;

      const assessmentResult: AssessmentResult = {
        session_id: sessionId,
        user_id: "default_user",
        score,
        total_questions: total,
        percentage,
        strong_concepts: Array.from(new Set(strongConcepts)),
        weak_concepts: allWeak,
        misconceptions: allMisconceptions,
        unexplored_concepts: allUnexplored,
        recommended_next: recommendedNext,
        detailed_responses: detailedResponses,
        created_at: new Date().toISOString(),
      };

      await saveAssessmentResult(assessmentResult);

      // Update persistent learner profile
      await updateLearnerProfile("default_user", strongConcepts, allWeak, {
        session_id: sessionId,
        topic: session?.title || "Mastery Session",
        score: percentage,
        date: new Date().toLocaleDateString(),
        weak_concepts: allWeak,
      });

      const updatedProfile = await getLearnerProfile("default_user");

      return NextResponse.json({
        success: true,
        result: assessmentResult,
        updatedProfile,
      });
    }

    return NextResponse.json({ error: "Invalid action specified" }, { status: 400 });
  } catch (error: any) {
    console.error("API /assess error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process assessment" },
      { status: 500 }
    );
  }
}
