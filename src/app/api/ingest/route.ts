import { NextRequest, NextResponse } from "next/server";
import { extractStructuredConcepts, generateEmbedding } from "@/lib/gemini";
import { saveConceptChunks, saveSession } from "@/lib/db";
import { ExtractedConceptChunk, Language, LearnerDepth, Session } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let rawText = "";
    let topicTitle = "";
    let sourceType: "upload" | "topic" = "topic";
    let fileName = "";
    let language: Language = "en";
    let targetDepth: LearnerDepth = "beginner";
    let timeMinutes = 20;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      topicTitle = (formData.get("topic") as string) || "";
      language = ((formData.get("language") as string) as Language) || "en";
      targetDepth = ((formData.get("targetDepth") as string) as LearnerDepth) || "beginner";
      timeMinutes = parseInt((formData.get("timeMinutes") as string) || "20", 10);

      if (file) {
        sourceType = "upload";
        fileName = file.name;
        if (!topicTitle) {
          topicTitle = fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        }
        const buffer = await file.arrayBuffer();
        const decoder = new TextDecoder("utf-8", { fatal: false });
        const decodedText = decoder.decode(buffer);
        rawText = decodedText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, " ").slice(0, 30000);
      }
    } else {
      const body = await req.json();
      topicTitle = body.topic || "Personalized Lesson";
      rawText = body.content || body.topic || "";
      sourceType = body.sourceType || "topic";
      language = (body.language as Language) || "en";
      targetDepth = (body.targetDepth as LearnerDepth) || "beginner";
      timeMinutes = body.timeMinutes || 20;
    }

    if (!rawText && !topicTitle) {
      return NextResponse.json(
        { error: "Please provide a document or a topic description." },
        { status: 400 }
      );
    }

    const effectiveText = rawText || topicTitle;

    // 1. Structured Concept Extraction via Gemini Flash
    const extracted = await extractStructuredConcepts(effectiveText, sourceType, language);

    // 2. Generate Embeddings for pgvector
    const chunksWithEmbeddings: ExtractedConceptChunk[] = await Promise.all(
      extracted.map(async (item) => {
        const textToEmbed = `${item.concept_name}: ${item.definition} ${item.content_chunk}`;
        const embedding = await generateEmbedding(textToEmbed);
        return {
          ...item,
          embedding,
        };
      })
    );

    // 3. Initialize Session
    const sessionId = crypto.randomUUID();
    const newSession: Session = {
      id: sessionId,
      user_id: "default_user",
      title: topicTitle,
      state: "explaining",
      current_concept_index: 0,
      language,
      target_depth: targetDepth,
      available_time_minutes: timeMinutes,
      metadata: {
        topic: topicTitle,
        sourceType,
        sourceFileName: fileName,
        conceptCount: chunksWithEmbeddings.length,
      },
    };

    await saveSession(newSession);
    await saveConceptChunks(sessionId, chunksWithEmbeddings);

    return NextResponse.json({
      success: true,
      sessionId,
      session: newSession,
      extractedConcepts: chunksWithEmbeddings,
      count: chunksWithEmbeddings.length,
    });
  } catch (error: any) {
    console.error("API /ingest error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process document/topic ingestion" },
      { status: 500 }
    );
  }
}
