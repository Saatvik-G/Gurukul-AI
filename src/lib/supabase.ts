import { createClient } from "@supabase/supabase-js";
import {
  AssessmentResult,
  ExtractedConceptChunk,
  LearnerProfile,
  LessonPlan,
  Session,
} from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseKey && !supabaseUrl.includes("your-project")
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// ============================================================================
// IN-MEMORY / LOCAL FALLBACK STORE
// ============================================================================
const memoryStore = {
  sessions: new Map<string, Session>(),
  lessonPlans: new Map<string, LessonPlan>(),
  concepts: new Map<string, ExtractedConceptChunk[]>(),
  learnerProfiles: new Map<string, LearnerProfile>(),
  assessmentResults: new Map<string, AssessmentResult[]>(),
};

// ============================================================================
// REPOSITORY HELPERS
// ============================================================================

export async function saveSession(session: Session): Promise<Session> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("sessions")
        .upsert(session)
        .select()
        .single();
      if (!error && data) return data as Session;
    } catch (e) {
      console.warn("Supabase saveSession failed, using memory store:", e);
    }
  }
  session.updated_at = new Date().toISOString();
  if (!session.created_at) session.created_at = session.updated_at;
  memoryStore.sessions.set(session.id, session);
  return session;
}

export async function getSession(sessionId: string): Promise<Session | null> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("id", sessionId)
        .single();
      if (!error && data) return data as Session;
    } catch (e) {
      console.warn("Supabase getSession failed, using memory store:", e);
    }
  }
  return memoryStore.sessions.get(sessionId) || null;
}

export async function saveLessonPlan(plan: LessonPlan): Promise<LessonPlan> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("lesson_plans")
        .upsert(plan)
        .select()
        .single();
      if (!error && data) return data as LessonPlan;
    } catch (e) {
      console.warn("Supabase saveLessonPlan failed, using memory store:", e);
    }
  }
  if (plan.session_id) {
    memoryStore.lessonPlans.set(plan.session_id, plan);
  }
  return plan;
}

export async function getLessonPlan(sessionId: string): Promise<LessonPlan | null> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("lesson_plans")
        .select("*")
        .eq("session_id", sessionId)
        .single();
      if (!error && data) return data as LessonPlan;
    } catch (e) {
      console.warn("Supabase getLessonPlan failed, using memory store:", e);
    }
  }
  return memoryStore.lessonPlans.get(sessionId) || null;
}

export async function saveConceptChunks(
  sessionId: string,
  chunks: ExtractedConceptChunk[]
): Promise<void> {
  if (supabase) {
    try {
      const rows = chunks.map((c) => ({
        session_id: sessionId,
        section_name: c.section_name,
        concept_name: c.concept_name,
        definition: c.definition,
        examples: c.examples,
        content_chunk: c.content_chunk,
        embedding: c.embedding,
      }));
      await supabase.from("concepts").insert(rows);
      return;
    } catch (e) {
      console.warn("Supabase saveConceptChunks failed, using memory store:", e);
    }
  }
  memoryStore.concepts.set(sessionId, chunks);
}

export async function retrieveRelevantChunks(
  sessionId: string,
  queryEmbedding: number[],
  topK = 3
): Promise<ExtractedConceptChunk[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase.rpc("match_concepts", {
        query_embedding: queryEmbedding,
        match_threshold: 0.1,
        match_count: topK,
        filter_session_id: sessionId,
      });
      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          concept_name: d.concept_name,
          definition: d.definition,
          examples: [],
          content_chunk: d.content_chunk,
          similarity: d.similarity,
        }));
      }
    } catch (e) {
      console.warn("Supabase retrieveRelevantChunks failed, using memory store:", e);
    }
  }

  // In-memory cosine similarity retrieval
  const sessionChunks = memoryStore.concepts.get(sessionId) || [];
  if (sessionChunks.length === 0) return [];

  const scored = sessionChunks.map((chunk) => {
    let similarity = 0.5;
    if (chunk.embedding && chunk.embedding.length === queryEmbedding.length) {
      similarity = cosineSimilarity(queryEmbedding, chunk.embedding);
    }
    return { ...chunk, similarity };
  });

  scored.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
  return scored.slice(0, topK);
}

export async function getLearnerProfile(userId = "default_user"): Promise<LearnerProfile> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("learner_profile")
        .select("*")
        .eq("user_id", userId)
        .single();
      if (!error && data) return data as LearnerProfile;
    } catch (e) {
      console.warn("Supabase getLearnerProfile failed, using memory store:", e);
    }
  }
  const existing = memoryStore.learnerProfiles.get(userId);
  if (existing) return existing;

  const defaultProfile: LearnerProfile = {
    user_id: userId,
    strong_concepts: [],
    weak_concepts: [],
    learning_pace: "medium",
    session_history: [],
    updated_at: new Date().toISOString(),
  };
  memoryStore.learnerProfiles.set(userId, defaultProfile);
  return defaultProfile;
}

export async function updateLearnerProfile(
  userId = "default_user",
  strongConcepts: string[],
  weakConcepts: string[],
  sessionData?: { session_id: string; topic: string; score: number; date: string; weak_concepts: string[] }
): Promise<LearnerProfile> {
  const profile = await getLearnerProfile(userId);
  const updatedStrong = Array.from(new Set([...profile.strong_concepts, ...strongConcepts]));
  const updatedWeak = Array.from(new Set([...profile.weak_concepts.filter(w => !strongConcepts.includes(w)), ...weakConcepts]));
  const updatedHistory = profile.session_history ? [...profile.session_history] : [];
  if (sessionData) {
    updatedHistory.push(sessionData);
  }

  const updated: LearnerProfile = {
    ...profile,
    strong_concepts: updatedStrong,
    weak_concepts: updatedWeak,
    session_history: updatedHistory,
    updated_at: new Date().toISOString(),
  };

  if (supabase) {
    try {
      await supabase.from("learner_profile").upsert(updated);
    } catch (e) {
      console.warn("Supabase updateLearnerProfile failed:", e);
    }
  }

  memoryStore.learnerProfiles.set(userId, updated);
  return updated;
}

export async function saveAssessmentResult(result: AssessmentResult): Promise<AssessmentResult> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("assessment_results")
        .insert(result)
        .select()
        .single();
      if (!error && data) return data as AssessmentResult;
    } catch (e) {
      console.warn("Supabase saveAssessmentResult failed, using memory store:", e);
    }
  }
  const existing = memoryStore.assessmentResults.get(result.session_id) || [];
  existing.push(result);
  memoryStore.assessmentResults.set(result.session_id, existing);
  return result;
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
