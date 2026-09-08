'use client';

import { useState } from 'react';
import { PlayButton } from '@/components/PlayButton';
import type { PhraseCard } from '@/lib/content/lookup';

/**
 * Results for "Быстро сказать", plus the full-screen card.
 *
 * The card is the point of the whole screen: the phone gets handed to a German
 * colleague, so the German sentence fills the display and the Russian is small
 * underneath. Tapping anywhere closes it — a person holding out a phone at
 * arm's length should not have to find a small button.
 */
export function PhraseResults({ phrases }: { phrases: PhraseCard[] }) {
  const [shown, setShown] = useState<PhraseCard | null>(null);

  if (shown) {
    return (
      <div
        role="dialog"
        aria-label="Покажи этот экран"
        onClick={() => setShown(null)}
        className="surface-dark fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 p-7 text-center"
      >
        <p className="de-phrase-xl">{shown.germanText}</p>
        <p className="text-lg text-mist">{shown.translation}</p>
        {shown.audioUrl ? <PlayButton src={shown.audioUrl} /> : null}
        <p className="foot-caption absolute bottom-8">Нажми, чтобы закрыть</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {phrases.map((phrase) => (
        <button
          key={phrase.id}
          type="button"
          onClick={() => setShown(phrase)}
          className="card w-full p-5 text-left"
        >
          <p className="text-xl font-bold leading-tight">{phrase.germanText}</p>
          <p className="mt-1 text-lg text-slate">{phrase.translation}</p>
          {phrase.pronunciation ? (
            <p className="mt-1 text-sm text-mist-2">{phrase.pronunciation}</p>
          ) : null}
        </button>
      ))}
    </div>
  );
}
