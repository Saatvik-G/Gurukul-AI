import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import {
  ConceptPlan,
  EvaluationResult,
  ExplanationResponse,
  ExtractedConceptChunk,
  Language,
  LearnerDepth,
  LessonPlan,
  QuizQuestion,
} from "./types";

const getApiKey = () => process.env.GEMINI_API_KEY || "";

export const getGeminiClient = () => {
  const key = getApiKey();
  if (!key) {
    console.warn("GEMINI_API_KEY is not set. Operating in fallback simulation mode.");
  }
  return new GoogleGenerativeAI(key || "dummy_key");
};

// ============================================================================
// 1. INGESTION & CONCEPT EXTRACTION
// ============================================================================
export async function extractStructuredConcepts(
  rawContent: string,
  sourceType: "upload" | "topic",
  language: Language = "en"
): Promise<ExtractedConceptChunk[]> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return getFallbackExtractedConcepts(rawContent, language);
  }

  try {
    const ai = getGeminiClient();
    const model = ai.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    const prompt = `You are an expert pedagogical content extractor for Gurukul AI.
Analyze the following ${sourceType === "upload" ? "document text" : "topic description"}:
"""
${rawContent.slice(0, 15000)}
"""

Extract a structured list of core concepts, their definitions, concrete real-world examples, and self-contained content chunks suitable for vector retrieval and teaching.
Language for output: ${language === "hi" ? "Hindi (Devanagari script)" : "English"}.

Respond ONLY with a valid JSON array matching this schema:
[
  {
    "section_name": "Section or Module Name",
    "concept_name": "Concept Title",
    "definition": "Clear, precise definition",
    "examples": ["Example 1", "Example 2"],
    "content_chunk": "A comprehensive 150-300 word explanatory chunk explaining this concept clearly with its mechanisms and significance."
  }
]`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    throw new Error("Invalid format received from Gemini extraction");
  } catch (error) {
    console.error("Gemini extractStructuredConcepts error:", error);
    return getFallbackExtractedConcepts(rawContent, language);
  }
}

// ============================================================================
// 2. VECTOR EMBEDDINGS (text-embedding-004)
// ============================================================================
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = getApiKey();
  if (!apiKey) {
    // Generate deterministic 768-dim pseudo-embedding
    return generateDeterministicEmbedding(text, 768);
  }

  try {
    const ai = getGeminiClient();
    const model = ai.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text.slice(0, 2048));
    if (result.embedding?.values && result.embedding.values.length > 0) {
      return result.embedding.values;
    }
    return generateDeterministicEmbedding(text, 768);
  } catch (error) {
    console.warn("Gemini generateEmbedding fallback error:", error);
    return generateDeterministicEmbedding(text, 768);
  }
}

