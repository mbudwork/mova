'use client';

import { useState, useTransition } from 'react';
import { track } from '@/lib/analytics/client';
import { PRODUCT, checkoutMode } from '@/lib/pricing';
import type { Locale } from '@/lib/locale';
import { startStripeCheckout, submitCheckoutLead } from '@/app/checkout/actions';

/**
 * Honest checkout adapter. It does not fake a successful payment — the audit
 * explicitly forbids that — and it does not sit on the commercial landing as
 * a deflated "coming soon" message either. It is a real step: the visitor
 * has decided to buy, we say so plainly, and we record the intent.
 */
export function CheckoutScreen({ locale }: { locale: Locale }) {
  const [pending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const live = checkoutMode === 'stripe';

  function submit() {
    track('checkout_started', { locale, mode: live ? 'stripe' : 'lead' });
    setError(null);

    startTransition(async () => {
      if (live) {
        const session = await startStripeCheckout(locale);
        if (!session.ok) {
          setError(session.error);
          return;
        }
        // Full navigation, not router.push: this leaves our origin for
        // Stripe's hosted page.
        window.location.assign(session.url);
        return;
      }

      const result = await submitCheckoutLead(locale);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSubmitted(true);
    });
  }

  if (submitted) {
    return (
      <div className="card p-6">
        <p className="text-2xl font-extrabold">Заявка принята</p>
        <p className="mt-3 leading-snug text-slate">
          Оплата ещё не подключена — мы открываем доступ вручную и напишем тебе на почту аккаунта,
          как только это будет готово. Ничего платить сейчас не нужно.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <p className="eyebrow">{PRODUCT.name}</p>
      <p className="mt-2 text-2xl font-extrabold">{PRODUCT.edition}</p>
      {PRODUCT.price ? (
        <p className="mt-3 text-3xl font-extrabold tabular-nums">{PRODUCT.price.formatted}</p>
      ) : null}

      <ul className="mt-6 space-y-2">
        {PRODUCT.includes.map((line) => (
          <li key={line} className="flex gap-3 leading-snug">
            <span aria-hidden className="font-bold text-good">
              ✓
            </span>
            <span>{line}</span>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-sm text-slate">
        {live
          ? 'Оплата проходит на защищённой странице Stripe. Доступ откроется сразу после оплаты.'
          : 'Приём онлайн-оплаты сейчас настраивается. Нажимая «Оформить», ты оставляешь заявку — доступ откроем вручную и напишем на твою почту.'}
      </p>

      {error ? (
        <p role="alert" className="notice notice-bad mt-4">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="mt-6 btn btn-gold btn-lg btn-block"
      >
        {pending ? (live ? 'Открываю оплату…' : 'Отправляю…') : live ? 'Оплатить' : 'Оформить'}
      </button>
    </div>
  );
}
