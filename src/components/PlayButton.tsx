'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  /** null = одобренной записи ещё нет; кнопка честно об этом говорит. */
  src: string | null;
  label?: string;
};

/**
 * Главный элемент управления в продукте. Большой, золотой, одна задача.
 *
 * Состояние берётся из событий самого плеера (play/pause/ended/error), а не из
 * результата промиса play(). Так было раньше, и на телефоне это ломалось: на
 * мобильных браузерах play() может отработать без ошибки, но реально начать
 * воспроизведение позже, либо отклониться беззвучно — иконка застревала на «▶»
 * и выглядела мёртвой, хотя звук шёл, или наоборот. Медиаэлемент знает своё
 * состояние точно, промис — нет.
 *
 * Воспроизведение всегда запускает человек: мобильные браузеры блокируют
 * автозапуск, а у рабочего телефон в кармане — звук не должен включаться сам.
 */
export function PlayButton({ src, label = 'Слушать' }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const onPlay = () => {
      setPlaying(true);
      setFailed(false);
    };
    const onStop = () => setPlaying(false);
    const onError = () => {
      setPlaying(false);
      setFailed(true);
    };

    el.addEventListener('play', onPlay);
    el.addEventListener('playing', onPlay);
    el.addEventListener('pause', onStop);
    el.addEventListener('ended', onStop);
    el.addEventListener('error', onError);

    return () => {
      el.removeEventListener('play', onPlay);
      el.removeEventListener('playing', onPlay);
      el.removeEventListener('pause', onStop);
      el.removeEventListener('ended', onStop);
      el.removeEventListener('error', onError);
    };
  }, [src]);

  if (!src) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-[132px] w-[132px] items-center justify-center rounded-full border-4 border-dashed border-cream-deep text-4xl text-slate">
          ♪
        </div>
        <p className="text-center text-slate">Аудио для этой фразы ещё не записано</p>
      </div>
    );
  }

  function toggle() {
    const el = audioRef.current;
    if (!el) return;

    if (!el.paused) {
      el.pause();
      el.currentTime = 0;
      return;
    }

    /*
      play() вызывается синхронно внутри обработчика клика — на iOS это
      обязательное условие: любой await до вызова разрывает цепочку
      пользовательского жеста, и браузер отказывает в воспроизведении.
    */
    const started = el.play();
    if (started) started.catch(() => setFailed(true));
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Остановить' : label}
        className="listen-btn h-[132px] w-[132px] text-5xl"
      >
        {playing ? '■' : '▶'}
      </button>
      <span className="text-lg font-bold">{playing ? 'Играет…' : label}</span>
      {failed ? (
        <p role="alert" className="text-center text-bad">
          Звук не запустился. Проверь громкость и переключатель «без звука» сбоку телефона — на
          iPhone он глушит и веб-страницы.
        </p>
      ) : null}
      {/*
        preload="metadata", а не "none": Safari на iOS отказывается стартовать
        трек, о котором ничего не знает. playsInline нужен там же — без него
        iOS может попытаться открыть медиа во весь экран.
      */}
      <audio ref={audioRef} src={src} preload="metadata" playsInline />
    </div>
  );
}