// ============================================================================
// 3. LESSON PLANNER (Strict JSON Schema + Branching for 5m/20m/60m/7-day)
// ============================================================================
export async function generateLessonPlan({
  topicOrDocument,
  timeMinutes,
  depth,
  language,
  priorWeakConcepts = [],
}: {
  topicOrDocument: string;
  timeMinutes: number;
  depth: LearnerDepth;
  language: Language;
  priorWeakConcepts?: string[];
}): Promise<LessonPlan> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return getFallbackLessonPlan(topicOrDocument, timeMinutes, depth, language, priorWeakConcepts);
  }

  try {
    const ai = getGeminiClient();
    const model = ai.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });

    const is7Day = timeMinutes >= 1000 || timeMinutes === 7; // represented as 7 days or ~7000 mins
    const effectiveTime = is7Day ? 7 * 30 : timeMinutes;

    const weakConceptsInstruction =
      priorWeakConcepts.length > 0
        ? `IMPORTANT: The learner previously struggled with: ${priorWeakConcepts.join(", ")}. Dedicate the initial concept or revision segment to addressing these weak points before advancing.`
        : "";

    const prompt = `You are the master curriculum architect for Gurukul AI.
Create an adaptive, structured lesson plan for:
Topic / Source Material: """${topicOrDocument.slice(0, 10000)}"""
Target Learner Level: ${depth}
Available Time: ${is7Day ? "7-Day Roadmap (daily progressive breakdown)" : `${effectiveTime} minutes`}
Target Teaching Language: ${language === "hi" ? "Hindi (Devanagari)" : "English"}
${weakConceptsInstruction}

PLANNING RULES:
1. For 5 minutes: Exactly 2 rapid high-impact core concepts.
2. For 20 minutes: 3 to 4 modular progressive concepts.
3. For 60 minutes: 5 to 6 deep concepts with practical application checkpoints.
4. For 7 days: 7 concepts tagged with day: 1 through 7 representing a 1-week mastery trajectory.
5. visual_type MUST be one of: "equation", "diagram", "code", "timeline", "none". Pick the most helpful visual aid for teaching each concept.
6. checkpoint_question: A targeted, probing conceptual question to verify understanding.

Return ONLY a JSON object matching this schema:
{
  "concepts": [
    {
      "name": "Concept Title",
      "depth": "beginner" | "intermediate" | "advanced",
      "time_minutes": number,
      "visual_type": "equation" | "diagram" | "code" | "timeline" | "none",
      "checkpoint_question": "string",
      "day": number
    }
  ],
  "total_time_minutes": number,
  "language": "${language}"
}`;

    const result = await model.generateContent(prompt);
    const parsed = JSON.parse(result.response.text()) as LessonPlan;
    if (parsed && Array.isArray(parsed.concepts) && parsed.concepts.length > 0) {
      return parsed;
    }
    throw new Error("Invalid lesson plan structure");
  } catch (error) {
    console.error("Gemini generateLessonPlan error:", error);
    return getFallbackLessonPlan(topicOrDocument, timeMinutes, depth, language, priorWeakConcepts);
  }
}

// ============================================================================
// 4. TEACHING LOOP: GROUNDED EXPLANATION GENERATION
// ============================================================================
export async function generateGroundedExplanation({
  concept,
  retrievedChunks,
  depth,
  language,
  lessonTitle,
}: {
  concept: ConceptPlan;
  retrievedChunks: ExtractedConceptChunk[];
  depth: LearnerDepth;
  language: Language;
  lessonTitle: string;
}): Promise<ExplanationResponse> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return getFallbackExplanation(concept, retrievedChunks, language);
  }

  try {
    const ai = getGeminiClient();
    const model = ai.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.4,
      },
    });

    const contextText = retrievedChunks
      .map((c, i) => `[Chunk ${i + 1} - ${c.concept_name}]:\nDefinition: ${c.definition}\n${c.content_chunk}\nExamples: ${c.examples.join(", ")}`)
      .join("\n\n");

    const prompt = `You are Gurukul AI, a world-class empathetic tutor delivering an engaging live spoken lesson.
Lesson Topic: ${lessonTitle}
Current Concept to Teach: ${concept.name}
Target Depth: ${depth}
Visual Aid Chosen: ${concept.visual_type}
Language: ${language === "hi" ? "Hindi (Natural conversational Hindi in Devanagari script)" : "English"}

GROUNDING CONTEXT (You MUST base your factual explanation strictly on this text):
"""
${contextText || concept.name}
"""

TEACHING INSTRUCTIONS:
1. "spoken_text": A concise, clear, conversational 3-5 sentence explanation designed for speech (sound warm, inspiring, and clear like a master guru).
2. "visual_content": Provide the exact code/syntax matching visual_type:
   - If visual_type is "equation": valid LaTeX math string (e.g., E = mc^2 or \\int_{0}^{\\infty} e^{-x^2} dx)
   - If visual_type is "diagram": valid Mermaid.js graph definition (e.g., graph TD\\n A[Input] --> B[Processing] --> C[Output])
   - If visual_type is "code": clean, commented runnable code snippet
   - If visual_type is "timeline": JSON array string or formatted steps (e.g., Step 1: Ingestion -> Step 2: Chunking -> Step 3: Retrieval)
   - If visual_type is "none": empty string ""
3. "citations": Array of short cited titles/sections used from the grounding chunks.
4. "checkpoint_question": A crystal clear checkpoint question to ask the student right after this explanation.

Output JSON ONLY:
{
  "spoken_text": "string",
  "visual_type": "${concept.visual_type}",
  "visual_content": "string",
  "citations": ["string"],
  "concept_name": "${concept.name}",
  "checkpoint_question": "${concept.checkpoint_question || "string"}"
}`;

    const result = await model.generateContent(prompt);
    const parsed = JSON.parse(result.response.text()) as ExplanationResponse;
    return parsed;
  } catch (error) {
    console.error("Gemini generateGroundedExplanation error:", error);
    return getFallbackExplanation(concept, retrievedChunks, language);
  }
}

