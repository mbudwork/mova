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
    <div
      className="surface-dark relative overflow-hidden rounded-[32px] p-8"
      style={{
        background:
          'radial-gradient(circle 320px at 90% -10%, rgba(240,180,41,.22), transparent 70%),' +
          'linear-gradient(165deg,#1c1e23,var(--color-ink) 65%)',
        border: '1px solid rgba(240,180,41,.4)',
        boxShadow: '0 40px 90px -40px rgba(0,0,0,.6)',
      }}
    >
      <p className="eyebrow">{copy.brand}</p>
      <p className="mt-3 text-2xl font-extrabold tracking-tight">{copy.offerTitle}</p>

      {PRODUCT.price ? (
        <p className="tnum mt-4 text-[4rem] font-extrabold leading-none tracking-[-.03em]">
          {PRODUCT.price.formatted}
        </p>
      ) : (
        <p className="body-copy mt-4 text-lg">{copy.offerPriceUnset}</p>
      )}

      <ul className="mt-6 space-y-3">
        {copy.offerIncludes.map((line) => (
          <li key={line} className="flex gap-3 leading-snug text-mist">
            <span aria-hidden className="font-bold text-gold-2">
              ✓
            </span>
            <span>{line}</span>
          </li>
        ))}
      </ul>

      <Link
        href={checkoutHref}
        onClick={() => track('purchase_clicked', { placement: 'offer' })}
        className="mt-7 btn btn-gold btn-lg btn-block"
      >
        {copy.offerCta}
      </Link>
    </div>
  );
}
