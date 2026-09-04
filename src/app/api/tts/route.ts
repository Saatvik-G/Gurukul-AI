import { NextRequest, NextResponse } from "next/server";
import { synthesizeSpeech } from "@/lib/tts";
import { Language } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, language = "en" } = body;

    if (!text) {
      return NextResponse.json({ error: "Text is required for TTS synthesis" }, { status: 400 });
    }

    const result = await synthesizeSpeech(text, language as Language);

    return NextResponse.json({
      success: true,
      audioBase64: result.audioBase64,
      mimeType: result.mimeType,
      source: result.source, // "gcloud" or "fallback" (client Web Speech API)
    });
  } catch (error: any) {
    console.error("API /tts error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to synthesize speech" },
      { status: 500 }
    );
  }
}