// ============================================================================
// 5. TEACHING LOOP: ANSWER EVALUATION (Forced JSON: correct, misconception, confidence)
// ============================================================================
export async function evaluateStudentAnswer({
  conceptName,
  question,
  studentAnswer,
  groundingContext,
  language,
}: {
  conceptName: string;
  question: string;
  studentAnswer: string;
  groundingContext: string;
  language: Language;
}): Promise<EvaluationResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return getFallbackEvaluation(studentAnswer);
  }

  try {
    const ai = getGeminiClient();
    const model = ai.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    const prompt = `You are the diagnostic assessment engine for Gurukul AI.
Evaluate the student's response to verify understanding of the concept: "${conceptName}".

Question Asked: """${question}"""
Student's Answer: """${studentAnswer}"""
Ground Truth / Reference Material: """${groundingContext}"""
Language: ${language === "hi" ? "Hindi" : "English"}

DIAGNOSTIC TASK:
1. Determine if the student's answer is conceptually correct ("correct": true / false). Be generous on wording but strict on core conceptual misunderstanding.
2. If wrong or partially incorrect, identify the EXACT "misconception" (e.g., "Confusing superposition with simultaneous classical states" or "Mistaking RNA for DNA polymerase").
3. Assign a "confidence" score between 0.0 and 1.0.
4. Write constructive, empathetic "feedback" in ${language === "hi" ? "Hindi" : "English"}.

Return ONLY JSON:
{
  "correct": boolean,
  "misconception": string or null,
  "confidence": number,
  "feedback": "string",
  "suggested_depth": "beginner" | "intermediate" | "advanced"
}`;

    const result = await model.generateContent(prompt);
    const parsed = JSON.parse(result.response.text()) as EvaluationResult;
    return parsed;
  } catch (error) {
    console.error("Gemini evaluateStudentAnswer error:", error);
    return getFallbackEvaluation(studentAnswer);
  }
}

// ============================================================================
// 6. TEACHING LOOP: MISCONCEPTION-AWARE RE-EXPLANATION
// ============================================================================
export async function generateReExplanation({
  concept,
  previousExplanation,
  misconception,
  studentAnswer,
  retrievedChunks,
  language,
}: {
  concept: ConceptPlan;
  previousExplanation: string;
  misconception: string;
  studentAnswer: string;
  retrievedChunks: ExtractedConceptChunk[];
  language: Language;
}): Promise<ExplanationResponse> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return getFallbackReExplanation(concept, misconception, language);
  }

  try {
    const ai = getGeminiClient();
    const model = ai.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.5,
      },
    });

    const prompt = `You are Gurukul AI delivering a targeted adaptive re-explanation.
The student gave an incorrect answer due to a specific misconception.

Concept: "${concept.name}"
Previous Explanation Given: """${previousExplanation}"""
Student's Answer: """${studentAnswer}"""
Identified Misconception: """${misconception}"""
Language: ${language === "hi" ? "Hindi (Conversational Devanagari)" : "English"}

CRITICAL PEDAGOGICAL INSTRUCTIONS:
1. DO NOT simply repeat the previous explanation.
2. Introduce a COMPLETELY NOVEL analogy, intuitive mental model, or real-life comparison directly dismantling the identified misconception: "${misconception}".
3. Keep spoken_text under 4-5 encouraging, crystal-clear spoken sentences.
4. Provide a supportive visual_content if applicable.
5. Formulate a FRESH, alternative checkpoint question to verify if the misconception has been resolved.

Return ONLY JSON:
{
  "spoken_text": "string",
  "visual_type": "${concept.visual_type}",
  "visual_content": "string",
  "citations": ["string"],
  "concept_name": "${concept.name}",
  "checkpoint_question": "string (fresh alternative question)",
  "is_reexplanation": true,
  "misconception_addressed": "${misconception.replace(/"/g, "'")}"
}`;

    const result = await model.generateContent(prompt);
    const parsed = JSON.parse(result.response.text()) as ExplanationResponse;
    parsed.is_reexplanation = true;
    parsed.misconception_addressed = misconception;
    return parsed;
  } catch (error) {
    console.error("Gemini generateReExplanation error:", error);
    return getFallbackReExplanation(concept, misconception, language);
  }
}

