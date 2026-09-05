import 'server-only';

/**
 * Thin wrapper around the ElevenLabs Text-to-Speech REST API.
 *
 * No SDK — one endpoint, one response shape (raw MP3 bytes), not worth the
 * dependency. This is a real network call and fails like one: quota, invalid
 * voice, bad text — callers see an ElevenLabsError, never silent empty audio.
 *
 * This client is used by the offline generation path only (admin batch job /
 * scripts). Nothing in the request-time render path calls this — see the
 * comment on ElevenLabsAudioProvider in ./provider.ts for why.
 */

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';

export type TtsRequest = {
  text: string;
  voiceId: string;
  apiKey: string;
  /** eleven_multilingual_v2 is the model that actually handles German well. */
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
};

export class ElevenLabsError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ElevenLabsError';
    this.status = status;
  }
}

/**
 * Synthesizes speech and returns raw MP3 bytes.
 * Throws ElevenLabsError on any non-2xx response.
 */
export async function synthesizeSpeech({
  text,
  voiceId,
  apiKey,
  modelId = 'eleven_multilingual_v2',
  stability = 0.5,
  similarityBoost = 0.75,
}: TtsRequest): Promise<Buffer> {
  const response = await fetch(`${ELEVENLABS_API_BASE}/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: { stability, similarity_boost: similarityBoost },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new ElevenLabsError(
      `ElevenLabs TTS failed (${response.status}): ${body || response.statusText}`,
      response.status,
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
