'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { track } from '@/lib/analytics/client';
import {
  computeAnswerState,
  resultTier,
  shouldRevealGerman,
  summarizeDiagnostic,
  type QuestionResult,
} from '@/lib/diagnostic-flow';
import type { DiagnosticQuestion } from '@/lib/content/diagnostic';
import type { LandingCopy } from '@/lib/landing-copy';
import { markTestCompleted } from '@/components/landing/StickyCta';

/**
 * The full 7-question diagnostic. Same reveal guarantee as MovaMoment: the
 * German sentence is only read into JSX behind `shouldRevealGerman`.
 */
export function DiagnosticFlow({
  questions,
  copy,
  checkoutHref,
}: {
  questions: DiagnosticQuestion[];
  copy: LandingCopy;
  checkoutHref: string;
}) {
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    track('full_test_started', { questions: questions.length }, { once: true });
  }, [questions.length]);

  useEffect(() => {
    if (!finished) return;
    const summary = summarizeDiagnostic(results);
    track('test_completed', { score: summary.correctCount, total: summary.total });
    track('test_result_viewed', { score: summary.correctCount, total: summary.total });
    markTestCompleted();
  }, [finished, results]);

  const question = questions[index];
  if (!question) return null;

  const total = questions.length;
  const state = computeAnswerState(chosen);
  const revealed = shouldRevealGerman(state);
  const chosenOption = question.options.find((o) => o.id === chosen) ?? null;

  function answer(optionId: string) {
    if (revealed) return;
    const option = question!.options.find((o) => o.id === optionId);
    if (!option) return;

    setChosen(optionId);
    setResults((r) => [
      ...r,
      { position: question!.position, skillLabel: question!.skillLabel, correct: option.isCorrect },
    ]);
    track('test_question_answered', {
      position: question!.position,
      correct: option.isCorrect,
      skill: question!.skillLabel,
    });
  }

  function next() {
    if (index + 1 >= total) {
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    setChosen(null);
  }

  if (finished) {
    return <DiagnosticResult results={results} copy={copy} checkoutHref={checkoutHref} />;
  }

  return (
    <div className="flex min-h-[86vh] flex-col pt-6">
      <div className="flex items-baseline justify-between">
        <span className="eyebrow">
          Команда {index + 1} из {total}
        </span>
        <Link href="/" className="px-2 py-2 text-sm text-slate underline">
          Выйти
        </Link>
      </div>

      <div className="mt-2 flex gap-1" aria-hidden>
        {questions.map((item, i) => (
          <span
            key={item.id}
            className={['h-1.5 flex-1 rounded-full', i <= index ? 'bg-gold' : 'bg-cream-deep'].join(
              ' ',
            )}
          />
        ))}
      </div>

      <p className="mt-6 text-center text-lg font-bold">Что сказал прораб?</p>

      <div className="mt-6 flex flex-col items-center">
        {question.audioUrl ? (
          <AudioQuestion src={question.audioUrl} onPlay={() => track('test_question_audio_play', { position: question!.position })} />
        ) : (
          <button
            type="button"
            onClick={() => track('test_question_audio_play', { position: question.position, mock: true })}
            aria-label="Слушать команду"
            className="listen-btn h-[120px] w-[120px] text-4xl"
          >
            ▶
          </button>
        )}
      </div>

      {/* GERMAN TEXT LIVES ONLY INSIDE THIS BLOCK — never rendered before an answer. */}
      {revealed ? (
        <p className="de-phrase mt-6 text-center">{question.germanText}</p>
      ) : (
        <p className="mt-6 text-center text-sm text-slate">
          Озвучка появится вместе с полным курсом — пока слушай тишину и решай по контексту вариантов.
        </p>
      )}

      <div className="mt-8 space-y-2">
        {question.options.map((option) => {
          const isChosen = chosen === option.id;
          const reveal = revealed && option.isCorrect;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => answer(option.id)}
              disabled={revealed}
              className={[
                'answer-opt',
                reveal ? 'answer-opt-correct' : isChosen ? 'answer-opt-wrong' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span aria-hidden className="answer-mark">
                {reveal ? '✓' : isChosen ? '✕' : ''}
              </span>
              <span>{option.text}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto space-y-3 pt-8">
        {revealed ? (
          <>
            <p className="text-center text-lg font-bold">
              {chosenOption?.isCorrect ? 'Верно' : 'Не то'}
            </p>
            <button
              type="button"
              onClick={next}
              className="btn btn-gold btn-lg btn-block"
            >
              {index + 1 >= total ? 'Показать результат' : 'Дальше'}
            </button>
          </>
        ) : (
          <p className="text-center text-slate">Выбери, что от тебя хотят</p>
        )}
      </div>
    </div>
  );
}

function AudioQuestion({ src, onPlay }: { src: string; onPlay: () => void }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Reset the icon whenever the question changes (new `src`), so a leftover
  // "■" from the previous question doesn't linger after next() swaps audio
  // out from under a still-mounted-looking button.
  useEffect(() => {
    setPlaying(false);
  }, [src]);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      audio.currentTime = 0;
      setPlaying(false);
      return;
    }

    onPlay();
    audio
      .play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false)); // e.g. browser blocked autoplay-like call
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={playing ? 'Остановить' : 'Слушать команду'}
      className="listen-btn h-[120px] w-[120px] text-4xl"
    >
      {playing ? '■' : '▶'}
      <audio ref={audioRef} src={src} preload="none" onEnded={() => setPlaying(false)} />
    </button>
  );
}

