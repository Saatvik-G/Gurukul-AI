# Gurukul AI — Adaptive AI Teacher

> **Live Prototype**: [https://gurukul-ai-alpha.vercel.app](https://gurukul-ai-alpha.vercel.app) *(Deploy to Vercel and paste production URL)*  
> **Repository**: [https://github.com/Saatvik-G/Gurukul-AI.git](https://github.com/Saatvik-G/Gurukul-AI.git)

---

## Problem Statement

Traditional online learning platforms and standard LLM chatbots suffer from three fundamental pedagogical flaws:
1. **Passive Monologues**: Chatbots dump walls of text rather than delivering interactive, paced spoken teaching with structured conceptual check-ins.
2. **Repetition Over Adaptation**: When a student fails to understand an explanation, LLMs typically regenerate the same explanation with minor wording changes rather than diagnosing the specific misconception and pivoting to a completely novel analogy or mental model.
3. **Hallucination & Lack of Grounding**: Free-form AI responses often stray from uploaded course materials or curriculum requirements.

**Gurukul AI** solves this by creating a true cognitive teaching loop — grounded in uploaded documents via Neon pgvector RAG, delivered with an amplitude-driven client-side animated avatar and Google Cloud TTS voice, and governed by an explicit pedagogical state machine that dismantles student misconceptions in real time.

---

## Solution Overview

Gurukul AI is an adaptive, human-like AI teacher inspired by the timeless Indian *Gurukul* mentorship model. It turns any document (PDF, DOCX, PPTX) or plain-text topic into an interactive, voice-narrated lesson that:
- **Plans Adaptively**: Genuinely branches lesson depth and structure for 5-minute sprints, 20-minute masteries, 60-minute workshops, or 7-day daily roadmaps.
- **Speaks with Synced Gestures**: Synthesizes natural voices in English and Hindi via Google Cloud TTS, while driving a lightweight client-side SVG avatar using Web Audio API RMS amplitude analysis (zero external API calls per frame).
- **Probes & Diagnoses**: Pauses after each concept to ask targeted checkpoint questions.
- **Pivots on Misconceptions**: If the student stumbles, the engine diagnoses the exact conceptual gap and automatically generates a fresh explanation using a completely different real-world analogy.
- **Assesses & Remembers**: Evaluates mastery with an end-of-lesson diagnostic quiz and stores strong/weak concepts into a persistent learner profile on Neon PostgreSQL to personalize subsequent lessons.

---

## Key Features

- **Document & Topic Ingestion**: Multi-modal extraction of structured concepts, definitions, and self-contained vector chunks from PDF, DOCX, PPTX, and text topics.
- **Pedagogical State Machine**: Explicit cognitive transitions: `explaining` &rarr; `questioning` &rarr; `evaluating` &rarr; `reexplaining` &rarr; `adapting` &rarr; `done`.
- **Misconception-Aware Re-Explanation**: Analyzes student errors to identify cognitive gaps and re-teaches with brand-new analogies and mental models.
- **Amplitude-Driven SVG Avatar**: Real-time mouth synchronization and natural facial gestures powered by client-side Web Audio API `AnalyserNode`.
- **Live Synced Captions**: Dynamic on-screen text reveal accompanying voice narration.
- **Multilingual (English & Hindi)**: Full end-to-end support for English and Hindi (Devanagari script, Neural2 voices, and mid-lesson language switching).
- **Inline Multi-Modal Visuals**: LaTeX equations (`KaTeX`), interactive architectural/biological flowcharts (`Mermaid.js`), syntax-highlighted code blocks, and milestone timelines.
- **Diagnostic Assessment & Mastery Report**: Auto-generated 3-5 question post-lesson quizzes, instant grading, confetti animations, and targeted recommendations.
- **Cross-Session Personalization**: Reads past weak concepts from `learner_profile` and automatically inserts refresher segments in new sessions.
- **Judge & Debug Inspector**: A real-time debug panel exposing the active state graph, pgvector similarity scores, confidence metrics, and diagnosed misconceptions.

---

## System Architecture

```
                                  +---------------------------------------+
                                  |            Learner Browser            |
                                  |  (Next.js 14 App Router + Tailwind)   |
                                  +-------------------+-------------------+
                                                      |
                         +----------------------------+----------------------------+
                         |                                                         |
                         v                                                         v
        +--------------------------------+                        +--------------------------------+
        |     Client Multimedia Layer    |                        |    Pedagogical State Machine   |
        |  * SVG Face (Web Audio API)    |                        |  * State Inspector Debug Panel |
        |  * Synced Dynamic Captions     |                        |  * Interactive Question Probe  |
        |  * KaTeX / Mermaid / Code / TL |                        |  * Language Switcher (EN / HI) |
        +--------------------------------+                        +----------------+---------------+
                                                                                   |
                                                                                   v
                                                                  +--------------------------------+
                                                                  |   Next.js API & Route Engine   |
                                                                  |  /api/ingest  |  /api/planner  |
                                                                  |  /api/teach   |  /api/tts      |
                                                                  |  /api/assess  |  /api/session  |
                                                                  +----------------+---------------+
                                                                                   |
                                     +---------------------------------------------+---------------------------------------------+
                                     |                                             |                                             |
                                     v                                             v                                             v
                      +------------------------------+              +------------------------------+              +------------------------------+
                      |   Google Gemini Flash API    |              |     Google Cloud TTS API     |              |     Neon PostgreSQL (Serverless)
                      |  * Structured JSON extractor |              |  * en-US-Neural2-F (English) |              |  * pgvector (768-dim cos)    |
                      |  * Lesson plan generator     |              |  * hi-IN-Neural2-A (Hindi)   |              |  * sessions & lesson_plans   |
                      |  * Grounded dialogue & RAG   |              |  * Vercel Blob Audio Cache   |              |  * learner_profile           |
                      |  * Misconception evaluator   |              |  * In-Memory Streaming Cache |              |  * assessment_results        |
                      +------------------------------+              +------------------------------+              +------------------------------+
```

### The Pedagogical State Machine
The core engine follows a deterministic pedagogical cycle:
1. `explaining`: Retrieves top-$k$ semantic chunks from Neon pgvector for the current concept, citing retrieved context.
2. `questioning`: Presents a targeted conceptual checkpoint to test understanding.
3. `evaluating`: Sends the student\'s answer + concept + grounding context to Gemini with a forced JSON schema: `{"correct": bool, "misconception": string | null, "confidence": float, "feedback": string}`.
4. `reexplaining` *(Triggered when incorrect)*: Passes the prior explanation and student misconception to Gemini, commanding a *completely novel analogy* and creating a fresh checkpoint question.
5. `adapting` *(Triggered when correct)*: Evaluates accuracy and pace to calibrate depth for subsequent concepts.
6. `done`: Transitions to quiz generation and learner profile mastery updates.

---

## AI/ML Models Used

- **Google Gemini 1.5 Flash (`gemini-1.5-flash`)**: Used for structured concept extraction, adaptive curriculum planning, grounded conversational explanations, diagnostic answer evaluation with misconception detection, and end-of-lesson quiz generation. Forced `responseMimeType: "application/json"` guarantees strict schema compliance.
- **Google Gemini Embeddings (`text-embedding-004`)**: Generates dense 768-dimensional vector representations of document chunks for semantic search.
- **Google Cloud Neural2 Text-to-Speech (`en-US-Neural2-F`, `hi-IN-Neural2-A`)**: Natural deep learning neural voices for lesson delivery.

---

## RAG Implementation

1. **Ingestion & Extraction**: Uploaded files (or text topics) are analyzed by Gemini 1.5 Flash to extract a structured list of `{section_name, concept_name, definition, examples, content_chunk}`.
2. **Chunk Vectorization**: Each chunk is embedded into 768-dimensional vectors using `text-embedding-004`.
3. **Storage & Indexing**: Stored in Neon PostgreSQL `concepts` table using `vector(768)` with an IVFFlat cosine similarity index (`vector_cosine_ops`).
4. **Retrieval**: Before every explanation or evaluation step, `retrieveRelevantChunks` queries Neon pgvector for top-$k$ chunks ($k=3$) using `<=>` cosine distance, ensuring zero hallucination.

---

## Prompt & Agent Architecture

All agent operations are partitioned into dedicated, single-responsibility functions with strict JSON output constraints:
- **Planner Prompt**: Generates concept graphs with visual types and checkpoint questions bounded by the requested time duration.
- **Grounded Teaching Prompt**: Forces the model to cite retrieved vector chunks and format visual code (LaTeX/Mermaid/Code).
- **Diagnostic Evaluator Prompt**: Analyzes learner responses for underlying misconceptions and assigns confidence ratings.
- **Novel Analogy Prompt**: Explicitly forbids repeating previous explanations and generates new real-world analogies.

---

## Personalization Approach

- **Cross-Session Cognitive Memory**: Weak concepts identified during checkpoint failures or post-lesson quizzes are recorded in `learner_profile.weak_concepts` in Neon PostgreSQL.
- **Automatic Refresher Ingestion**: When initiating a new lesson, the planner reads the student\'s profile and injects targeted review segments before advancing.
- **Dynamic In-Session Depth**: Students who answer with high confidence are smoothly promoted from `beginner` to `intermediate` or `advanced` depth.

---

## Assessment Methodology

- **In-Lesson Formative Assessment**: Continuous checkpoint questions at the end of each concept node.
- **Post-Lesson Summative Assessment**: A dynamically generated 3-5 question multiple-choice quiz testing deeper conceptual reasoning.
- **Automated Diagnostic Feedback**: Instant scoring, answer justifications, and automated generation of individualized study recommendations.

---

## Multilingual Implementation

- **End-to-End English & Hindi**: All prompts, explanations, visual captions, and quizzes are natively generated in English or conversational Devanagari Hindi.
- **Voice Mapping**: Automatically switches between `en-US-Neural2-F` and `hi-IN-Neural2-A`.
- **Mid-Lesson Language Switching**: Learners can toggle between English and Hindi mid-lesson without losing progress, session state, or conversation context.

---

## Voice Implementation

- **Google Cloud TTS REST API**: Direct server-side synthesis returning base64 MP3 streams.
- **Vercel Blob & In-Memory Storage**: Repeated audio requests are cached via Vercel Blob (`@vercel/blob`) and in-memory cache to prevent redundant API consumption during demos.
- **Resilient Fallback**: If API keys are unset or quotas are exceeded, the client gracefully falls back to the browser\'s native Web Speech API (`SpeechSynthesisUtterance`).

---

## Avatar & Video Generation Approach

- **Zero Per-Frame API Costs**: Built with a lightweight, client-side SVG character avoiding expensive video generation APIs that fail under latency or quota limits.
- **Web Audio API `AnalyserNode`**: Audio output connects to an `AudioContext` and `AnalyserNode` (`fftSize: 256`), measuring real-time RMS amplitude to dynamically scale the avatar\'s mouth opening (`smoothedAmp`).
- **Expressive Gestures**: Features periodic natural blinking, tilak aura, and reactive glow based on teacher mood (`explaining`, `correcting`, `encouraging`).

---

## APIs and Third-Party Services Used

| Service / Library | Purpose |
| :--- | :--- |
| **Google Gemini Flash API** | Content extraction, lesson planning, grounded dialogue, diagnostic evaluation |
| **Google Cloud TTS API** | Spoken audio synthesis in English & Hindi |
| **Neon (PostgreSQL + pgvector)** | Serverless relational database, pgvector embeddings, and session state persistence |
| **Vercel Blob (`@vercel/blob`)** | Cloud storage for cached TTS audio payloads |
| **Next.js 14+ (App Router)** | Full-stack framework & Serverless API routes |
| **Tailwind CSS** | Styling and responsive design |
| **KaTeX** | Real-time LaTeX mathematical equation rendering |
| **Mermaid.js** | Interactive diagram and flowchart rendering |
| **Lucide React** | Application iconography |
| **Canvas Confetti** | Visual celebration on lesson assessment completion |

---

## Setup Instructions

### Prerequisites
- Node.js 18+ or 20+
- npm or pnpm
- (Optional) Neon project connection string & Google Cloud / AI Studio API keys

### Local Installation
```bash
# 1. Clone repository
git clone https://github.com/Saatvik-G/Gurukul-AI.git
cd Gurukul-AI

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env.local
# Open .env.local and add your GEMINI_API_KEY, GOOGLE_CLOUD_TTS_KEY, and DATABASE_URL (from Neon)

# 4. Set up Neon Database (if using live Neon)
# Run the SQL migration script from neon/schema.sql in the Neon SQL Editor.

# 5. Run the development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Deployment Instructions

1. Push code to your GitHub repository:
   ```bash
   git add .
   git commit -m "feat: migrate to Neon PostgreSQL with pgvector and Vercel Blob"
   git push origin main
   ```
2. Import project into [Vercel](https://vercel.com).
3. Under **Project Settings &rarr; Environment Variables**, add:
   - `GEMINI_API_KEY`
   - `GOOGLE_CLOUD_TTS_KEY`
   - `DATABASE_URL` (Neon PostgreSQL connection string)
   - `BLOB_READ_WRITE_TOKEN` (Automatically configured if Vercel Blob store is attached)
4. Click **Deploy**.

---

## Known Limitations

- **File Parsing on Serverless**: Heavy binary PPTX/DOCX formatting extraction relies on plain-text stream decoding; complex nested tables and vector charts within PDF/PPTX are simplified into textual context chunks.
- **Offline Fallback Speech**: When operating without a Google Cloud TTS key, the browser\'s native Web Speech API voice quality varies depending on the client OS and browser voice packs.
- **Third Language Support**: English and Hindi are fully implemented end-to-end; additional Indic languages (Tamil, Telugu, Bengali) are planned for subsequent milestones.
