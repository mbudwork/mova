'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { PlayButton } from '@/components/PlayButton';
import { computeExerciseState, shouldRevealGerman } from '@/lib/exercise';
import { submitAnswer } from '@/lib/content/actions';
import type { ExercisePhrase } from '@/lib/content/course';

export type ExerciseMode = 'lesson' | 'review';

type Props = {
  phrases: ExercisePhrase[];
  mode: ExerciseMode;
  /** Required for mode='lesson'; drives completeLesson() at the end. */
  onFinish: () => void;
};

/**
 * The real scored exercise: AUDIO → meaning options → answer → feedback →
 * reveal German + translation → next.
 *
 * The German sentence is only read into JSX behind `shouldRevealGerman`,
 * exactly like the marketing diagnostic — this is the same non-negotiable
 * gate, now protecting the paid course as well, where the old MODE-1 lesson
 * showed German + translation together with no answer step at all.
 *
 * Every answer calls submitAnswer() immediately — progress is recorded per
 * question, not batched at lesson completion.
 */
export function ScoredExercise({ phrases, mode, onFinish }: Props) {
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  const phrase = phrases[index];
  if (!phrase) return null;

  const total = phrases.length;
  const isLast = index === total - 1;
  const state = computeExerciseState(chosen);
  const revealed = shouldRevealGerman(state);
  const chosenOption = phrase.options.find((o) => o.id === chosen) ?? null;

  function answer(optionId: string) {
    if (revealed || pending) return;
    const option = phrase!.options.find((o) => o.id === optionId);
    if (!option) return;

    setChosen(optionId);
    startTransition(async () => {
      const result = await submitAnswer(phrase!.id, option.isCorrect);
      if ('error' in result) setFailed(true);
    });
  }

  function next() {
    setFailed(false);
    if (index + 1 >= total) {
      onFinish();
      return;
    }
    setIndex((i) => i + 1);
    setChosen(null);
  }

  return (
    <div className="flex min-h-[76vh] flex-col">
      <p className="eyebrow">
        {mode === 'review' ? 'Повторение' : 'Фраза'} {index + 1} из {total}
      </p>

      <div className="mt-2 flex gap-1" aria-hidden>
        {phrases.map((p, i) => (
          <span
            key={p.id}
            className={['h-1.5 flex-1 rounded-full', i <= index ? 'bg-gold' : 'bg-cream-deep'].join(
              ' ',
            )}
          />
        ))}
      </div>

      <p className="mt-6 text-center text-lg font-bold">Что сказал прораб?</p>

      {/*
        With audio, this is a listening exercise and the German stays hidden
        until the learner has answered — the same gate the marketing diagnostic
        uses. Without audio it degrades honestly to reading: the sentence is
        shown up front, under a visible notice, and never pretends to be sound.

        The degraded branch is per phrase, not per lesson: one missing clip
        must not turn the whole lesson into reading.
      */}
      <div className="mt-6 flex justify-center">
        <PlayButton src={phrase.audioUrl} />
      </div>

      {phrase.audioUrl ? (
        revealed ? (
          <p className="de-phrase mt-6 text-center">{phrase.germanText}</p>
        ) : null
      ) : (
        <>
          <div className="mt-4 rounded-[10px] bg-cream-deep/60 px-3 py-2 text-center text-xs text-slate">
            Аудио для этой фразы ещё не записано — сейчас это упражнение на чтение, не на слух
          </div>
          <p className="de-phrase mt-6 text-center">{phrase.germanText}</p>
        </>
      )}

      <div className="mt-8 space-y-2">
        {phrase.options.map((option) => {
          const isChosen = chosen === option.id;
          const reveal = revealed && option.isCorrect;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => answer(option.id)}
              disabled={revealed || pending}
              className={[
                'flex min-h-[64px] w-full items-center gap-3 rounded-[18px] border-2 px-4 py-3 text-left text-lg leading-snug',
                reveal
                  ? 'border-good bg-good/10 font-bold'
                  : isChosen
                    ? 'border-bad bg-bad/10'
                    : 'border-cream-deep bg-paper',
              ].join(' ')}
            >
              <span aria-hidden className="w-5 shrink-0 text-xl">
                {reveal ? '✓' : isChosen ? '✕' : ''}
              </span>
              <span>{option.text}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto space-y-3 pt-8">
        {failed ? (
          <p role="alert" className="notice notice-bad">
            Ответ не сохранился. Проверь интернет и попробуй ещё раз.
          </p>
        ) : null}

        {revealed ? (
          <>
            <p className="text-center text-lg font-bold">
              {chosenOption?.isCorrect ? 'Верно' : 'Не то'}
            </p>
            <Button size="lg" onClick={next} disabled={pending}>
              {isLast ? (mode === 'review' ? 'Закончить повторение' : 'Закончить урок') : 'Дальше'}
            </Button>
          </>
        ) : (
          <p className="text-center text-slate">
            {pending ? 'Сохраняю…' : 'Выбери, что от тебя хотят'}
          </p>
        )}

        <p className="text-center">
          <Link href="/app" className="inline-block px-4 py-4 text-slate underline">
            Выйти
          </Link>
        </p>
      </div>
    </div>
  );
}