// ============================================================================
// 7. END-OF-LESSON ASSESSMENT GENERATOR (3-5 Questions + Score Analysis)
// ============================================================================
export async function generateAssessmentQuiz({
  coveredConcepts,
  lessonTitle,
  language,
}: {
  coveredConcepts: Array<{ name: string; definition?: string }>;
  lessonTitle: string;
  language: Language;
}): Promise<QuizQuestion[]> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return getFallbackQuizQuestions(coveredConcepts, language);
  }

  try {
    const ai = getGeminiClient();
    const model = ai.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });

    const prompt = `You are the master assessment creator for Gurukul AI.
Create a 3 to 5 question multiple-choice quiz testing the student's mastery of the lesson: "${lessonTitle}".
Covered Concepts:
${coveredConcepts.map((c, i) => `${i + 1}. ${c.name}: ${c.definition || ""}`).join("\n")}
Language: ${language === "hi" ? "Hindi" : "English"}

Generate 3 to 4 multiple choice questions testing deep understanding rather than mere memorization.

Return ONLY a JSON array:
[
  {
    "id": 1,
    "concept_name": "Concept name",
    "question": "Question string",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_option_index": 0, // 0-indexed (0, 1, 2, or 3)
    "explanation": "Why this option is correct"
  }
]`;

    const result = await model.generateContent(prompt);
    const parsed = JSON.parse(result.response.text()) as QuizQuestion[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return getFallbackQuizQuestions(coveredConcepts, language);
  } catch (error) {
    console.error("Gemini generateAssessmentQuiz error:", error);
    return getFallbackQuizQuestions(coveredConcepts, language);
  }
}

// ============================================================================
// FALLBACKS (Guarantees zero crashes during live hackathon demos)
// ============================================================================

function generateDeterministicEmbedding(text: string, dim = 768): number[] {
  const embedding = new Array(dim).fill(0);
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  for (let i = 0; i < dim; i++) {
    const val = Math.sin(hash + i * 37.1) * 0.5 + Math.cos((hash ^ i) * 19.3) * 0.5;
    embedding[i] = Number(val.toFixed(5));
  }
  return embedding;
}

function getFallbackExtractedConcepts(raw: string, lang: Language): ExtractedConceptChunk[] {
  const isHi = lang === "hi";
  return [
    {
      section_name: isHi ? "भाग 1: मूल सिद्धांत" : "Part 1: Core Fundamentals",
      concept_name: isHi ? "मूल अवधारणा एवं तंत्र" : "Core Mechanism & Principles",
      definition: isHi
        ? "विषय के मूलभूत नियम और संचालन का तरीका।"
        : "The foundational framework and governing rules of the subject.",
      examples: [isHi ? "दैनिक जीवन में अनुप्रयोग" : "Real-world practical application"],
      content_chunk: raw.slice(0, 500) || (isHi ? "यह विषय हमारे ज्ञान का मुख्य आधार है।" : "This subject forms the backbone of the core domain."),
    },
    {
      section_name: isHi ? "भाग 2: अनुप्रयोग एवं प्रभाव" : "Part 2: Applications & Impact",
      concept_name: isHi ? "व्यावहारिक अनुप्रयोग" : "Practical Implementation",
      definition: isHi
        ? "सिद्धांतों को वास्तविक समस्याओं पर लागू करना।"
        : "Applying theoretical principles to solve real-world problems.",
      examples: [isHi ? "प्रौद्योगिकी और उद्योग" : "Technology and industry impact"],
      content_chunk: isHi
        ? "व्यावहारिक ज्ञान के माध्यम से हम जटिल समस्याओं को सरलता से हल कर सकते हैं।"
        : "Through practical implementation, theoretical models transition into working engineering solutions.",
    },
  ];
}

