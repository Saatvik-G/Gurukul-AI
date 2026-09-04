# Gurukul AI — Chalkboard Classroom & Adaptive AI Teacher

> **Live Prototype**: [https://gurukulai-seven.vercel.app/](https://gurukulai-seven.vercel.app/)  
> **Repository**: [https://github.com/Saatvik-G/Gurukul-AI.git](https://github.com/Saatvik-G/Gurukul-AI.git)

---

## Problem Statement

Traditional online learning platforms and standard LLM chatbots suffer from fundamental pedagogical flaws:
1. **Passive Monologues**: Chatbots dump walls of text rather than delivering interactive, paced spoken teaching with structured conceptual check-ins.
2. **Repetition Over Adaptation**: When a student fails to understand an explanation, LLMs typically regenerate the same explanation with minor wording changes rather than diagnosing the specific misconception and pivoting to a completely novel analogy or mental model.
3. **Lack of Feynman Verification**: Most tools rely strictly on multiple-choice quizzes that test passive recognition rather than requiring students to articulate mechanisms in their own words.
4. **Amnesia Across Sessions**: Chatbots do not maintain cross-session cognitive memory to open new lessons with personalized callbacks to past weak points.

**Gurukul AI** solves this with a digital chalkboard classroom — grounded in uploaded documents via Neon pgvector RAG, delivered with an amplitude-driven client-side animated avatar and Google Cloud TTS voice, and governed by an explicit pedagogical state machine that dismantles student misconceptions in real time.

---

## Solution Overview

Gurukul AI is designed as a **digital gurukul chalkboard classroom and pinned notebook**, not generic SaaS software:
- **Chalkboard Aesthetic**: Built on a deep slate green board (`--slate-bg: #22362B`), warm chalk white typography (`--chalk: #F3EFE3`), pinned paper explanation panels (`--paper: #EFE9DA`), ink text (`--ink: #2A2A26`), single turmeric accent (`--turmeric: #E3A23B`), sindoor corrections (`--sindoor: #B5482F`), and muted moss accents (`--moss: #8E9C88`).
- **Typography**: Authentic Devanagari & Latin serif headings with `Tiro Devanagari Hindi`, and clean body typography with `Work Sans`. Hand-drawn wavy underlines for section headers.
- **Feynman Mode Checkpoints**: Asks students to "explain the concept back in their own words", diagnoses missing causal links, and triggers targeted re-explanations with fresh analogies.
- **Cross-Session Memory Callback**: Detects returning students, dynamically references past weak concepts (e.g. *"Last time, Ohm\'s Law tripped you up..."*), and pins a sticky note to the notebook margin.
- **Growing Concept Map**: A schematic node graph in the notebook margin that tracks mastery in real time (turmeric = understood on 1st try, sindoor = re-explained, moss = upcoming).
- **Voice Input via Web Speech API**: Allows students to speak answers client-side with review/edit capability prior to submission.
- **Single Meaningful Motion Moment**: A chalk-eraser wipe animation sweeping across the paper panel (~400ms) when transitioning into re-explanation.

---

## Key Features

- **Chalkboard Classroom UI**: Zero generic gradient cards or neon accents. Deep slate board, pinned paper notes, and hand-drawn wavy underlines.
- **Feynman Mode ("Explain It Back to Me")**: Formative assessment where students articulate the concept in their own words. Gemini diagnoses missing mechanisms and repairs mental models.
- **Cross-Session Memory Callback**: Reads `learner_profile.weak_concepts` from Neon PostgreSQL and opens subsequent sessions with a personalized spoken & pinned sticky note refresher.
- **Growing Concept Map**: Real-time visual graph in the notebook margin tracking concept progression and mastery state.
- **Voice Input via Web Speech API**: Speech-to-text mic input with a client-side review/edit step before evaluation.
- **Pedagogical State Machine**: Explicit cognitive transitions: `explaining` &rarr; `questioning` &rarr; `evaluating` &rarr; `reexplaining` &rarr; `adapting` &rarr; `done`.
- **Misconception-Aware Re-Explanation**: Analyzes student errors and pivots to completely new physical analogies.
- **Amplitude-Driven SVG Avatar**: Real-time mouth synchronization powered by client-side Web Audio API `AnalyserNode`.
- **Multilingual (English & Hindi)**: Full end-to-end support for English and conversational Devanagari Hindi.
- **Inline Multi-Modal Visuals**: LaTeX equations (`KaTeX`), interactive architectural flowcharts (`Mermaid.js`), syntax-highlighted code blocks, and timelines.
- **Diagnostic Assessment & Mastery Report**: Auto-generated 3-5 question post-lesson quizzes, instant grading, confetti animations, and targeted recommendations.

---

## System Architecture

```
                                  +---------------------------------------+
                                  |            Learner Browser            |
                                  |  (Chalkboard Slate & Pinned Notebook) |
                                  +-------------------+-------------------+
                                                      |
                         +----------------------------+----------------------------+
                         |                                                         |
                         v                                                         v
        +--------------------------------+                        +--------------------------------+
        |     Client Multimedia Layer    |                        |    Pedagogical State Machine   |
        |  * Inset SVG Window Avatar     |                        |  * State Inspector Debug Panel |
        |  * Synced Dynamic Captions     |                        |  * Feynman Checkpoint Probes   |
        |  * Chalk Eraser Wipe Motion    |                        |  * Cross-Session Sticky Note   |
        |  * Growing Concept Map Graph   |                        |  * Web Speech Voice Input      |
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
                      |  * Feynman gap diagnostician |              |  * Vercel Blob Audio Cache   |              |  * learner_profile           |
                      |  * Misconception evaluator   |              |  * Web Speech Client Fallback|              |  * assessment_results        |
                      +------------------------------+              +------------------------------+              +------------------------------+
```

---

## AI/ML Models Used

- **Google Gemini 1.5 Flash (`gemini-1.5-flash`) & Cascade (2.0 Flash / 1.5 Pro)**: Concept extraction, adaptive lesson planning, Feynman gap diagnosis, grounded conversational explanations, and diagnostic evaluation with forced JSON schemas.
- **Google Gemini Embeddings (`text-embedding-004`)**: Generates dense 768-dimensional vector representations for document chunks.
- **Google Cloud Neural2 Text-to-Speech (`en-US-Neural2-F`, `hi-IN-Neural2-A`)**: Natural deep learning neural voices for lesson delivery.

---

## APIs and Third-Party Services Used

| Service / Library | Purpose |
| :--- | :--- |
| **Google Gemini Flash API** | Content extraction, lesson planning, grounded dialogue, Feynman evaluation |
| **Google Cloud TTS API** | Spoken audio synthesis in English & Hindi |
| **Neon (PostgreSQL + pgvector)** | Serverless relational database, pgvector embeddings, and learner cognitive memory |
| **Vercel Blob (`@vercel/blob`)** | Cloud storage for cached TTS audio payloads |
| **Next.js 14+ (App Router)** | Full-stack framework & Serverless API routes |
| **Tailwind CSS** | Custom chalkboard classroom design tokens |
| **KaTeX** | Real-time LaTeX mathematical equation rendering |
| **Mermaid.js** | Interactive diagram and flowchart rendering |
| **Web Speech API** | Client-side speech recognition for student answers |
| **Canvas Confetti** | Celebration animation on lesson completion |

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
   git commit -m "feat: Gurukul AI v2 chalkboard classroom overhaul"
   git push origin main
   ```
2. Import project into [Vercel](https://vercel.com).
3. Under **Project Settings &rarr; Environment Variables**, add:
   - `GEMINI_API_KEY`
   - `DATABASE_URL` (or attach Neon integration)
   - `GOOGLE_CLOUD_TTS_KEY` (optional)
   - `BLOB_READ_WRITE_TOKEN` (optional)
4. Click **Deploy**.

---

## Known Limitations

- **Browser Speech Recognition Support**: Web Speech API (`SpeechRecognition`) works natively in Chrome, Edge, and Safari 14.1+, but older Safari/Firefox browsers fall back to typing input.
- **Binary PPTX/DOCX Stream Decoding**: Complex nested shapes in uploaded PPTX files are parsed as structured text context rather than vector slides.
- **Indic Language Scope**: English and Hindi are fully implemented end-to-end with native Devanagari typography; additional Indic languages (Tamil, Telugu, Bengali) are planned for subsequent milestones.
