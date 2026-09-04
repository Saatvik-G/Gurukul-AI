import { NextRequest, NextResponse } from "next/server";
import {
  evaluateStudentAnswer,
  generateEmbedding,
  generateGroundedExplanation,
  generateReExplanation,
} from "@/lib/gemini";
import {
  getLessonPlan,
  getSession,
  retrieveRelevantChunks,
  saveSession,
  updateLearnerProfile,
} from "@/lib/db";
import { ConceptPlan, Language, LearnerDepth, SessionState } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      sessionId,
      action, // "explain" | "evaluate" | "reexplain" | "adapt" | "switch_language"
      studentAnswer,
      previousExplanation,
      targetLanguage,
    } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const plan = await getLessonPlan(sessionId);
    if (!plan || !plan.concepts || plan.concepts.length === 0) {
      return NextResponse.json({ error: "Lesson plan not found" }, { status: 404 });
    }

    const currentIndex = session.current_concept_index || 0;
    const currentConcept: ConceptPlan = plan.concepts[currentIndex] || plan.concepts[0];

    // Ensure session metadata exists
    if (!session.metadata) session.metadata = {};
    if (!session.metadata.conceptMasteries) session.metadata.conceptMasteries = {};

    // ========================================================================
    // ACTION: SWITCH LANGUAGE (Preserves progress & adapts context)
    // ========================================================================
    if (action === "switch_language" && targetLanguage) {
      session.language = targetLanguage as Language;
      await saveSession(session);
      return NextResponse.json({
        success: true,
        sessionState: session.state,
        currentConceptIndex: currentIndex,
        language: session.language,
        message: `Language switched to ${session.language}`,
      });
    }

    // ========================================================================
    // STATE / ACTION: EXPLAINING
    // ========================================================================
    if (action === "explain" || session.state === "explaining") {
      // Set upcoming concept node to moss if unattempted
      if (!session.metadata.conceptMasteries[currentIndex]) {
        session.metadata.conceptMasteries[currentIndex] = "moss";
      }

      // 1. Retrieve RAG grounding chunks for this concept
      const queryText = `${currentConcept.name} ${currentConcept.checkpoint_question}`;
      const queryEmbedding = await generateEmbedding(queryText);
      const retrievedChunks = await retrieveRelevantChunks(sessionId, queryEmbedding, 3);

      // 2. Generate grounded explanation
      const explanation = await generateGroundedExplanation({
        concept: currentConcept,
        retrievedChunks,
        depth: currentConcept.depth || session.target_depth,
        language: session.language,
        lessonTitle: session.title,
      });

      // 3. Update session state to questioning
      session.state = "questioning";
      await saveSession(session);

      return NextResponse.json({
        success: true,
        sessionState: "questioning" as SessionState,
        currentConceptIndex: currentIndex,
        totalConcepts: plan.concepts.length,
        concept: currentConcept,
        explanation,
        conceptMasteries: session.metadata.conceptMasteries,
        priorMemoryCallback: plan.prior_memory_callback || null,
        retrievedChunks: retrievedChunks.map((c) => ({
          concept_name: c.concept_name,
          definition: c.definition,
          similarity: c.similarity,
        })),
      });
    }

    // ========================================================================
    // STATE / ACTION: EVALUATING & BRANCHING (Supports Feynman Mode)
    // ========================================================================
    if (action === "evaluate" || session.state === "questioning" || session.state === "evaluating") {
      if (!studentAnswer) {
        return NextResponse.json({ error: "studentAnswer is required" }, { status: 400 });
      }

      session.state = "evaluating";
      await saveSession(session);

      // RAG context for evaluation
      const queryEmbedding = await generateEmbedding(currentConcept.name);
      const retrievedChunks = await retrieveRelevantChunks(sessionId, queryEmbedding, 2);
      const groundingContext = retrievedChunks
        .map((c) => `${c.concept_name}: ${c.definition} ${c.content_chunk}`)
        .join("\n");

      // 1. Run diagnostic evaluation (handles standard Q&A and Feynman mode)
      const evalResult = await evaluateStudentAnswer({
        conceptName: currentConcept.name,
        question: currentConcept.checkpoint_question,
        studentAnswer,
        groundingContext,
        language: session.language,
        interactionType: currentConcept.interaction_type || "question",
      });

      // 2. BRANCH A: INCORRECT / FEYNMAN GAPS -> RE-EXPLAINING WITH NOVEL ANALOGY
      if (!evalResult.correct) {
        session.state = "reexplaining";
        session.metadata.conceptMasteries[currentIndex] = "sindoor";
        await saveSession(session);

        // Record weak concept in learner profile
        await updateLearnerProfile("default_user", [], [currentConcept.name]);

        // Generate adaptive re-explanation with novel mental model
        const reExplanation = await generateReExplanation({
          concept: currentConcept,
          previousExplanation: previousExplanation || "",
          misconception: evalResult.misconception || evalResult.gaps?.join(", ") || "Conceptual gap",
          studentAnswer,
          retrievedChunks,
          language: session.language,
        });

        return NextResponse.json({
          success: true,
          sessionState: "reexplaining" as SessionState,
          evaluation: evalResult,
          reExplanation,
          concept: currentConcept,
          currentConceptIndex: currentIndex,
          conceptMasteries: session.metadata.conceptMasteries,
          isBranching: true,
        });
      }

      // 3. BRANCH B: CORRECT ANSWER -> ADAPTING DEPTH & PROGRESSING
      session.state = "adapting";
      if (!session.metadata.conceptMasteries[currentIndex] || session.metadata.conceptMasteries[currentIndex] === "moss") {
        session.metadata.conceptMasteries[currentIndex] = "turmeric";
      }
      await saveSession(session);

      // Record strong concept in learner profile
      await updateLearnerProfile("default_user", [currentConcept.name], []);

      const nextIndex = currentIndex + 1;
      const isCompleted = nextIndex >= plan.concepts.length;

      if (isCompleted) {
        session.state = "done";
        await saveSession(session);

        return NextResponse.json({
          success: true,
          sessionState: "done" as SessionState,
          evaluation: evalResult,
          isLessonComplete: true,
          currentConceptIndex: nextIndex,
          totalConcepts: plan.concepts.length,
          conceptMasteries: session.metadata.conceptMasteries,
        });
      }

      // Progress to next concept & adapt depth
      session.current_concept_index = nextIndex;
      session.state = "explaining";
      if (evalResult.suggested_depth) {
        session.target_depth = evalResult.suggested_depth;
      }
      await saveSession(session);

      return NextResponse.json({
        success: true,
        sessionState: "adapting" as SessionState,
        evaluation: evalResult,
        nextConceptIndex: nextIndex,
        totalConcepts: plan.concepts.length,
        nextConcept: plan.concepts[nextIndex],
        conceptMasteries: session.metadata.conceptMasteries,
      });
    }

    return NextResponse.json(
      { error: `Unhandled state/action: ${action || session.state}` },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("API /teach/step error:", error);
    return NextResponse.json(
      { error: error.message || "Teaching loop execution error" },
      { status: 500 }
    );
  }
}