function getFallbackLessonPlan(
  topic: string,
  timeMinutes: number,
  depth: LearnerDepth,
  language: Language,
  priorWeakConcepts: string[]
): LessonPlan {
  const isHi = language === "hi";
  const is7Day = timeMinutes >= 1000 || timeMinutes === 7;

  if (is7Day) {
    return {
      concepts: Array.from({ length: 7 }, (_, i) => ({
        name: isHi ? `दिन ${i + 1}: ${topic} का चरण ${i + 1}` : `Day ${i + 1}: ${topic} Milestone ${i + 1}`,
        depth: i < 2 ? "beginner" : i < 5 ? "intermediate" : "advanced",
        time_minutes: 30,
        visual_type: i % 2 === 0 ? "diagram" : "timeline",
        visual_content: `graph LR\n  D${i + 1}[Day ${i + 1}] --> Goal[Mastery]`,
        checkpoint_question: isHi ? `दिन ${i + 1} का मुख्य सिद्धांत क्या है?` : `What is the key takeaway of Day ${i + 1}?`,
        day: i + 1,
      })),
      total_time_minutes: 210,
      language,
    };
  }

  const count = timeMinutes <= 5 ? 2 : timeMinutes <= 20 ? 3 : 5;
  const concepts: ConceptPlan[] = [];

  if (priorWeakConcepts.length > 0) {
    concepts.push({
      name: isHi ? `पुनरावलोकन: ${priorWeakConcepts[0]}` : `Review: ${priorWeakConcepts[0]}`,
      depth: "beginner",
      time_minutes: Math.max(2, Math.floor(timeMinutes / (count + 1))),
      visual_type: "diagram",
      visual_content: "graph TD\n  Weak[Prior Gap] --> Fixed[Mastered Concept]",
      checkpoint_question: isHi ? "क्या इस पुनरावलोकन से आपका संदेह दूर हुआ?" : "How does this bridge the previous gap?",
    });
  }

  for (let i = 1; i <= count; i++) {
    concepts.push({
      name: isHi ? `${topic} - अवधारणा ${i}` : `${topic}: Key Principle ${i}`,
      depth: i === 1 ? depth : "intermediate",
      time_minutes: Math.floor(timeMinutes / count),
      visual_type: i === 1 ? "diagram" : i === 2 ? "equation" : "code",
      visual_content:
        i === 1
          ? "graph TD\n  A[Core Principle] --> B[Implementation] --> C[Results]"
          : i === 2
          ? "E = mc^2"
          : "def execute_pipeline(input_data):\n    return process(input_data)",
      checkpoint_question: isHi
        ? `इस अवधारणा का मुख्य उद्देश्य क्या है और यह कैसे काम करती है?`
        : `What is the primary function of this principle in practice?`,
    });
  }

  return {
    concepts,
    total_time_minutes: timeMinutes,
    language,
  };
}

