import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  ConceptPlan,
  EvaluationResult,
  ExplanationResponse,
  ExtractedConceptChunk,
  InteractionType,
  Language,
  LearnerDepth,
  LessonPlan,
  QuizQuestion,
} from "./types";

const getApiKey = () => process.env.GEMINI_API_KEY || "";

export const getGeminiClient = () => {
  const key = getApiKey();
  return new GoogleGenerativeAI(key || "dummy_key");
};

// Candidate model cascade with active Gemini models
const MODEL_CANDIDATES = [
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-flash-latest",
];

async function getWorkingModel(ai: GoogleGenerativeAI, jsonMode = true) {
  for (const modelName of MODEL_CANDIDATES) {
    try {
      return ai.getGenerativeModel({
        model: modelName,
        generationConfig: jsonMode
          ? { responseMimeType: "application/json", temperature: 0.2 }
          : { temperature: 0.3 },
      });
    } catch {
      continue;
    }
  }
  return ai.getGenerativeModel({ model: "gemini-3.6-flash" });
}

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
    const model = await getWorkingModel(ai, true);

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
    console.error("Gemini extractStructuredConcepts error, using fallback:", error);
    return getFallbackExtractedConcepts(rawContent, language);
  }
}

// ============================================================================
// 2. VECTOR EMBEDDINGS (gemini-embedding-2)
// ============================================================================
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return generateDeterministicEmbedding(text, 768);
  }

  try {
    const ai = getGeminiClient();
    const model = ai.getGenerativeModel({ model: "gemini-embedding-2" });
    const result = await model.embedContent(text.slice(0, 2048));
    if (result.embedding?.values && result.embedding.values.length > 0) {
      // 768-dim slice for pgvector compatibility
      return result.embedding.values.slice(0, 768);
    }
    return generateDeterministicEmbedding(text, 768);
  } catch (error) {
    return generateDeterministicEmbedding(text, 768);
  }
}

