# Gurukul AI — Demo Video & Presentation Script (3–5 Minutes)

> **Core Highlight Scene**: The **Misconception-Aware Re-Explanation Moment** — where an incorrect answer triggers a diagnostic breakdown, novel analogy generation, and state machine pivot in the inspectable debug panel.

---

## Timeline Overview

| Timestamp | Phase | Screen Action | Key Talking Points |
| :--- | :--- | :--- | :--- |
| **0:00 – 0:45** | **Problem & Solution Overview** | Landing Page & Architecture Cards | Why static chatbots fail, introducing Gurukul AI\'s cognitive loop. |
| **0:45 – 1:15** | **Ingestion & Lesson Planner** | Uploading material / Selecting "Quantum Superposition & Qubits", 5m/20m mode | RAG extraction into pgvector, structured JSON curriculum planning. |
| **1:15 – 2:15** | **Teaching & Avatar Demonstration** | Active Teaching Screen with Amplitude Avatar & Mermaid Diagram | Google Cloud TTS voice, synced on-screen captions, Web Audio API amplitude. |
| **2:15 – 3:30** | **The Adaptation Moment (Crucial)** | Submitting an incorrect answer & watching the State Machine pivot | Misconception diagnosis, novel reservoir analogy, state debug inspector. |
| **3:30 – 4:15** | **Assessment & Personalization** | Taking the 3-question quiz, score report, confetti, Hindi toggle | Diagnostic scoring, saving weak areas to `learner_profile`. |
| **4:15 – 4:45** | **Closing & Summary** | Returning to home, showing cognitive memory badge | Scalable, reliable, hackathon-ready architecture. |

---

## Detailed Step-by-Step Narration Script

### Scene 1: The Hook & Introduction (0:00 – 0:45)
*(Camera captures Gurukul AI landing page with the glowing AI Guru theme)*

> **Presenter Narration**:  
> *"Welcome to Gurukul AI — an adaptive AI teacher that transforms static documents and topics into personalized, human-like voice teaching sessions.
> 
> Standard LLM chatbots suffer from a critical flaw: when a student misunderstands a concept, they simply repeat the same paragraph with different synonyms. Gurukul AI breaks this paradigm by introducing a true **pedagogical state machine** grounded in pgvector RAG, powered by Gemini 1.5 Flash and Google Cloud TTS, featuring a real-time amplitude-driven avatar."*

---

### Scene 2: Ingestion & Adaptive Lesson Planning (0:45 – 1:15)
*(Presenter clicks "Configure Session", selects Topic: "Quantum Superposition & Qubits", sets time to "20 Minutes", level to "Beginner", and clicks "Begin Gurukul AI Lesson")*

> **Presenter Narration**:  
> *"Let\'s start a lesson on Quantum Superposition. We can upload a PDF or type any topic.
> Notice how the engine immediately extracts structured concept chunks, generates 768-dimensional embeddings via Gemini `text-embedding-004`, and structures an adaptive lesson plan using forced JSON mode.
> 
> Gurukul branches genuinely whether you select a 5-minute sprint or a 7-day milestone roadmap."*

---

### Scene 3: Grounded Teaching & Amplitude Avatar (1:15 – 2:15)
*(The Teaching Loop screen appears. The Guru avatar starts speaking with natural voice. The mouth moves dynamically in real-time. Synced captions appear below. An interactive Mermaid diagram renders on the right.)*

> **Presenter Narration**:  
> *"Here is our active classroom. Notice three key elements:
> 1. **Zero-API-cost client-side avatar**: Powered by the Web Audio API\'s `AnalyserNode`, measuring RMS amplitude directly from the audio stream so it never crashes mid-demo.
> 2. **Synced Live Captions**: Revealing spoken words with zero delay.
> 3. **Inline Visuals**: Rendering dynamic Mermaid.js flowcharts and KaTeX equations specified by the planner."*

---

### Scene 4: The Core Adaptation Moment (2:15 – 3:30) — ⭐ *The Winning Scene*
*(The checkpoint question asks: "What happens to a quantum superposition state when a measurement occurs?")*  
*(Presenter intentionally enters an incorrect/misconception answer: "The qubit stays in both states simultaneously forever.")*  
*(Clicks Submit. The State Machine Inspector immediately transitions from `questioning` &rarr; `evaluating` &rarr; `reexplaining` with an amber highlight.)*

> **Presenter Narration**:  
> *"Now for the most important moment of Gurukul AI: the **Misconception Repair Loop**.
> 
> I\'m intentionally answering incorrectly: 'The qubit stays in both states simultaneously forever.'
> 
> Watch the **State Machine Inspector** below. Gemini diagnoses the exact cognitive misconception: 'Confusing ongoing superposition with post-measurement wave function collapse'.
> 
> Instead of repeating what it just said, Gurukul activates the `reexplaining` state. It passes the previous explanation into context and commands Gemini to generate a **completely novel analogy** — here comparing wave collapse to a spinning coin settling on heads or tails once stopped!
> 
> It then offers a fresh checkpoint question to verify that the mental gap is bridged."*

*(Presenter enters the correct answer to the new question. State transitions to `adapting`, celebrates with an encouraging feedback prompt, and smoothly advances to the next concept node.)*

---

### Scene 5: Multilingual Switch & Diagnostic Assessment (3:30 – 4:15)
*(Presenter toggles the language switch to 'हिन्दी' (Hindi). The lesson immediately renders in Devanagari Hindi with Neural2 voice. Presenter advances to the assessment screen.)*

> **Presenter Narration**:  
> *"Gurukul also features seamless mid-lesson language switching to Hindi without losing session progress.
> 
> At the end of the lesson, Gurukul automatically synthesizes a 3-question diagnostic quiz based on the covered concepts."*

*(Presenter answers the quiz questions and clicks "Submit Assessment". Confetti triggers, and the mastery score report card renders showing 100% mastery, strong concepts, and recommended next study paths.)*

---

### Scene 6: Personalization Loop & Conclusion (4:15 – 4:45)
*(Presenter returns to the home page, showing the updated Learner Cognitive Profile banner with recorded strong and weak concepts.)*

> **Presenter Narration**:  
> *"Every victory and deficit is saved to the student\'s persistent `learner_profile`. The next time this student starts a session, Gurukul reads their profile and automatically weaves in a quick refresher on past weak areas before introducing new concepts.
> 
> Built on Next.js 14, Supabase pgvector, Google Gemini Flash, and Google Cloud TTS — Gurukul AI brings true adaptive human-like teaching to everyone, everywhere. Thank you!"*