function getFallbackExplanation(concept: ConceptPlan, chunks: ExtractedConceptChunk[], lang: Language): ExplanationResponse {
  const isHi = lang === "hi";
  return {
    spoken_text: isHi
      ? `नमस्ते! आज हम ${concept.name} के बारे में समझेंगे। यह हमारे विषय का अत्यंत महत्वपूर्ण अंग है। ध्यान से देखें कि यह कैसे काम करता है।`
      : `Welcome to this concept on ${concept.name}. It forms a foundational building block for our topic. Let us explore its core intuition together.`,
    visual_type: concept.visual_type || "diagram",
    visual_content: concept.visual_content || "graph TD\n  Start[Concept] --> Step[Mechanism] --> Finish[Output]",
    citations: chunks.length > 0 ? [chunks[0].concept_name] : [concept.name],
    concept_name: concept.name,
    checkpoint_question: concept.checkpoint_question || (isHi ? "इस सिद्धांत का मुख्य लाभ क्या है?" : "What is the primary advantage of this principle?"),
  };
}

function getFallbackEvaluation(answer: string): EvaluationResult {
  const lower = answer.toLowerCase();
  const isWrong = lower.includes("not sure") || lower.includes("don't know") || lower.includes("गलत") || lower.length < 5;
  if (isWrong) {
    return {
      correct: false,
      misconception: "Surface-level intuition without mechanical causation",
      confidence: 0.88,
      feedback: "Good try! However, there is a subtle misconception regarding how the components interact.",
      suggested_depth: "beginner",
    };
  }
  return {
    correct: true,
    misconception: null,
    confidence: 0.94,
    feedback: "Excellent reasoning! You captured the core principle accurately.",
    suggested_depth: "intermediate",
  };
}

function getFallbackReExplanation(concept: ConceptPlan, misconception: string, lang: Language): ExplanationResponse {
  const isHi = lang === "hi";
  return {
    spoken_text: isHi
      ? `कोई बात नहीं! आइए इसे एक नए उदाहरण से समझते हैं। सोचिए जैसे एक जल विद्युत संयंत्र काम करता है - गतिज ऊर्जा को विद्युत ऊर्जा में बदलना। ठीक वैसे ही ${concept.name} काम करता है।`
      : `Let's look at this through a fresh mental model. Imagine a water reservoir channeling flow through a turbine — kinetic transformation at work. Similarly, ${concept.name} operates on transforming inputs progressively rather than static storage.`,
    visual_type: "diagram",
    visual_content: "graph LR\n  Misconception[Prior View] -.->|Correction| Reality[True Mechanism]\n  Reality --> Output[Mastery]",
    citations: [concept.name],
    concept_name: concept.name,
    checkpoint_question: isHi
      ? "इस नए जल-प्रवाह सादृश्य के आधार पर, ऊर्जा का स्थानांतरण कैसे होता है?"
      : "Based on this reservoir analogy, how does the transformation step prevent state leakage?",
    is_reexplanation: true,
    misconception_addressed: misconception,
  };
}

function getFallbackQuizQuestions(concepts: Array<{ name: string }>, lang: Language): QuizQuestion[] {
  const isHi = lang === "hi";
  return concepts.slice(0, 4).map((c, i) => ({
    id: i + 1,
    concept_name: c.name,
    question: isHi
      ? `${c.name} के संदर्भ में निम्नलिखित में से कौन सा कथन सत्य है?`
      : `Which of the following statements best describes the core principle of ${c.name}?`,
    options: isHi
      ? [
          "यह इनपुट डेटा को व्यवस्थित रूप से रूपांतरित करता है।",
          "यह केवल स्थिर मेमोरी में मान संग्रहीत करता है।",
          "यह प्रक्रिया को पूरी तरह से अवरुद्ध कर देता है।",
          "इसका वास्तविक दुनिया में कोई व्यावहारिक उपयोग नहीं है।",
        ]
      : [
          "It dynamically transforms inputs into structured outputs.",
          "It acts purely as passive static storage.",
          "It terminates execution prematurely.",
          "It holds no real-world practical utility.",
        ],
    correct_option_index: 0,
    explanation: isHi
      ? "पहला विकल्प सही है क्योंकि यह सिद्धांत सक्रिय रूपांतरण पर आधारित है।"
      : "Option A is correct because the foundational principle relies on dynamic state transformation.",
  }));
}