// ============================================================================
// 3. LESSON PLANNER (With Feynman Mode & Cross-Session Memory Callback)
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
    const model = await getWorkingModel(ai, true);

    const is7Day = timeMinutes >= 1000 || timeMinutes === 7;
    const effectiveTime = is7Day ? 7 * 30 : timeMinutes;

    const weakConceptsInstruction =
      priorWeakConcepts.length > 0
        ? `IMPORTANT: The learner previously struggled with: ${priorWeakConcepts.join(", ")}.
1. Generate an explicit "prior_memory_callback" field in natural spoken ${language === "hi" ? "Hindi" : "English"} referencing this exact history, e.g. "Last time, ${priorWeakConcepts[0]} tripped you up — let's start with a quick 2-minute refresher before we move on."
2. Dedicate the initial concept to bridging this gap.`
        : "";

    const prompt = `You are the master curriculum architect for Gurukul AI chalkboard classroom.
Create an adaptive, structured lesson plan for:
Topic / Source Material: """${topicOrDocument.slice(0, 10000)}"""
Target Learner Level: ${depth}
Available Time: ${is7Day ? "7-Day Roadmap (daily progressive breakdown)" : `${effectiveTime} minutes`}
Target Teaching Language: ${language === "hi" ? "Hindi (Devanagari)" : "English"}
${weakConceptsInstruction}

PLANNING RULES:
1. For 5 minutes: Exactly 2 core concepts.
2. For 20 minutes: 3 to 4 concepts.
3. For 60 minutes: 5 to 6 concepts.
4. For 7 days: 7 concepts tagged with day: 1 through 7.
5. FEYNMAN MODE: Mark roughly 1 in 3 concepts (especially core conceptual ones) with "interaction_type": "feynman". For these, the "checkpoint_question" MUST ask the student: "Explain [Concept] back to me in your own words, as if teaching someone who has never heard of it." For standard concepts, use "interaction_type": "question".
6. visual_type MUST be one of: "equation", "diagram", "code", "timeline", "none".

Return ONLY a JSON object:
{
  "concepts": [
    {
      "name": "Concept Title",
      "depth": "beginner" | "intermediate" | "advanced",
      "time_minutes": number,
      "visual_type": "equation" | "diagram" | "code" | "timeline" | "none",
      "checkpoint_question": "string",
      "interaction_type": "question" | "feynman",
      "day": number
    }
  ],
  "total_time_minutes": number,
  "language": "${language}",
  "prior_memory_callback": "string or null"
}`;

    const result = await model.generateContent(prompt);
    const parsed = JSON.parse(result.response.text()) as LessonPlan;
    if (parsed && Array.isArray(parsed.concepts) && parsed.concepts.length > 0) {
      return parsed;
    }
    throw new Error("Invalid lesson plan structure");
  } catch (error) {
    console.error("Gemini generateLessonPlan error, using fallback:", error);
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
    const model = await getWorkingModel(ai, true);

    const contextText = retrievedChunks
      .map((c, i) => `[Chunk ${i + 1} - ${c.concept_name}]:\nDefinition: ${c.definition}\n${c.content_chunk}\nExamples: ${c.examples.join(", ")}`)
      .join("\n\n");

    const prompt = `You are Gurukul AI, a world-class empathetic tutor delivering an engaging live chalkboard lesson.
Lesson Topic: ${lessonTitle}
Current Concept: ${concept.name}
Target Depth: ${depth}
Visual Type: ${concept.visual_type}
Interaction Mode: ${concept.interaction_type || "question"}
Language: ${language === "hi" ? "Hindi (Conversational Devanagari)" : "English"}

GROUNDING CONTEXT:
"""
${contextText || concept.name}
"""

TEACHING INSTRUCTIONS:
1. "spoken_text": A concise, clear 3-5 sentence explanation designed for spoken delivery.
2. "visual_content": Code/syntax for visual_type:
   - "equation": LaTeX math (e.g., E = mc^2)
   - "diagram": Mermaid.js graph (e.g., graph TD\n A[Input] --> B[Processing] --> C[Output])
   - "code": Clean runnable snippet
   - "timeline": Step 1 -> Step 2 -> Step 3
   - "none": ""
3. "citations": Short array of cited chunk titles.
4. "checkpoint_question": ${
      concept.interaction_type === "feynman"
        ? language === "hi"
          ? `"अब अपनी समझ से मुझे समझाइए: ${concept.name} कैसे काम करता है?"`
          : `"Now explain it back to me in your own words: how does ${concept.name} actually work?"`
        : `"${concept.checkpoint_question}"`
    }

Output JSON ONLY:
{
  "spoken_text": "string",
  "visual_type": "${concept.visual_type}",
  "visual_content": "string",
  "citations": ["string"],
  "concept_name": "${concept.name}",
  "checkpoint_question": "string",
  "interaction_type": "${concept.interaction_type || "question"}"
}`;

    const result = await model.generateContent(prompt);
    const parsed = JSON.parse(result.response.text()) as ExplanationResponse;
    return parsed;
  } catch (error) {
    console.error("Gemini generateGroundedExplanation error, using fallback:", error);
    return getFallbackExplanation(concept, retrievedChunks, language);
  }
}