/** Mirror, not verdict. No invented "AI analysis" — pure counting from diagnostic-flow.ts. */
function DiagnosticResult({
  results,
  copy,
  checkoutHref,
}: {
  results: QuestionResult[];
  copy: LandingCopy;
  checkoutHref: string;
}) {
  const summary = summarizeDiagnostic(results);
  const tier = resultTier(summary.share);

  const reading =
    tier === 'high'
      ? 'Ты хорошо ловишь короткие команды. Дальше сложнее: быстрая речь, размеры и команды из двух шагов.'
      : tier === 'mid'
        ? 'Простое понимаешь, но часть указаний проходит мимо. Это как раз то место, где на объекте появляются переделки.'
        : 'Пока целые указания ускользают. Живая речь на стройке звучит не так, как в учебнике, и тренируется отдельно.';

  return (
    <div className="flex min-h-[86vh] flex-col pt-10">
      <p className="eyebrow">Результат</p>
      <p className="mt-4 text-[3rem] font-extrabold leading-none tabular-nums">
        {summary.correctCount} из {summary.total}
      </p>
      <p className="mt-2 text-xl font-bold">команд ты понял верно</p>
      <p className="mt-6 text-lg leading-snug text-slate">{reading}</p>

      {summary.strongSkills.length > 0 ? (
        <div className="mt-8">
          <p className="eyebrow">Что уже получается</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {summary.strongSkills.map((skill) => (
              <li
                key={skill}
                className="rounded-full border-2 border-good bg-good/10 px-4 py-2 text-sm font-bold"
              >
                {skill}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {summary.missedSkills.length > 0 ? (
        <div className="mt-6">
          <p className="eyebrow">Что стоит подтянуть</p>
          <ul className="mt-3 space-y-2">
            {summary.missedSkills.map((skill) => (
              <li key={skill} className="card px-4 py-3 text-lg font-bold">
                {skill}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-8 card p-6">
        <p className="font-bold">Именно это тренирует MOVA</p>
        <p className="mt-2 leading-snug text-slate">
          Слушаешь настоящую команду, выбираешь значение, сразу видишь, верно ли понял. То, в чём
          ошибся, возвращается снова, пока не станет привычным.
        </p>
      </div>

      <div className="mt-auto space-y-3 pt-8">
        <Link
          href={checkoutHref}
          onClick={() =>
            track('purchase_clicked', { placement: 'test_result', score: summary.correctCount })
          }
          className="btn btn-gold btn-lg btn-block"
        >
          {copy.offerCta === copy.offerCta ? 'Получить полный доступ' : copy.offerCta}
        </Link>
        <Link
          href="#dostup"
          className="flex min-h-[60px] w-full items-center justify-center rounded-[18px] border border-[var(--line-light)] bg-paper px-5 text-lg font-bold"
        >
          Посмотреть, что внутри
        </Link>
      </div>
    </div>
  );
}
