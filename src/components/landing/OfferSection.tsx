'use client';

import Link from 'next/link';
import { track } from '@/lib/analytics/client';
import { PRODUCT } from '@/lib/pricing';
import type { LandingCopy } from '@/lib/landing-copy';

/**
 * The commercial offer. One product, one price (or an honest absence of one),
 * one primary action — that action always goes to checkout, never back to the
 * free test. A visitor who has already decided must be able to buy; routing
 * "Получить доступ" to the diagnostic (V1's bug) removed the purchase path
 * entirely for exactly the person most ready to use it.
 */
export function OfferSection({ copy, checkoutHref }: { copy: LandingCopy; checkoutHref: string }) {
  return (
    <div className="rounded-[14px] bg-paper p-6">
      <p className="eyebrow">{copy.brand}</p>
      <p className="mt-2 text-2xl font-extrabold">{copy.offerTitle}</p>

      {PRODUCT.price ? (
        <p className="mt-3 text-3xl font-extrabold tabular-nums">{PRODUCT.price.formatted}</p>
      ) : (
        <p className="mt-3 text-lg text-slate">{copy.offerPriceUnset}</p>
      )}

      <ul className="mt-6 space-y-3">
        {copy.offerIncludes.map((line) => (
          <li key={line} className="flex gap-3 leading-snug">
            <span aria-hidden className="font-bold text-gruen">
              ✓
            </span>
            <span>{line}</span>
          </li>
        ))}
      </ul>

      <Link
        href={checkoutHref}
        onClick={() => track('purchase_clicked', { placement: 'offer' })}
        className="mt-7 flex min-h-[68px] w-full items-center justify-center rounded-[14px] bg-signal px-5 text-xl font-bold text-ink shadow-[0_3px_0_var(--color-signal-deep)] active:translate-y-[2px]"
      >
        {copy.offerCta}
      </Link>
    </div>
  );
}
