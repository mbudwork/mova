import type { ReactNode } from 'react';

/**
 * Пустые состояния и ошибки говорят, что случилось и что делать дальше —
 * без извинений и настроения. Пустой экран — это приглашение к действию.
 */
export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[26px] border-2 border-dashed border-[var(--line)] bg-ink-2/60 p-7 text-center">
      <p className="text-lg font-bold tracking-tight">{title}</p>
      <p className="mt-2 text-slate">{hint}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title,
  hint,
  action,
}: {
  title: string;
  hint: string;
  action?: ReactNode;
}) {
  return (
    <div role="alert" className="notice notice-bad">
      <p className="text-lg font-bold tracking-tight">{title}</p>
      <p className="mt-1 font-normal text-slate">{hint}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div aria-hidden className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-[18px] bg-ink-3" />
      ))}
    </div>
  );
}
