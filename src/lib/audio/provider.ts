/**
 * Audio provider abstraction.
 *
 * PHASE 2 ships the UI contract only. The mock does NOT play silence: a silent
 * MP3 makes the listening UX impossible to evaluate, so the mock reports that
 * no audio exists and the player renders an honest "аудио скоро" state.
 *
 * This is the PHASE 8 swap: ElevenLabsAudioProvider reads a pre-generated,
 * reviewed clip from `audio_assets` and hands back a short-lived signed URL.
 * It never calls the ElevenLabs API at request time — see the class comment
 * below for why that matters, not just for cost.
 */

import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { audioMode } from '@/lib/config/env';

export type AudioSpeed = 'slow' | 'normal' | 'natural';

export type AudioTrack = {
  url: string;
  durationMs: number | null;
  speed: AudioSpeed;
};

export interface AudioProvider {
  readonly name: 'mock' | 'elevenlabs';
  /** Returns null when no approved audio exists for this phrase yet. */
  getTrack(phraseId: string, speed?: AudioSpeed): Promise<AudioTrack | null>;
}

class MockAudioProvider implements AudioProvider {
  readonly name = 'mock' as const;

  async getTrack(): Promise<AudioTrack | null> {
    return null;
  }
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
      .createSignedUrl(asset.storage_path, 60 * 10);

    if (signError || !signed) return null;

    return { url: signed.signedUrl, durationMs: asset.duration_ms, speed };
  }
}

export function createAudioProvider(): AudioProvider {
  return audioMode === 'elevenlabs' ? new ElevenLabsAudioProvider() : new MockAudioProvider();
}
