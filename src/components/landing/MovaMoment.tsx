'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { track } from '@/lib/analytics/client';
import { computeAnswerState, shouldRevealGerman } from '@/lib/diagnostic-flow';
import type { LandingCopy } from '@/lib/landing-copy';

/**
 * The MOVA moment: the one interaction the whole landing is organized around.
 *
 * Structural guarantee, not a styling choice: `germanText` is only read into
 * JSX inside the block gated by `shouldRevealGerman(state)`. There is no path
 * where the German sentence sits in the DOM before an option is chosen — the
 * audit's core finding (V1 leaked it up front) cannot silently regress here,
 * because reveal is a pure function call, not a `chosen !== null` inline
 * check scattered through markup.
 *
 * The same component renders the hero moment and the "how it works" showcase
 * demo — one interaction, reused, rather than two near-duplicates that could
 * drift apart.
 */

const GERMAN = 'Mach erst diese Wand fertig.';
const CORRECT_TEXT_RU = 'Сначала закончи эту стену.';
// Public file for this exact fixed demo phrase (same sentence as diagnostic
// question #6) — safe to hardcode a public URL here since this widget is
// shown to anonymous, logged-out visitors and always plays the same line.
// Uses the public `diagnostic-audio` bucket, not the private course `audio`
// bucket (which requires a signed URL + an authenticated learner).
const DEMO_AUDIO_URL =
  'https://vcayatyamthyzeycfshc.supabase.co/storage/v1/object/public/diagnostic-audio/diagnostic/06-P0112.mp3';
const OPTIONS_RU = [
  { text: 'Сначала закончи эту стену.', correct: true },
  { text: 'Эту стену не трогай.', correct: false },
  { text: 'Стена готова, иди дальше.', correct: false },
];

export function MovaMoment({
  copy,
  testHref,
  variant = 'hero',
}: {
  copy: LandingCopy;
  testHref: string;
  variant?: 'hero' | 'showcase';
}) {
  const [chosen, setChosen] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const state = computeAnswerState(chosen);
  const revealed = shouldRevealGerman(state);

  function choose(text: string) {
    if (revealed) return;
    setChosen(text);
    const correct = OPTIONS_RU.find((o) => o.text === text)?.correct ?? false;
    track('mini_test_answer', { correct, variant });
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      audio.currentTime = 0;
      setPlaying(false);
      return;
    }

    track('mini_test_audio_play', { variant });
    if (variant === 'hero') track('hero_demo_play', {});
    audio
      .play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false));
  }

  return (
    /*
      В герое карточка тёмная — она лежит на графите и должна читаться как
      экран телефона из макета. В разделе «как это работает» фон кремовый,
      там карточка светлая. Варианты ответа подстраиваются сами.
    */
    <div className={variant === 'hero' ? 'card-dark p-6' : 'card p-6'}>
      <p className="eyebrow">{copy.momentTitle}</p>
      <p className={variant === 'hero' ? 'mt-2 text-mist' : 'mt-2 text-slate'}>
        {copy.momentPrompt}
      </p>

      <div className="mt-5 flex justify-center">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? 'Остановить' : copy.momentPlay}
          className="listen-btn h-[104px] w-[104px] text-4xl"
        >
          {playing ? '■' : '▶'}
          <audio ref={audioRef} src={DEMO_AUDIO_URL} preload="none" onEnded={() => setPlaying(false)} />
        </button>
      </div>

      {/* GERMAN TEXT LIVES ONLY INSIDE THIS BLOCK. Do not hoist it above. */}
      {revealed ? (
        <p className="de-phrase mt-5 text-center">{GERMAN}</p>
      ) : (
        <p
          className={
            variant === 'hero'
              ? 'mt-5 text-center text-sm text-mist'
              : 'mt-5 text-center text-sm text-slate'
          }
        >
          {copy.momentFootnote}
        </p>
      )}

      <div className="mt-5 space-y-2">
        {OPTIONS_RU.map((option) => {
          const isChosen = chosen === option.text;
          const reveal = revealed && option.correct;
          return (
            <button
              key={option.text}
              type="button"
              onClick={() => choose(option.text)}
              disabled={revealed}
              className={[
                'answer-opt',
                reveal ? 'answer-opt-correct' : isChosen ? 'answer-opt-wrong' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span aria-hidden className="answer-mark">
                {reveal ? '✓' : isChosen ? '✕' : '›'}
              </span>
              <span>{option.text}</span>
            </button>
          );
        })}
      </div>

      {revealed ? (
        <div className="mt-5">
          <p className="text-lg font-bold">
            {chosen === CORRECT_TEXT_RU ? copy.momentCorrect : copy.momentIncorrect}
          </p>
          <Link
            href={testHref}
            onClick={() => track('hero_test_click', { placement: 'moment' })}
            className="btn btn-gold btn-block mt-4"
          >
            {copy.momentCta}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
