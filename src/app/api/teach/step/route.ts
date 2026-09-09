import { NextRequest, NextResponse } from "next/server";
import {
  classifyStudentResponse,
  evaluateStudentAnswer,
  generateEmbedding,
  generateGroundedExplanation,
  generateReExplanation,
  generateSupportiveHint,
} from "@/lib/gemini";
import {
  getLessonPlan,
  getSession,
  retrieveRelevantChunks,
  saveSession,
  updateLearnerProfile,
} from "@/lib/db";
import { ConceptPlan, Language, LearnerDepth, SessionState } from "@/lib/types";

// In-memory cache for repeated / refreshed concept explanations
const explanationCache = new Map<string, any>();

export async function POST(req: NextRequest) {
  const tStart = performance.now();
  let tRetrieve = 0;
  let tGemini = 0;
  let tDb = 0;

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
    if (!session.metadata.conceptAttempts) session.metadata.conceptAttempts = {};

    // ========================================================================
    // ACTION: SWITCH LANGUAGE (Preserves progress & adapts context)
    // ========================================================================
    if (action === "switch_language" && targetLanguage) {
      session.language = targetLanguage as Language;
      const tDb0 = performance.now();
      await saveSession(session);
      tDb = performance.now() - tDb0;

      console.log(`[teach/step Timing] action=switch_language sessionId=${sessionId} total=${Math.round(performance.now() - tStart)}ms`);
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
      const cacheKey = `${sessionId}:${currentIndex}:${session.target_depth}:${session.language}:explain`;
      if (explanationCache.has(cacheKey)) {
        console.log(`[teach/step Cache Hit] Serving cached explanation for ${cacheKey}`);
        const cached = explanationCache.get(cacheKey);
        return NextResponse.json(cached);
      }

      // Set upcoming concept node to moss if unattempted
      if (!session.metadata.conceptMasteries[currentIndex]) {
        session.metadata.conceptMasteries[currentIndex] = "moss";
      }

      // 1. Retrieve RAG grounding chunks for this concept (trimmed to top 2 chunks)
      const tRet0 = performance.now();
      const queryText = `${currentConcept.name} ${currentConcept.checkpoint_question}`;
      const queryEmbedding = await generateEmbedding(queryText);
      const retrievedChunks = await retrieveRelevantChunks(sessionId, queryEmbedding, 2);
      tRetrieve = performance.now() - tRet0;

      // 2. Generate grounded explanation
      const tGem0 = performance.now();
      const explanation = await generateGroundedExplanation({
        concept: currentConcept,
        retrievedChunks,
        depth: currentConcept.depth || session.target_depth,
        language: session.language,
        lessonTitle: session.title,
      });
      tGemini = performance.now() - tGem0;

      // 3. Update session state to questioning
      session.state = "questioning";
      const tDb0 = performance.now();
      await saveSession(session);
      tDb = performance.now() - tDb0;

      const responsePayload = {
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
      };

      explanationCache.set(cacheKey, responsePayload);
      console.log(`[teach/step Timing] action=explain concept=${currentConcept.name} retrieve=${Math.round(tRetrieve)}ms gemini=${Math.round(tGemini)}ms db=${Math.round(tDb)}ms total=${Math.round(performance.now() - tStart)}ms`);

      return NextResponse.json(responsePayload);
    }

    // ========================================================================
    // STATE / ACTION: EVALUATING & 3-WAY BRANCHING
    // ========================================================================
    if (action === "evaluate" || session.state === "questioning" || session.state === "evaluating" || session.state === "hinting") {
      if (!studentAnswer) {
        return NextResponse.json({ error: "studentAnswer is required" }, { status: 400 });
      }

      session.state = "evaluating";
      const tDb0 = performance.now();
      await saveSession(session);
      tDb += performance.now() - tDb0;

      // 1. 3-Way Classification: "substantive" vs "non_answer" vs "off_topic"
      const classification = classifyStudentResponse(studentAnswer, session.language);

      // RAG context for evaluation / hint
      const tRet0 = performance.now();
      const queryEmbedding = await generateEmbedding(currentConcept.name);
      const retrievedChunks = await retrieveRelevantChunks(sessionId, queryEmbedding, 2);
      tRetrieve = performance.now() - tRet0;

      const groundingContext = retrievedChunks
        .map((c) => `${c.concept_name}: ${c.definition} ${c.content_chunk}`)
        .join("\n");

      // ======================================================================
      // PATH 1: NON-ANSWER ("I don't know", "not sure", "idk", blank, etc.)
      // DO NOT trigger misconception detection. Provide supportive hint.
      // ======================================================================
      if (classification === "non_answer") {
        session.state = "hinting";
        session.metadata.conceptAttempts[currentIndex] = "non_answer";
        const tDb1 = performance.now();
        await saveSession(session);
        tDb += performance.now() - tDb1;

        const tGem0 = performance.now();
        const hintExplanation = await generateSupportiveHint({
          concept: currentConcept,
          retrievedChunks,
          depth: currentConcept.depth || session.target_depth,
          language: session.language,
        });
        tGemini = performance.now() - tGem0;

        const evalResult = await evaluateStudentAnswer({
          conceptName: currentConcept.name,
          question: currentConcept.checkpoint_question,
          studentAnswer,
          groundingContext,
          language: session.language,
          interactionType: currentConcept.interaction_type || "question",
        });

        console.log(`[teach/step Timing] action=evaluate path=non_answer retrieve=${Math.round(tRetrieve)}ms gemini=${Math.round(tGemini)}ms db=${Math.round(tDb)}ms total=${Math.round(performance.now() - tStart)}ms`);

        return NextResponse.json({
          success: true,
          sessionState: "hinting" as SessionState,
          evaluation: evalResult,
          hintExplanation,
          concept: currentConcept,
          currentConceptIndex: currentIndex,
          conceptMasteries: session.metadata.conceptMasteries,
          isHint: true,
        });
      }

      // ======================================================================
      // PATH 2: OFF-TOPIC / UNPARSEABLE
      // Prompt user to refocus on the concept without penalty.
      // ======================================================================
      if (classification === "off_topic") {
        session.state = "questioning";
        session.metadata.conceptAttempts[currentIndex] = "off_topic";
        const tDb1 = performance.now();
        await saveSession(session);
        tDb += performance.now() - tDb1;

        const evalResult = await evaluateStudentAnswer({
          conceptName: currentConcept.name,
          question: currentConcept.checkpoint_question,
          studentAnswer,
          groundingContext,
          language: session.language,
          interactionType: currentConcept.interaction_type || "question",
        });

        console.log(`[teach/step Timing] action=evaluate path=off_topic retrieve=${Math.round(tRetrieve)}ms db=${Math.round(tDb)}ms total=${Math.round(performance.now() - tStart)}ms`);

        return NextResponse.json({
          success: true,
          sessionState: "questioning" as SessionState,
          evaluation: evalResult,
          concept: currentConcept,
          currentConceptIndex: currentIndex,
          conceptMasteries: session.metadata.conceptMasteries,
          isOffTopic: true,
        });
      }

      // ======================================================================
      // PATH 3: SUBSTANTIVE ATTEMPT
      // Run diagnostic evaluation (Feynman causal check or standard evaluation)
      // ======================================================================
      const tGem0 = performance.now();
      const evalResult = await evaluateStudentAnswer({
        conceptName: currentConcept.name,
        question: currentConcept.checkpoint_question,
        studentAnswer,
        groundingContext,
        language: session.language,
        interactionType: currentConcept.interaction_type || "question",
      });
      tGemini = performance.now() - tGem0;

      // 3A: SUBSTANTIVE INCORRECT / FEYNMAN GAPS -> RE-EXPLAIN WITH NOVEL ANALOGY
      if (!evalResult.correct) {
        session.state = "reexplaining";
        session.metadata.conceptMasteries[currentIndex] = "sindoor";
        session.metadata.conceptAttempts[currentIndex] = "substantive_misconception";
        const tDb1 = performance.now();
        await saveSession(session);
        await updateLearnerProfile("default_user", [], [currentConcept.name]);
        tDb += performance.now() - tDb1;

        const tGemRe = performance.now();
        const reExplanation = await generateReExplanation({
          concept: currentConcept,
          previousExplanation: previousExplanation || "",
          misconception: evalResult.misconception || evalResult.gaps?.join(", ") || "Conceptual gap",
          studentAnswer,
          retrievedChunks,
          language: session.language,
        });
        tGemini += performance.now() - tGemRe;

        console.log(`[teach/step Timing] action=evaluate path=misconception retrieve=${Math.round(tRetrieve)}ms gemini=${Math.round(tGemini)}ms db=${Math.round(tDb)}ms total=${Math.round(performance.now() - tStart)}ms`);

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

      // 3B: SUBSTANTIVE CORRECT ANSWER -> ADAPTING DEPTH & PROGRESSING
      session.state = "adapting";
      session.metadata.conceptMasteries[currentIndex] = "turmeric";
      session.metadata.conceptAttempts[currentIndex] = "substantive_correct";
      const tDb1 = performance.now();
      await saveSession(session);
      await updateLearnerProfile("default_user", [currentConcept.name], []);
      tDb += performance.now() - tDb1;

      const nextIndex = currentIndex + 1;
      const isCompleted = nextIndex >= plan.concepts.length;

      if (isCompleted) {
        session.state = "done";
        await saveSession(session);

        console.log(`[teach/step Timing] action=evaluate path=completed retrieve=${Math.round(tRetrieve)}ms gemini=${Math.round(tGemini)}ms db=${Math.round(tDb)}ms total=${Math.round(performance.now() - tStart)}ms`);

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

      console.log(`[teach/step Timing] action=evaluate path=advance retrieve=${Math.round(tRetrieve)}ms gemini=${Math.round(tGemini)}ms db=${Math.round(tDb)}ms total=${Math.round(performance.now() - tStart)}ms`);

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

