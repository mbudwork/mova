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
  /**
   * Ссылки сразу на пачку фраз — два запроса на весь урок вместо двух на
   * каждую фразу. Возвращает Map: у фразы без одобренной записи ключа нет.
   */
  getTracks(phraseIds: string[], speed?: AudioSpeed): Promise<Map<string, AudioTrack>>;
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

  /**
   * Пакетная выдача.
   *
   * Раньше страница урока вызывала getTrack на каждую фразу, и каждый вызов
   * делал два сетевых запроса: выборку из audio_assets и подпись ссылки. На
   * уроке из четырнадцати фраз это 28 обращений к Supabase — они шли
   * параллельно, но всё равно упирались в лимит соединений и в задержку сети.
   * Отсюда пауза после кнопки «Закончить урок»: следующий урок не рендерился,
   * пока не отработает вся эта пачка.
   *
   * Здесь один запрос за всеми записями и один createSignedUrls на все пути
   * сразу. Два обращения на урок независимо от числа фраз.
   */
  async getTracks(
    phraseIds: string[],
    speed: AudioSpeed = 'normal',
  ): Promise<Map<string, AudioTrack>> {
    const result = new Map<string, AudioTrack>();
    if (phraseIds.length === 0) return result;

    const supabase = createSupabaseAdminClient();

    const { data: assets, error } = await supabase
      .from('audio_assets')
      .select('phrase_id, storage_path, duration_ms, generated_at')
      .in('phrase_id', phraseIds)
      .eq('speed', speed)
      .eq('approved', true)
      .order('generated_at', { ascending: false });

    if (error || !assets) return result;

    /*
      Одна фраза может иметь несколько одобренных записей — например, после
      перегенерации. Берём самую свежую: выборка уже отсортирована по убыванию
      даты, поэтому первая встреченная и есть нужная.
    */
    const newest = new Map<string, { path: string; durationMs: number | null }>();
    for (const asset of assets) {
      // phrase_id в схеме nullable: строка манифеста может существовать до
      // того, как известно, к какой фразе она относится. Такая запись — не
      // трек, и связать её не с чем.
      const phraseId = asset.phrase_id;
      if (!phraseId || !asset.storage_path || newest.has(phraseId)) continue;
      newest.set(phraseId, {
        path: asset.storage_path,
        durationMs: asset.duration_ms,
      });
    }

    if (newest.size === 0) return result;

    const paths = [...newest.values()].map((v) => v.path);
    const { data: signed, error: signError } = await supabase.storage
      .from('audio')
      .createSignedUrls(paths, 60 * 60);

    if (signError || !signed) return result;

    const urlByPath = new Map(
      signed.filter((s) => s.signedUrl && s.path).map((s) => [s.path as string, s.signedUrl]),
    );

    for (const [phraseId, meta] of newest) {
      const url = urlByPath.get(meta.path);
      if (!url) continue;
      result.set(phraseId, { url, durationMs: meta.durationMs, speed });
    }

    return result;
  }

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
