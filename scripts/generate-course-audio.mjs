#!/usr/bin/env node
/**
 * Generates ElevenLabs audio for the main course and uploads it to the
 * private `audio` bucket that ElevenLabsAudioProvider (src/lib/audio/provider.ts)
 * reads from at request time via signed URL.
 *
 * Scope: all `audio_assets` rows with status = 'pending' (the manifest that
 * import-course-content.mjs creates but never fills in — see its comment
 * "Manifest only. No API call.").
 *
 * This script mirrors scripts/generate-diagnostic-audio.mjs but targets the
 * course table/bucket instead of the public diagnostic funnel.
 *
 * IMPORTANT — approval is intentionally NOT automatic here. This script only
 * sets status = 'generated' + storage_path. A row still needs approved = true
 * before ElevenLabsAudioProvider will ever serve it to a learner (see the
 * "no unreviewed clip reaches a learner" comment in provider.ts). Review the
 * generated clips, then approve with:
 *
 *   update audio_assets set approved = true where status = 'generated';
 *
 * (or approve selectively by id once you've listened to a sample).
 *
 * MVP simplification, matching provider.ts's own note: this script pins ONE
 * voice_id for every row, passed via --voice. If/when you split voices by
 * speaker role (bauleiter/polier/colleague/worker/customer), this script and
 * the `voices` table both need a role_hint -> voice_id lookup — not done here.
 *
 * There is no separate text for `speed = natural` in the schema right now
 * (checked: 0 of 160 natural-speed rows have a non-null phrases.natural_variant).
 * So both speeds synthesize the same phrases.german_text; "natural" only gets
 * more expressive voice_settings (lower stability). Tune SPEED_SETTINGS below
 * if that's not what you want.
 *
 * Usage:
 *   node scripts/generate-course-audio.mjs \
 *     --db "$DATABASE_URL" \
 *     [--supabase-url "$NEXT_PUBLIC_SUPABASE_URL"] \
 *     [--service-role-key "$SUPABASE_SERVICE_ROLE_KEY"] \
 *     --voice "$ELEVENLABS_VOICE_ID" \
 *     [--limit 20]      # generate only the first N pending rows (dry-run-ish, cheap test)
 *     [--force]         # regenerate rows already status='generated' too
 *     [--delay-ms 250]  # pause between API calls, default 250ms
 *
 * Required env (or matching flags above):
 *   DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID
 */

import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

const BUCKET = 'audio';
const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';

const SPEED_SETTINGS = {
  normal: { stability: 0.5, similarity_boost: 0.75 },
  natural: { stability: 0.35, similarity_boost: 0.75 },
  slow: { stability: 0.6, similarity_boost: 0.75 },
};

// ------------------------------------------------------------------- ARGS --

function flag(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const force = process.argv.includes('--force');
const dbUrl = flag('db') ?? process.env.DATABASE_URL;
const supabaseUrl = flag('supabase-url') ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = flag('service-role-key') ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const voiceId = flag('voice') ?? process.env.ELEVENLABS_VOICE_ID;
const apiKey = process.env.ELEVENLABS_API_KEY;
const limit = flag('limit') ? Number(flag('limit')) : null;
const delayMs = flag('delay-ms') ? Number(flag('delay-ms')) : 250;

const missing = Object.entries({
  '--db / DATABASE_URL': dbUrl,
  '--supabase-url / NEXT_PUBLIC_SUPABASE_URL': supabaseUrl,
  '--service-role-key / SUPABASE_SERVICE_ROLE_KEY': serviceRoleKey,
  'ELEVENLABS_API_KEY': apiKey,
  '--voice / ELEVENLABS_VOICE_ID': voiceId,
})
  .filter(([, value]) => !value)
  .map(([name]) => name);

if (missing.length > 0) {
  console.error(`Missing required config: ${missing.join(', ')}`);
  process.exit(1);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ------------------------------------------------------------ ELEVENLABS ---

/** Inline on purpose: plain .mjs can't import the TS client in src/lib. */
async function synthesizeSpeech(text, speed) {
  const settings = SPEED_SETTINGS[speed] ?? SPEED_SETTINGS.normal;
  const response = await fetch(`${ELEVENLABS_API_BASE}/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: settings,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`ElevenLabs TTS failed (${response.status}): ${body || response.statusText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

// -------------------------------------------------------------------- MAIN --

const pgClient = new pg.Client({ connectionString: dbUrl });
await pgClient.connect();
const supabase = createClient(supabaseUrl, serviceRoleKey);

try {
  // Ensure a `voices` row exists for the real ElevenLabs voice we're about to
  // use, and get its id — every generated audio_assets row is stamped with
  // it below. Without this, the DB has no record of which real voice
  // actually produced a given clip (bit us once already: two test voices in
  // a row and audio_assets.voice_id still pointed at manifest placeholders
  // like 'voice_1'/'voice_2').
  const { rows: voiceRows } = await pgClient.query(
    `insert into voices (provider, provider_voice_id, label, is_active, notes)
     values ('elevenlabs', $1, $1, true, 'Set by generate-course-audio.mjs')
     on conflict (provider, provider_voice_id) do update set is_active = true
     returning id`,
    [voiceId],
  );
  const voiceRowId = voiceRows[0].id;

  const statusFilter = force ? `status in ('pending', 'generated')` : `status = 'pending'`;

  const { rows: assets } = await pgClient.query(
    `select aa.id, aa.phrase_id, aa.speed, p.german_text
       from audio_assets aa
       join phrases p on p.id = aa.phrase_id
      where ${statusFilter}
      order by p.stage, p.difficulty, aa.speed
      ${limit ? `limit ${Number(limit)}` : ''}`,
  );

  if (assets.length === 0) {
    console.log('No pending audio_assets rows found. Nothing to generate.');
    process.exit(0);
  }

  console.log(`Generating ${assets.length} clip(s) with voice ${voiceId}…`);

  const results = [];

  for (const asset of assets) {
    const preview = asset.german_text.length > 40 ? `${asset.german_text.slice(0, 40)}…` : asset.german_text;
    try {
      const audio = await synthesizeSpeech(asset.german_text, asset.speed);
      const objectPath = `course/${asset.phrase_id}-${asset.speed}.mp3`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(objectPath, audio, { contentType: 'audio/mpeg', upsert: true });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      await pgClient.query(
        `update audio_assets
            set storage_path = $1,
                provider = 'elevenlabs',
                voice_id = $2,
                status = 'generated',
                generated_at = now()
          where id = $3`,
        [objectPath, voiceRowId, asset.id],
      );

      results.push({ speed: asset.speed, phrase: preview, status: 'generated' });
    } catch (error) {
      results.push({ speed: asset.speed, phrase: preview, status: `FAILED: ${error.message}` });
    }

    await sleep(delayMs);
  }

  console.table(results);
  const failed = results.filter((r) => r.status.startsWith('FAILED')).length;
  console.log(
    `\nDone. ${results.length - failed} generated, ${failed} failed.\n` +
      `Nothing is approved yet — rows are status='generated', approved=false.\n` +
      `Review the clips, then approve, e.g.:\n` +
      `  update audio_assets set approved = true where status = 'generated';\n`,
  );
  if (failed > 0) process.exitCode = 1;
} finally {
  await pgClient.end();
}
