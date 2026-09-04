import { NextRequest, NextResponse } from "next/server";
import { generateLessonPlan } from "@/lib/gemini";
import { getLearnerProfile, getSession, saveLessonPlan, saveSession } from "@/lib/supabase";
import { Language, LearnerDepth, LessonPlan } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      sessionId,
      topicOrDocument,
      timeMinutes = 20,
      depth = "beginner",
      language = "en",
    } = body;

    // Fetch prior weak concepts from learner profile to close the personalization loop
    const profile = await getLearnerProfile("default_user");
    const priorWeakConcepts = profile.weak_concepts || [];

    const plan = await generateLessonPlan({
      topicOrDocument: topicOrDocument || "Adaptive Mastery Lesson",
      timeMinutes,
      depth: depth as LearnerDepth,
      language: language as Language,
      priorWeakConcepts,
    });

    if (sessionId) {
      plan.session_id = sessionId;
      await saveLessonPlan(plan);

      const session = await getSession(sessionId);
      if (session) {
        session.available_time_minutes = timeMinutes;
        session.target_depth = depth as LearnerDepth;
        session.language = language as Language;
        session.state = "explaining";
        session.current_concept_index = 0;
        await saveSession(session);
      }
    }

    return NextResponse.json({
      success: true,
      plan,
      priorWeakConceptsUsed: priorWeakConcepts,
    });
  } catch (error: any) {
    console.error("API /planner error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate lesson plan" },
      { status: 500 }
    );
  }
}
