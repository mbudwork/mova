'use client';

import { useState } from 'react';
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
  const state = computeAnswerState(chosen);
  const revealed = shouldRevealGerman(state);

  function choose(text: string) {
    if (revealed) return;
    setChosen(text);
    const correct = OPTIONS_RU.find((o) => o.text === text)?.correct ?? false;
    track('mini_test_answer', { correct, variant });
  }

  return (
    <div className="rounded-[14px] bg-paper p-5">
      <p className="eyebrow">{copy.momentTitle}</p>
      <p className="mt-2 text-slate">{copy.momentPrompt}</p>

      <div className="mt-5 flex justify-center">
        <button
          type="button"
          onClick={() => {
            track('mini_test_audio_play', { variant });
            if (variant === 'hero') track('hero_demo_play', {});
          }}
          aria-label={copy.momentPlay}
          className="flex h-[104px] w-[104px] items-center justify-center rounded-full bg-signal text-4xl text-ink shadow-[0_5px_0_var(--color-signal-deep)] active:translate-y-[2px]"
        >
          ▶
        </button>
      </div>

      {/* GERMAN TEXT LIVES ONLY INSIDE THIS BLOCK. Do not hoist it above. */}
      {revealed ? (
        <p className="de-phrase mt-5 text-center">{GERMAN}</p>
      ) : (
        <p className="mt-5 text-center text-sm text-slate">{copy.momentFootnote}</p>
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
                'flex min-h-[60px] w-full items-center gap-3 rounded-[14px] border-2 px-4 py-3 text-left text-lg leading-snug',
                reveal
                  ? 'border-gruen bg-gruen/10 font-bold'
                  : isChosen
                    ? 'border-rot bg-rot/10'
                    : 'border-concrete-deep bg-concrete',
              ].join(' ')}
            >
              <span aria-hidden className="w-5 shrink-0 text-xl">
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
            className="mt-4 flex min-h-[60px] w-full items-center justify-center rounded-[14px] bg-signal px-5 text-lg font-bold text-ink"
          >
            {copy.momentCta}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