// ============================================================================
// 5. TEACHING LOOP: ANSWER EVALUATION (Supports Feynman Mode & Gaps)
// ============================================================================
export function isAnswerEvasiveOrUncertain(answer: string): boolean {
  if (!answer || typeof answer !== "string") return true;
  const cleaned = answer
    .toLowerCase()
    .trim()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'’]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length === 0) return true;

  // Exact or contains evasive/uncertain markers
  const evasivePatterns = [
    /\b(i\s+)?(do\s+no|do\s+not|dont|don\s*t|didnt|didn\s*t)\s+know\b/,
    /\b(i\s+)?(have\s+no|dont\s+have|don\s*t\s+have|no)\s+(idea|clue|thought)\b/,
    /\b(not\s+sure|im\s+not\s+sure|i\s+am\s+not\s+sure)\b/,
    /\b(idk|dunno|idc|n\/a|na|none)\b/,
    /\b(forgot|cant\s+remember|can\s*t\s+remember|cannot\s+remember)\b/,
    /\b(pass|skip|nothing|no|nope|nah|idontknow)\b/,
    /\b(nahi\s+pata|pata\s+nahi|pata\s+ni|maloom\s+nahi|nahi\s+maloom|nahi\s+janta|mujhe\s+nahi\s+pata)\b/,
    /(पता\s*नहीं|नहीं\s*पता|मालूम\s*नहीं|मुझे\s*नहीं\s*पता|नहीं\s*मालूम|गलत)/,
  ];

  for (const pattern of evasivePatterns) {
    if (pattern.test(cleaned)) {
      return true;
    }
  }

  // Answer is too short to be an explanation (< 6 characters)
  if (cleaned.length < 6) {
    return true;
  }

  // Repeated single character like 'aaaaaa'
  if (/^(.)\1+$/.test(cleaned)) {
    return true;
  }

  return false;
}

