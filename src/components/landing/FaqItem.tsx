'use client';

import { track } from '@/lib/analytics/client';

export function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="rounded-[14px] bg-paper p-4" onToggle={() => track('faq_opened', { question: q }, { once: true })}>
      <summary className="cursor-pointer list-none text-lg font-bold leading-snug">{q}</summary>
      <p className="mt-3 leading-snug text-slate">{a}</p>
    </details>
  );
}
