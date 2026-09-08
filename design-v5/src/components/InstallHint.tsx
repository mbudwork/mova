'use client';

import { useEffect, useState } from 'react';

/**
 * Предложение поставить ярлык на главный экран телефона.
 *
 * Зачем: без ярлыка человек каждый раз ищет вкладку или набирает адрес, и
 * ежедневная привычка не складывается. С ярлыком MOVA открывается как
 * приложение, во весь экран, без адресной строки — и уроки, которые он уже
 * открывал, работают без сети (сервис-воркер уже есть в проекте).
 *
 * Два браузера ведут себя по-разному, и это не косметика:
 *
 *  • Chrome и всё на Android дают событие beforeinstallprompt, и установку
 *    можно запустить кнопкой. Событие приходит только если приложение ещё не
 *    установлено, — то есть само его наличие и есть проверка.
 *  • Safari на iOS такого события не даёт вовсе. Там остаётся объяснить
 *    словами, куда нажимать: «Поделиться» → «На экран Домой». Поэтому для iOS
 *    показывается инструкция, а не кнопка, которая всё равно бы не сработала.
 *
 * Отказ запоминается в localStorage: подсказка, всплывающая при каждом
 * заходе, раздражает сильнее, чем помогает.
 */

const DISMISSED_KEY = 'mova.install.dismissed';

type Prompt = Event & { prompt: () => Promise<void> };

export function InstallHint() {
  const [deferred, setDeferred] = useState<Prompt | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // Уже установлено — предлагать нечего.
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;

    if (standalone || localStorage.getItem(DISMISSED_KEY) === '1') return;

    setDismissed(false);
    setIsIos(/iphone|ipad|ipod/i.test(window.navigator.userAgent));

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as Prompt);
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  function close() {
    localStorage.setItem(DISMISSED_KEY, '1');
    setDismissed(true);
  }

  // На Android ждём событие; на iOS его не будет никогда, показываем сразу.
  if (dismissed || (!deferred && !isIos)) return null;

  return (
    <aside className="card mt-8 p-5">
      <p className="font-bold">Поставь MOVA на экран телефона</p>
      <p className="mt-1 text-sm text-slate">
        Открывается как приложение, а уроки, которые ты уже проходил, работают без интернета.
      </p>

      {deferred ? (
        <button
          type="button"
          onClick={() => {
            void deferred.prompt();
            close();
          }}
          className="btn btn-ink btn-block mt-4"
        >
          Добавить на экран
        </button>
      ) : (
        <p className="mt-3 text-sm text-slate">
          В Safari нажми «Поделиться» внизу экрана, затем «На экран Домой».
        </p>
      )}

      <button
        type="button"
        onClick={close}
        className="mt-3 w-full py-3 text-center text-sm font-bold text-mist-2 underline"
      >
        Не сейчас
      </button>
    </aside>
  );
}
