import type { ReactNode } from 'react';

/**
 * Empty and error states say what happened and what to do next — no apologies,
 * no mood. An empty screen is an invitation to act.
 */
export function EmptyState({ title, hint, action }: { title: string; hint: string; action?: ReactNode }) {
  return (
    <div className="rounded-[14px] border-2 border-dashed border-concrete-deep bg-paper/60 p-6 text-center">
      <p className="text-lg font-bold">{title}</p>
      <p className="mt-2 text-slate">{hint}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ title, hint, action }: { title: string; hint: string; action?: ReactNode }) {
  return (
    <div role="alert" className="rounded-[14px] border-l-8 border-rot bg-paper p-5">
      <p className="text-lg font-bold">{title}</p>
      <p className="mt-1 text-slate">{hint}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div aria-hidden className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-[14px] bg-concrete-deep" />
      ))}
    </div>
  );
}
