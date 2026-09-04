import { put } from "@vercel/blob";

const blobToken = process.env.BLOB_READ_WRITE_TOKEN || "";
const memoryAudioStore = new Map<string, string>();

/**
 * Stores generated audio (base64 string or binary) to Vercel Blob or in-memory fallback.
 */
export async function cacheAudioBlob(
  key: string,
  base64Mp3: string
): Promise<string> {
  const sanitizedKey = `tts/${key.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60)}.mp3`;

  if (blobToken) {
    try {
      const buffer = Buffer.from(base64Mp3, "base64");
      const blob = await put(sanitizedKey, buffer, {
        access: "public",
        contentType: "audio/mp3",
        token: blobToken,
        addRandomSuffix: false,
      });
      return blob.url;
    } catch (err) {
      console.warn("Vercel Blob cache put warning, using in-memory store:", err);
    }
  }

  memoryAudioStore.set(key, base64Mp3);
  return "";
}

/**
 * Retrieves cached audio if previously stored.
 */
export function getCachedAudioBase64(key: string): string | null {
  return memoryAudioStore.get(key) || null;
}
