import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Every screen is one column, capped at phone width even on desktop.
 * Desktop is explicitly secondary: we centre the phone layout rather than
 * inventing a second, wider design nobody on a Baustelle will ever see.
 */
export function Screen({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-[520px] px-5 pb-10">{children}</div>;
}

export function ScreenHeader({ title, back }: { title: string; back?: string }) {
  return (
    <header className="flex items-center gap-3 py-4">
      {back ? (
        <Link
          href={back}
          aria-label="Назад"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-paper text-2xl leading-none"
        >
          ←
        </Link>
      ) : null}
      <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
    </header>
  );
}
