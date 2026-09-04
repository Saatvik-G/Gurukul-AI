import { Language } from "./types";

const ttsApiKey = process.env.GOOGLE_CLOUD_TTS_KEY || process.env.GEMINI_API_KEY || "";

// In-memory audio cache for zero redundant API calls during repeats
const audioCache = new Map<string, string>();

export interface TTSResult {
  audioBase64: string | null;
  mimeType: string;
  source: "gcloud" | "fallback";
}

export async function synthesizeSpeech(
  text: string,
  language: Language = "en"
): Promise<TTSResult> {
  const cacheKey = `${language}:${text.trim()}`;
  if (audioCache.has(cacheKey)) {
    return {
      audioBase64: audioCache.get(cacheKey)!,
      mimeType: "audio/mp3",
      source: "gcloud",
    };
  }

  if (!ttsApiKey) {
    return {
      audioBase64: null,
      mimeType: "audio/mp3",
      source: "fallback",
    };
  }

  try {
    const isHi = language === "hi";
    const languageCode = isHi ? "hi-IN" : "en-US";
    const voiceName = isHi ? "hi-IN-Neural2-A" : "en-US-Neural2-F";

    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${ttsApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: { text: text.slice(0, 1500) },
          voice: {
            languageCode,
            name: voiceName,
            ssmlGender: "FEMALE",
          },
          audioConfig: {
            audioEncoding: "MP3",
            speakingRate: 1.02,
            pitch: 0.0,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.warn("Google Cloud TTS API error:", response.status, errText);
      return {
        audioBase64: null,
        mimeType: "audio/mp3",
        source: "fallback",
      };
    }

    const data = await response.json();
    if (data.audioContent) {
      audioCache.set(cacheKey, data.audioContent);
      return {
        audioBase64: data.audioContent,
        mimeType: "audio/mp3",
        source: "gcloud",
      };
    }

    return {
      audioBase64: null,
      mimeType: "audio/mp3",
      source: "fallback",
    };
  } catch (error) {
    console.error("synthesizeSpeech exception:", error);
    return {
      audioBase64: null,
      mimeType: "audio/mp3",
      source: "fallback",
    };
  }
}
