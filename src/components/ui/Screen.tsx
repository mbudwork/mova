import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Каждый экран — одна колонка шириной с телефон даже на десктопе. Десктоп
 * сознательно вторичен: мы центрируем телефонную раскладку, а не рисуем
 * второй, широкий макет, которого никто на стройке не увидит.
 */
export function Screen({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-[560px] px-5 pb-12">{children}</div>;
}

export function ScreenHeader({ title, back }: { title: string; back?: string }) {
  return (
    <header className="flex items-center gap-3 py-5">
      {back ? (
        <Link
          href={back}
          aria-label="Назад"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[var(--line)] bg-paper text-xl leading-none"
        >
          ←
        </Link>
      ) : null}
      <h1 className="h-title">{title}</h1>
    </header>
  );
}
