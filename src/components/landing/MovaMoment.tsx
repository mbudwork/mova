'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { track } from '@/lib/analytics/client';
import { computeAnswerState, shouldRevealGerman } from '@/lib/diagnostic-flow';
import type { LandingCopy } from '@/lib/landing-copy';
import type { DemoPhrase } from '@/lib/content/public-demo';

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

/*
  Фраза приходит сверху и каждую загрузку своя — раньше здесь были зашитые
  константы, и посетитель, заглянувший второй раз, видел ровно ту же команду.
  Демо выглядело записанным роликом, а не срезом живого курса.
*/
export function MovaMoment({
  copy,
  testHref,
  demo,
  variant = 'hero',
}: {
  copy: LandingCopy;
  testHref: string;
  demo: DemoPhrase;
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
    const correct = text === demo.correct;
    track('mini_test_answer', { correct, variant });
  }

  /*
    Состояние берётся из событий плеера, а не из результата play(). На телефоне
    промис мог разрешиться раньше реального старта или отклониться беззвучно, и
    иконка застревала на «▶», хотя звук шёл (или наоборот). Медиаэлемент знает
    своё состояние точно.
  */
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const onPlay = () => setPlaying(true);
    const onStop = () => setPlaying(false);

    el.addEventListener('play', onPlay);
    el.addEventListener('playing', onPlay);
    el.addEventListener('pause', onStop);
    el.addEventListener('ended', onStop);
    el.addEventListener('error', onStop);

    return () => {
      el.removeEventListener('play', onPlay);
      el.removeEventListener('playing', onPlay);
      el.removeEventListener('pause', onStop);
      el.removeEventListener('ended', onStop);
      el.removeEventListener('error', onStop);
    };
  }, [demo.audioUrl]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audio.paused) {
      audio.pause();
      audio.currentTime = 0;
      return;
    }

    track('mini_test_audio_play', { variant });
    if (variant === 'hero') track('hero_demo_play', {});

    // Синхронный вызов внутри обработчика клика — обязательное условие iOS.
    const started = audio.play();
    if (started) started.catch(() => setPlaying(false));
  }

  const onDevice = variant === 'hero';

  return (
    /*
      В герое — БЕЗ карточки. Содержимое лежит прямо на экране телефона, как в
      макете. Раньше здесь была card-dark, то есть карточка со своим фоном,
      рамкой и скруглением внутри корпуса телефона: рамка в рамке, из-за чего
      весь блок выглядел самодельным. Класс on-device ужимает типографику и
      варианты ответа под ширину экрана 296px.
    */
    <div className={onDevice ? 'on-device flex min-h-[452px] flex-col' : 'card p-6'}>
      <p className={onDevice ? 'd-eyebrow' : 'eyebrow'}>{copy.momentTitle}</p>
      <p className={onDevice ? 'd-prompt' : 'mt-2 text-slate'}>{copy.momentPrompt}</p>

      <div className={onDevice ? 'mt-4 flex justify-center' : 'mt-5 flex justify-center'}>
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? 'Остановить' : copy.momentPlay}
          className={
            onDevice
              ? 'listen-btn h-[92px] w-[92px] text-2xl'
              : 'listen-btn h-[104px] w-[104px] text-4xl'
          }
        >
          {playing ? '■' : '▶'}
        </button>
        {/*
          Плеер вынесен из кнопки: медиаэлемент внутри интерактивного элемента
          на мобильных браузерах ведёт себя непредсказуемо. preload="metadata"
          нужен Safari — трек, о котором он ничего не знает, стартовать
          отказывается.
        */}
        <audio
          ref={audioRef}
          src={demo.audioUrl ?? undefined}
          preload="metadata"
          playsInline
        />
      </div>

      {/* Эквалайзер из макета: показывает, что кнопка живая, пока идёт звук. */}
      {onDevice ? (
        <div aria-hidden className={`wave ${playing ? 'wave-on' : ''}`}>
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
      ) : null}

      {/* GERMAN TEXT LIVES ONLY INSIDE THIS BLOCK. Do not hoist it above. */}
      {revealed ? (
        <p className={onDevice ? 'd-de' : 'de-phrase mt-5 text-center'}>{demo.germanText}</p>
      ) : (
        <p className={onDevice ? 'd-note' : 'mt-5 text-center text-sm text-slate'}>
          {copy.momentFootnote}
        </p>
      )}

      <div className={onDevice ? 'mt-4 space-y-2' : 'mt-5 space-y-2'}>
        {demo.options.map((option) => {
          const isChosen = chosen === option;
          const reveal = revealed && option === demo.correct;
          return (
            <button
              key={option}
              type="button"
              onClick={() => choose(option)}
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
              <span>{option}</span>
            </button>
          );
        })}
      </div>

      {revealed ? (
        <div className={onDevice ? 'mt-4' : 'mt-5'}>
          <p className={onDevice ? 'text-sm font-bold' : 'text-lg font-bold'}>
            {chosen === demo.correct ? copy.momentCorrect : copy.momentIncorrect}
          </p>
          <Link
            href={testHref}
            onClick={() => track('hero_test_click', { placement: 'moment' })}
            className={onDevice ? 'btn btn-gold btn-block mt-3 nav-cta' : 'btn btn-gold btn-block mt-4'}
          >
            {copy.momentCta}
          </Link>
        </div>
      ) : null}

      {/* Точки прогресса внизу экрана — из макета: намёк, что это один шаг. */}
      {onDevice ? (
        <div aria-hidden className="d-footer">
          <span className="d-dot d-dot-on" />
          <span className="d-dot" />
          <span className="d-dot" />
        </div>
      ) : null}
    </div>
  );
}
