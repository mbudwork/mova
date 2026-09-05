'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  /** null = no approved audio yet; the button says so instead of faking it. */
  src: string | null;
  label?: string;
};

/**
 * The single most important control in the product. Big, yellow, one job.
 * Playback is always user-initiated — mobile browsers block autoplay, and a
 * worker with a phone in a pocket should never have audio start on its own.
 */
export function PlayButton({ src, label = 'Слушать' }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onEnd = () => setPlaying(false);
    el.addEventListener('ended', onEnd);
    return () => el.removeEventListener('ended', onEnd);
  }, []);

  if (!src) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-[132px] w-[132px] items-center justify-center rounded-full border-4 border-dashed border-concrete-deep text-4xl text-slate">
          ♪
        </div>
        <p className="text-center text-slate">Аудио для этой фразы ещё не записано</p>
      </div>
    );
  }

  async function toggle() {
    const el = audioRef.current;
    if (!el) return;
    try {
      if (playing) {
        el.pause();
        el.currentTime = 0;
        setPlaying(false);
      } else {
        await el.play();
        setPlaying(true);
      }
    } catch {
      setFailed(true);
      setPlaying(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Остановить' : label}
        className="flex h-[132px] w-[132px] items-center justify-center rounded-full bg-signal text-5xl text-ink shadow-[0_5px_0_var(--color-signal-deep)] transition-transform active:translate-y-[3px] active:shadow-[0_2px_0_var(--color-signal-deep)]"
      >
        {playing ? '■' : '▶'}
      </button>
      <span className="text-lg font-bold">{playing ? 'Играет…' : label}</span>
      {failed ? (
        <p role="alert" className="text-center text-rot">
          Звук не запустился. Проверь громкость и беззвучный режим, потом нажми ещё раз.
        </p>
      ) : null}
      <audio ref={audioRef} src={src} preload="none" />
    </div>
  );
}
