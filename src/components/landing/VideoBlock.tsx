'use client';

import { useRef, useState } from 'react';
import { track } from '@/lib/analytics/client';

/**
 * Video container for the 30–45 second product film (see docs/MOVA_VIDEO_BRIEF.md).
 *
 * Nothing downloads until the visitor taps: no autoplay, no preload, no poster
 * weight before it is needed. Milestone events fire off native `timeupdate`,
 * once per milestone, so a re-render cannot double-report progress.
 */
const VIDEO_SRC = process.env.NEXT_PUBLIC_MOVA_VIDEO_URL ?? '';

export function VideoBlock({
  pendingLabel = 'Видео скоро',
  pendingSub = 'Покажем полный путь: занятие, команда прораба, ответ и прогресс.',
}: {
  pendingLabel?: string;
  pendingSub?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const firedRef = useRef(new Set<string>());

  if (!VIDEO_SRC) {
    return (
      <div className="flex aspect-[4/5] w-full flex-col items-center justify-center rounded-[18px] border-2 border-dashed border-cream-deep bg-paper p-6 text-center">
        <span aria-hidden className="text-4xl text-slate">
          ▶
        </span>
        <p className="mt-4 text-lg font-bold">{pendingLabel}</p>
        <p className="mt-2 text-slate">{pendingSub}</p>
      </div>
    );
  }

  function handleTimeUpdate(event: React.SyntheticEvent<HTMLVideoElement>) {
    const el = event.currentTarget;
    if (!el.duration) return;
    const pct = el.currentTime / el.duration;
    const milestones: [number, string][] = [
      [0.25, 'product_video_25'],
      [0.5, 'product_video_50'],
      [0.75, 'product_video_75'],
    ];
    for (const [threshold, event_] of milestones) {
      if (pct >= threshold && !firedRef.current.has(event_)) {
        firedRef.current.add(event_);
        track(event_ as 'product_video_25', {});
      }
    }
  }

  if (!playing) {
    return (
      <button
        type="button"
        onClick={() => {
          setPlaying(true);
          track('product_video_started', {});
        }}
        className="relative flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-[18px] bg-ink"
        aria-label="Смотреть видео о MOVA"
      >
        <span className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-gold text-3xl text-ink">
          ▶
        </span>
      </button>
    );
  }

  return (
    <video
      src={VIDEO_SRC}
      controls
      autoPlay
      playsInline
      preload="none"
      onTimeUpdate={handleTimeUpdate}
      onEnded={() => track('product_video_completed', {})}
      className="aspect-[4/5] w-full rounded-[18px] bg-ink"
    />
  );
}
