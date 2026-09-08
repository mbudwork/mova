/**
 * Audio provider.
 *
 * Reads a pre-generated, reviewed clip from `audio_assets` and hands back a
 * short-lived signed URL. It never calls the ElevenLabs API at request time —
 * see the class comment below for why that matters, not just for cost.
 *
 * A phrase with no approved asset returns null and the player renders the
 * honest "ещё не записано" state. It never plays silence: a silent MP3 makes
 * the listening UX impossible to evaluate.
 */

import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export type AudioSpeed = 'slow' | 'normal' | 'natural';

export type AudioTrack = {
  url: string;
  durationMs: number | null;
  speed: AudioSpeed;
};

export interface AudioProvider {
  readonly name: 'elevenlabs';
  /** Returns null when no approved audio exists for this phrase yet. */
  getTrack(phraseId: string, speed?: AudioSpeed): Promise<AudioTrack | null>;
}

/**
 * Serves course audio from `audio_assets`, never from a live TTS call.
 *
 * Generation happens once, offline (an admin job for the full course; for
 * the public diagnostic funnel, scripts/generate-diagnostic-audio.mjs is the
 * standalone equivalent, since diagnostic clips live in a separate public
 * bucket outside the entitlement model entirely). Calling ElevenLabs on every
 * playback would both blow the TTS budget and let an unreviewed clip reach a
 * learner before anyone approved it — see docs/ARCHITECTURE.md §8, risk 3.
 *
 * Picks the most recently generated *approved* asset for (phrase, speed).
 * MVP simplification: it does not yet pin a specific voice_id — once more
 * than one voice is in rotation, add a preferred-voice lookup here.
 */
class ElevenLabsAudioProvider implements AudioProvider {
  readonly name = 'elevenlabs' as const;

  async getTrack(phraseId: string, speed: AudioSpeed = 'normal'): Promise<AudioTrack | null> {
    const supabase = createSupabaseAdminClient();

    const { data: asset, error } = await supabase
      .from('audio_assets')
      .select('storage_path, duration_ms')
      .eq('phrase_id', phraseId)
      .eq('speed', speed)
      .eq('approved', true)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // storage_path is nullable in the schema: a row can exist as a manifest
    // entry before any file is generated. Such a row is not a playable track,
    // so it is treated exactly like a missing one.
    if (error || !asset?.storage_path) return null;

    // Short-lived on purpose: this is minted fresh per request, after the
    // caller has already re-checked entitlement + phrase visibility (see
    // the note in src/lib/supabase/admin.ts). It is not meant to be cached
    // or shared beyond a single playback.
    const { data: signed, error: signError } = await supabase.storage
      .from('audio')
      // An hour, not ten minutes: the URL is minted when the lesson page
      // renders, and a learner who pauses mid-lesson must not come back to a
      // dead link. Still short-lived — it is not meant to be cached or shared.
      .createSignedUrl(asset.storage_path, 60 * 60);

    if (signError || !signed) return null;

    return { url: signed.signedUrl, durationMs: asset.duration_ms, speed };
  }
}

/**
 * Serving audio does NOT depend on ELEVENLABS_API_KEY.
 *
 * This used to read `audioMode === 'elevenlabs' ? real : mock`, which conflated
 * two unrelated things: the key is needed to GENERATE clips (an offline script,
 * run once), while playback only reads finished files out of Supabase storage.
 * The result was that 564 generated, approved, uploaded clips were invisible to
 * every learner because a key the request path never calls was absent from the
 * deployment — every lesson claimed "аудио ещё не записано" while the audio sat
 * in the bucket.
 *
 * The storage-backed provider already returns null for a phrase with no
 * approved asset, so a course with no audio still degrades to the same honest
 * empty state. There is nothing left for the key to gate here.
 */
export function createAudioProvider(): AudioProvider {
  return new ElevenLabsAudioProvider();
}
