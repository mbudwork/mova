#!/usr/bin/env node
/**
 * Generates ElevenLabs audio for the public diagnostic test and uploads it
 * to the `diagnostic-audio` public bucket (see the matching migration
 * 20260905000100_diagnostic_audio_bucket.sql).
 *
 * Scope is deliberately small: this is the ~7 active `diagnostic_questions`
 * rows behind the landing-page test, not the 564-task production course.
 * The course's own generation path is the ElevenLabsAudioProvider in
 * src/lib/audio/provider.ts, run through an admin job — separate on purpose,
 * because diagnostic clips live outside the entitlement / private-bucket
 * model entirely (anonymous visitors have no entitlement to check).
 *
 * Idempotent: rows already `audio_status = 'ready'` are skipped unless
 * --force is passed. Safe to re-run after adding a question or fixing text.
 *
 *   node scripts/generate-diagnostic-audio.mjs \
 *     --db "$DATABASE_URL" \
 *     [--supabase-url "$NEXT_PUBLIC_SUPABASE_URL"] \
 *     [--service-role-key "$SUPABASE_SERVICE_ROLE_KEY"] \
 *     [--voice "$ELEVENLABS_VOICE_ID"] \
 *     [--force]
 *
 * Required env (or matching flags above):
 *   DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID
 */

import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

const BUCKET = 'diagnostic-audio';
const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';

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

// ------------------------------------------------------------ ELEVENLABS ---

/** Inline on purpose: plain .mjs can't import the TS client in src/lib. */
async function synthesizeSpeech(text) {
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
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
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
  const { rows: questions } = await pgClient.query(
    `select id, position, source_phrase, german_text, audio_status
       from diagnostic_questions
      where is_active = true
      order by position`,
  );

  if (questions.length === 0) {
    console.log('No active diagnostic questions found. Run seed-diagnostic.mjs first.');
    process.exit(0);
  }

  const results = [];

  for (const question of questions) {
    if (question.audio_status === 'ready' && !force) {
      results.push({ position: question.position, phrase: question.source_phrase, status: 'skipped (already ready)' });
      continue;
    }

    console.log(`Generating audio for #${question.position} (${question.source_phrase})…`);

    const audio = await synthesizeSpeech(question.german_text);
    const objectPath = `diagnostic/${String(question.position).padStart(2, '0')}-${question.source_phrase}.mp3`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(objectPath, audio, { contentType: 'audio/mpeg', upsert: true });

    if (uploadError) {
      throw new Error(`Upload failed for ${question.source_phrase}: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);

    await pgClient.query(
      `update diagnostic_questions set audio_path = $1, audio_status = 'ready' where id = $2`,
      [publicUrlData.publicUrl, question.id],
    );

    results.push({ position: question.position, phrase: question.source_phrase, status: 'generated' });
  }

  console.table(results);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await pgClient.end();
}
