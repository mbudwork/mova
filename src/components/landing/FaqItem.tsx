'use client';

import { track } from '@/lib/analytics/client';

/**
 * Аккордеон из премиум-макета: разделитель вместо карточки, плюс, который
 * поворачивается в крестик. Маркер списка снят на двух движках сразу —
 * ::-webkit-details-marker для Safari, list-none для остальных.
 */
export function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details
      className="faq-item"
      onToggle={() => track('faq_opened', { question: q }, { once: true })}
    >
      <summary>{q}</summary>
      <p>{a}</p>
    </details>
  );
}
