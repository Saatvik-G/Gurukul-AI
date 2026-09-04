export type SessionState =
  | "explaining"
  | "questioning"
  | "evaluating"
  | "reexplaining"
  | "adapting"
  | "done";

export type VisualType = "equation" | "diagram" | "code" | "timeline" | "none";
export type LearnerDepth = "beginner" | "intermediate" | "advanced";
export type Language = "en" | "hi";

export interface ConceptPlan {
  name: string;
  depth: LearnerDepth;
  time_minutes: number;
  visual_type: VisualType;
  visual_content?: string; // LaTeX code, Mermaid code, code snippet, or timeline items
  checkpoint_question: string;
  expected_key_points?: string[];
  day?: number; // for 7-day plans
}

export interface LessonPlan {
  id?: string;
  session_id?: string;
  concepts: ConceptPlan[];
  total_time_minutes: number;
  language: Language;
  created_at?: string;
}

export interface ExtractedConceptChunk {
  id?: string;
  section_name?: string;
  concept_name: string;
  definition: string;
  examples: string[];
  content_chunk: string;
  embedding?: number[];
  similarity?: number;
}

export interface Session {
  id: string;
  user_id?: string;
  title: string;
  state: SessionState;
  current_concept_index: number;
  language: Language;
  target_depth: LearnerDepth;
  available_time_minutes: number;
  metadata?: {
    topic?: string;
    sourceType?: "upload" | "topic";
    sourceFileName?: string;
    attemptCount?: number;
    priorWeakConcepts?: string[];
    [key: string]: any;
  };
  created_at?: string;
  updated_at?: string;
}

export interface EvaluationResult {
  correct: boolean;
  misconception: string | null;
  confidence: number;
  feedback: string;
  suggested_depth?: LearnerDepth;
}

export interface ExplanationResponse {
  spoken_text: string;
  visual_type: VisualType;
  visual_content: string;
  citations: string[];
  concept_name: string;
  checkpoint_question: string;
  is_reexplanation?: boolean;
  misconception_addressed?: string | null;
}

export interface LearnerProfile {
  id?: string;
  user_id: string;
  strong_concepts: string[];
  weak_concepts: string[];
  learning_pace: "slow" | "medium" | "fast";
  session_history?: Array<{
    session_id: string;
    topic: string;
    score: number;
    date: string;
    weak_concepts: string[];
  }>;
  updated_at?: string;
}

export interface QuizQuestion {
  id: number;
  concept_name: string;
  question: string;
  options: string[];
  correct_option_index: number;
  explanation: string;
}

export interface AssessmentResult {
  id?: string;
  session_id: string;
  user_id?: string;
  score: number;
  total_questions: number;
  percentage: number;
  strong_concepts: string[];
  weak_concepts: string[];
  recommended_next: string;
  detailed_responses: Array<{
    question_id: number;
    concept_name: string;
    question: string;
    user_answer: number;
    correct_answer: number;
    is_correct: boolean;
    explanation: string;
  }>;
  created_at?: string;
}
