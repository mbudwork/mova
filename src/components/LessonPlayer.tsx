'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { PlayButton } from '@/components/PlayButton';
import { completeLesson } from '@/lib/content/actions';
import type { LessonPhrase } from '@/lib/content/course';

/**
 * MODE 1 — Listen → Reveal Meaning.
 *
 * The exposure stage: German + audio + Russian, one phrase on screen, nothing
 * else. Recognition, audio-only and unseen-combination modes reuse this exact
 * frame in later phases — the interface stays put while the content gets
 * harder. The user never sees the semantic markup underneath.
 */
export function LessonPlayer({
  lessonId,
  phrases,
}: {
  lessonId: string;
  phrases: LessonPhrase[];
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  const phrase = phrases[index];
  const isLast = index === phrases.length - 1;

  if (!phrase) return null;

  function next() {
    setIndex((i) => Math.min(i + 1, phrases.length - 1));
    setRevealed(false);
  }

  function finish() {
    setFailed(false);
    startTransition(async () => {
      const result = await completeLesson(lessonId);
      if ('error' in result) {
        setFailed(true);
        return;
      }
      router.push(result.nextSlug ? `/app/lesson/${result.nextSlug}` : '/app');
    });
  }

  return (
    <div className="flex min-h-[76vh] flex-col">
      <p className="eyebrow">
        Фраза {index + 1} из {phrases.length}
      </p>

      <div className="mt-2 flex gap-1" aria-hidden>
        {phrases.map((item, i) => (
          <span
            key={item.id}
            className={['h-1.5 flex-1 rounded-full', i <= index ? 'bg-signal' : 'bg-concrete-deep'].join(
              ' ',
            )}
          />
        ))}
      </div>

      <div className="mt-10 flex justify-center">
        <PlayButton src={null} />
      </div>

      <p className="de-phrase mt-10 text-center">{phrase.germanText}</p>

      {phrase.pronunciation ? (
        <p className="mt-3 text-center text-slate">{phrase.pronunciation}</p>
      ) : null}

      <div className="mt-8 min-h-[76px]">
        {revealed ? (
          <p className="rounded-[14px] border-l-8 border-blau bg-paper p-4 text-center text-xl font-bold">
            {phrase.translation}
          </p>
        ) : null}
      </div>

      <div className="mt-auto space-y-3 pt-8">
        {failed ? (
          <p role="alert" className="rounded-[14px] border-l-8 border-rot bg-paper p-4 font-bold">
            Урок не сохранился. Проверь интернет и нажми ещё раз.
          </p>
        ) : null}
        {revealed ? (
          isLast ? (
            <Button size="lg" onClick={finish} disabled={pending}>
              {pending ? 'Сохраняю…' : 'Закончить урок'}
            </Button>
          ) : (
            <Button size="lg" onClick={next}>
              Дальше
            </Button>
          )
        ) : (
          <Button size="lg" variant="ink" onClick={() => setRevealed(true)}>
            Показать перевод
          </Button>
        )}

        <p className="text-center">
          <Link href="/app" className="inline-block px-4 py-4 text-slate underline">
            Выйти из урока
          </Link>
        </p>
      </div>
    </div>
  );
}