export async function evaluateStudentAnswer({
  conceptName,
  question,
  studentAnswer,
  groundingContext,
  language,
  interactionType = "question",
}: {
  conceptName: string;
  question: string;
  studentAnswer: string;
  groundingContext: string;
  language: Language;
  interactionType?: InteractionType;
}): Promise<EvaluationResult> {
  const isHi = language === "hi";

  // Fast-path for evasive / uncertain answers ("i do no know", "idk", "no idea", etc.)
  if (isAnswerEvasiveOrUncertain(studentAnswer)) {
    return {
      understood: false,
      gaps: [
        isHi
          ? "शिक्षार्थी ने अनिश्चितता व्यक्त की या व्याख्या प्रस्तुत नहीं की।"
          : "Learner expressed uncertainty or did not provide an explanation of the core mechanism."
      ],
      praise_point: isHi
        ? "स्पष्ट रूप से साझा करने के लिए धन्यवाद।"
        : "Thank you for letting me know where you're at.",
      correct: false,
      misconception: isHi
        ? "अवधारणा की समझ अभी पूरी तरह स्पष्ट नहीं है।"
        : "Learner indicated they do not know or are unsure of the core mechanism.",
      confidence: 0.99,
      feedback: isHi
        ? "कोई बात नहीं! आइए इसे एक नए, बहुत ही सरल उदाहरण और सादृश्य से दोबारा समझते हैं।"
        : "No problem at all! Let's wipe the slate clean and break this down with a fresh, intuitive mental model.",
      suggested_depth: "beginner",
      interaction_type: interactionType,
    };
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    return getFallbackEvaluation(studentAnswer, interactionType, language);
  }

  try {
    const ai = getGeminiClient();
    const model = await getWorkingModel(ai, true);

    const isFeynman = interactionType === "feynman";

    const prompt = isFeynman
      ? `You are the Feynman diagnostic engine for Gurukul AI.
The student was asked to explain the concept "${conceptName}" back in their own words.

Student's Explanation: """${studentAnswer}"""
Ground Truth / Reference: """${groundingContext}"""
Language: ${language === "hi" ? "Hindi" : "English"}

STRICT PEDAGOGICAL GRADING RULES:
1. Genuine Feynman understanding requires explaining the underlying mechanism/process in their own words.
2. If the student expresses uncertainty, lack of knowledge (e.g., 'don't know', 'not sure'), gives a tautology, or provides an answer missing the core mechanism, you MUST set "understood": false, "correct": false, and summarize the primary gap in "misconception".
3. NEVER mark an uncertain, evasive, or shallow response as understood or correct.
4. "gaps": array of specific missing causal links or conceptual mistakes. If correct, empty array [].
5. "praise_point": what the student articulated well (or acknowledge their effort).
6. "feedback": constructive, encouraging guidance in ${language === "hi" ? "Hindi" : "English"}.
7. "correct": true ONLY if understood is true and gaps are non-critical; false otherwise.

Return ONLY JSON:
{
  "understood": boolean,
  "gaps": string[],
  "praise_point": "string",
  "correct": boolean,
  "misconception": string or null,
  "confidence": number,
  "feedback": "string",
  "interaction_type": "feynman"
}`
      : `You are the diagnostic assessment engine for Gurukul AI.
Evaluate the student's response to: "${conceptName}".

Question: """${question}"""
Student's Answer: """${studentAnswer}"""
Ground Truth: """${groundingContext}"""
Language: ${language === "hi" ? "Hindi" : "English"}

STRICT PEDAGOGICAL GRADING RULES:
1. If the student's answer expresses lack of knowledge, is incorrect, or is evasive, you MUST set "correct": false and provide a clear "misconception".
2. NEVER mark 'don't know', 'not sure', blank, or evasive responses as correct under any circumstance.
3. If correct, "correct": true, "misconception": null.

Return ONLY JSON:
{
  "correct": boolean,
  "misconception": string or null,
  "confidence": number,
  "feedback": "string",
  "suggested_depth": "beginner" | "intermediate" | "advanced",
  "interaction_type": "question"
}`;

    const result = await model.generateContent(prompt);
    const parsed = JSON.parse(result.response.text()) as EvaluationResult;
    return parsed;
  } catch (error) {
    console.error("Gemini evaluateStudentAnswer error, using fallback:", error);
    return getFallbackEvaluation(studentAnswer, interactionType, language);
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
    const model = await getWorkingModel(ai, true);

    const prompt = `You are Gurukul AI delivering a targeted chalkboard re-explanation.
The student struggled with a specific conceptual gap / misconception.

Concept: "${concept.name}"
Previous Explanation Given: """${previousExplanation}"""
Student's Response: """${studentAnswer}"""
Identified Gap / Misconception: """${misconception}"""
Language: ${language === "hi" ? "Hindi (Conversational Devanagari)" : "English"}

CRITICAL PEDAGOGICAL INSTRUCTIONS:
1. DO NOT simply repeat the previous explanation.
2. Introduce a COMPLETELY NOVEL analogy or intuitive physical comparison directly resolving: "${misconception}".
3. Keep spoken_text under 4-5 encouraging, crystal-clear spoken sentences.
4. Formulate a FRESH, alternative checkpoint question.

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
    console.error("Gemini generateReExplanation error, using fallback:", error);
    return getFallbackReExplanation(concept, misconception, language);
  }
}

// ============================================================================
// 7. END-OF-LESSON ASSESSMENT GENERATOR
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
    const model = await getWorkingModel(ai, true);

    const prompt = `You are the master assessment creator for Gurukul AI.
Create a 3 to 5 question multiple-choice quiz testing the student's mastery of the lesson: "${lessonTitle}".
Covered Concepts:
${coveredConcepts.map((c, i) => `${i + 1}. ${c.name}: ${c.definition || ""}`).join("\n")}
Language: ${language === "hi" ? "Hindi" : "English"}

Return ONLY a JSON array:
[
  {
    "id": 1,
    "concept_name": "Concept name",
    "question": "Question string",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_option_index": 0,
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
    console.error("Gemini generateAssessmentQuiz error, using fallback:", error);
    return getFallbackQuizQuestions(coveredConcepts, language);
  }
}

// ============================================================================
// FALLBACKS
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
  const cleanTopic = topic.trim() || "Core Concepts";

  const callback =
    priorWeakConcepts.length > 0
      ? isHi
        ? `पिछली बार ${priorWeakConcepts[0]} में कठिनाई हुई थी — आइए आगे बढ़ने से पहले 2 मिनट का पुनरावलोकन करें।`
        : `Last time, ${priorWeakConcepts[0]} tripped you up — let's start with a quick 2-minute refresher before we move on.`
      : undefined;

  if (is7Day) {
    return {
      concepts: Array.from({ length: 7 }, (_, i) => ({
        name: isHi ? `दिन ${i + 1}: ${cleanTopic} का चरण ${i + 1}` : `Day ${i + 1}: Foundations of ${cleanTopic} (Stage ${i + 1})`,
        depth: i < 2 ? "beginner" : i < 5 ? "intermediate" : "advanced",
        time_minutes: 30,
        visual_type: i % 2 === 0 ? "diagram" : "timeline",
        visual_content: `graph LR\n  D${i + 1}[Day ${i + 1}: Input] --> Proc[Mechanism] --> Goal[Mastery Output]`,
        checkpoint_question:
          i % 2 === 1
            ? isHi
              ? `अपनी भाषा में समझाएं कि दिन ${i + 1} का मुख्य तंत्र क्या है?`
              : `Explain in your own words: how does the core mechanism of Stage ${i + 1} work?`
            : isHi
            ? `दिन ${i + 1} का मुख्य सिद्धांत क्या है?`
            : `What is the primary function of this principle in practice?`,
        interaction_type: i % 2 === 1 ? "feynman" : "question",
        day: i + 1,
      })),
      total_time_minutes: 210,
      language,
      prior_memory_callback: callback,
    };
  }

  const count = timeMinutes <= 5 ? 2 : timeMinutes <= 20 ? 3 : 5;
  const concepts: ConceptPlan[] = [];

  if (priorWeakConcepts.length > 0) {
    concepts.push({
      name: isHi ? `पुनरावलोकन: ${priorWeakConcepts[0]}` : `Refresher: ${priorWeakConcepts[0]} (Intuitive Model)`,
      depth: "beginner",
      time_minutes: Math.max(2, Math.floor(timeMinutes / (count + 1))),
      visual_type: "diagram",
      visual_content: `graph LR\n  PriorMisconception[Prior Confusion] -->|Key Insight| CoreShift[Correct Mental Model]\n  CoreShift --> Applied[Solid Understanding]`,
      checkpoint_question: isHi
        ? "अपनी भाषा में बताएं कि यह नया दृष्टिकोण पिछले संदेह को कैसे दूर करता है?"
        : "Explain in your own words how this addresses your previous misconception.",
      interaction_type: "feynman",
    });
  }

  // Pre-configured concept blueprints based on topic keywords
  const isQuantum = cleanTopic.toLowerCase().includes("quantum") || cleanTopic.toLowerCase().includes("qubit");
  const isMath = cleanTopic.toLowerCase().includes("calculus") || cleanTopic.toLowerCase().includes("linear") || cleanTopic.toLowerCase().includes("math");
  
  const defaultTitlesEn = isQuantum
    ? [
        "Quantum Superposition & State Vectors",
        "Bloch Sphere & Phase Interference",
        "Quantum Entanglement & Logic Gates",
        "Measurement Collapse & Observable States",
        "Practical Quantum Algorithms"
      ]
    : isMath
    ? [
        "Foundational Definition & Intuitive Limit",
        "Rate of Change & Geometric Tangents",
        "Chain Rule & Multivariable Gradients",
        "Optimization & Extreme Values",
        "Real-world Physical Applications"
      ]
    : [
        `Foundations & Core Principles of ${cleanTopic}`,
        `Operational Mechanism & State Transitions in ${cleanTopic}`,
        `System Architecture & Practical Workflow`,
        `Edge Cases, Trade-offs & Error Prevention`,
        `Real-World Implementation & Best Practices`
      ];

  const defaultTitlesHi = [
    `${cleanTopic}: मूल सिद्धांत एवं आधारशिला`,
    `${cleanTopic}: संचालन तंत्र एवं प्रक्रिया`,
    `${cleanTopic}: वास्तुकला और व्यावहारिक अनुप्रयोग`,
    `${cleanTopic}: प्रमुख चुनौतियाँ एवं समाधान`,
    `${cleanTopic}: वास्तविक दुनिया में उपयोग`
  ];

  for (let i = 1; i <= count; i++) {
    const isFeynman = i === 2 || (count === 2 && i === 2);
    const title = isHi ? defaultTitlesHi[i - 1] || `${cleanTopic} - भाग ${i}` : defaultTitlesEn[i - 1] || `${cleanTopic}: Core Mechanism ${i}`;
    
    let visualType: "diagram" | "equation" | "code" | "timeline" = "diagram";
    let visualContent = "";

    if (isQuantum) {
      if (i === 1) {
        visualType = "equation";
        visualContent = "|\\psi\\rangle = \\alpha|0\\rangle + \\beta|1\\rangle \\quad (\\text{where } |\\alpha|^2 + |\\beta|^2 = 1)";
      } else if (i === 2) {
        visualType = "diagram";
        visualContent = "graph TD\n  State0[|0> Ground State] --> HGate[Hadamard Gate H]\n  HGate --> Superposed[Equal Superposition: |+>]\n  Superposed --> Measure[Measurement Probe]\n  Measure --> Outcome0[50% Probability: 0]\n  Measure --> Outcome1[50% Probability: 1]";
      } else {
        visualType = "equation";
        visualContent = "CNOT|10\\rangle = |11\\rangle \\quad \\text{and} \\quad H = \\frac{1}{\\sqrt{2}}\\begin{pmatrix} 1 & 1 \\\\ 1 & -1 \\end{pmatrix}";
      }
    } else {
      if (i === 1) {
        visualType = "diagram";
        visualContent = `graph LR\n  Input[Initial State / Inputs] --> Process[${cleanTopic} Core Mechanism]\n  Process --> Output[Transformed Output / Goal]`;
      } else if (i === 2) {
        visualType = "equation";
        visualContent = "f(x) = \\lim_{\\Delta x \\to 0} \\frac{f(x + \\Delta x) - f(x)}{\\Delta x}";
      } else {
        visualType = "code";
        visualContent = `// Implementation logic for ${cleanTopic}\nfunction executePipeline(state) {\n  const transformed = transform(state);\n  return validate(transformed);\n}`;
      }
    }

    concepts.push({
      name: title,
      depth: i === 1 ? depth : "intermediate",
      time_minutes: Math.floor(timeMinutes / count),
      visual_type: visualType,
      visual_content: visualContent,
      checkpoint_question: isFeynman
        ? isHi
          ? `अब अपनी समझ से मुझे समझाइए: "${title}" कैसे काम करता है?`
          : `Explain it back to me in your own words: how does "${title}" actually work?`
        : isHi
        ? `इस सिद्धांत का मुख्य उद्देश्य और संचालन तरीका क्या है?`
        : `What is the primary function and operating principle of this concept?`,
      interaction_type: isFeynman ? "feynman" : "question",
    });
  }

  return {
    concepts,
    total_time_minutes: timeMinutes,
    language,
    prior_memory_callback: callback,
  };
}

function getFallbackExplanation(concept: ConceptPlan, chunks: ExtractedConceptChunk[], lang: Language): ExplanationResponse {
  const isHi = lang === "hi";
  const name = concept.name;

  let spokenText = "";
  if (isHi) {
    spokenText = `नमस्ते! आज हम "${name}" की गहराई में उतरेंगे। इसका मूल विचार यह है कि हम जटिल प्रक्रियाओं को सरल घटकों में तोड़कर समझें। ध्यान से देखें कि कैसे प्रत्येक इनपुट एक सुनियोजित तंत्र के माध्यम से अपने अंतिम परिणाम में रूपांतरित होता है।`;
  } else {
    if (name.toLowerCase().includes("superposition") || name.toLowerCase().includes("qubit")) {
      spokenText = `In quantum computing, a qubit doesn't have to be just 0 or 1 like a classical bit. Through superposition, it exists simultaneously in a linear combination of both basis states until we measure it. This allows quantum algorithms to evaluate immense computational paths in parallel.`;
    } else if (name.toLowerCase().includes("refresher")) {
      spokenText = `Let's quickly refresh our mental model for ${name.replace(/refresher:?\s*/i, "")}. Rather than memorizing static formulas, think of it as an active transformation where previous inputs directly shape the state transitions.`;
    } else {
      spokenText = `Let's break down "${name}". The foundational intuition centers on how state changes happen progressively. Notice on the chalkboard how each component actively channels information to produce the target outcome without unnecessary friction.`;
    }
  }

  return {
    spoken_text: spokenText,
    visual_type: concept.visual_type || "diagram",
    visual_content: concept.visual_content || `graph LR\n  A[Core Principle] --> B[Operational Mechanism] --> C[Desired Outcome]`,
    citations: chunks.length > 0 ? [chunks[0].concept_name] : [concept.name],
    concept_name: concept.name,
    checkpoint_question:
      concept.checkpoint_question ||
      (concept.interaction_type === "feynman"
        ? isHi
          ? `अब अपनी समझ से मुझे समझाइए: "${name}" कैसे काम करता है?`
          : `Now explain it back to me in your own words: how does "${name}" actually work?`
        : isHi
        ? "इस सिद्धांत का मुख्य लाभ और कार्यप्रणाली क्या है?"
        : "What is the primary advantage and mechanism of this principle?"),
    interaction_type: concept.interaction_type || "question",
  };
}

function getFallbackEvaluation(
  answer: string,
  interactionType: InteractionType = "question",
  language: Language = "en"
): EvaluationResult {
  const isHi = language === "hi";
  const isUncertain = isAnswerEvasiveOrUncertain(answer);
  const isTooShort = (answer || "").trim().length < 15;
  const isWrong = isUncertain || isTooShort;

  if (interactionType === "feynman") {
    if (isWrong) {
      return {
        understood: false,
        gaps: [
          isHi
            ? "शिक्षार्थी ने अवधारणा के मूल तंत्र या अवस्था परिवर्तन की व्याख्या नहीं की।"
            : "Missing core operational mechanism and causal transitions.",
        ],
        praise_point: isHi
          ? "सच्चाई से साझा करने के लिए धन्यवाद।"
          : "Thank you for letting me know where you stand.",
        correct: false,
        misconception: isHi
          ? "अवधारणा की समझ अभी पूरी तरह स्पष्ट नहीं है।"
          : "Learner expressed uncertainty or gave an incomplete conceptual breakdown.",
        confidence: 0.95,
        feedback: isHi
          ? "कोई बात नहीं! आइए इसे एक नए, बहुत ही सरल उदाहरण से समझते हैं।"
          : "No worries! Let's build the intuition from scratch with a fresh, simple analogy.",
        interaction_type: "feynman",
      };
    }
    return {
      understood: true,
      gaps: [],
      praise_point: isHi
        ? "अवधारणा का सटीक और स्पष्ट विवरण।"
        : "Clear intuitive breakdown of the core mechanism.",
      correct: true,
      misconception: null,
      confidence: 0.95,
      feedback: isHi
        ? "बहुत बढ़िया व्याख्या! आपने इस अवधारणा के मुख्य सिद्धांत को अपनी भाषा में सरलता से समझा दिया।"
        : "Brilliant explanation in your own words! You captured the full intuition.",
      interaction_type: "feynman",
    };
  }

  if (isWrong) {
    return {
      correct: false,
      misconception: isHi
        ? "अवधारणा की समझ अभी पूरी तरह स्पष्ट नहीं है।"
        : "Learner expressed uncertainty or gave an incomplete answer.",
      confidence: 0.95,
      feedback: isHi
        ? "कोई बात नहीं! आइए इसे एक नए उदाहरण से समझते हैं।"
        : "No problem! Let's look at this through a different and clearer perspective.",
      suggested_depth: "beginner",
      interaction_type: "question",
    };
  }
  return {
    correct: true,
    misconception: null,
    confidence: 0.94,
    feedback: isHi
      ? "शानदार! आपने सही उत्तर दिया है।"
      : "Excellent reasoning! You captured the core principle accurately.",
    suggested_depth: "intermediate",
    interaction_type: "question",
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
    interaction_type: "question",
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
