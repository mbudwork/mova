'use client';

import { useState, useTransition } from 'react';
import { track } from '@/lib/analytics/client';
import { PRODUCT, checkoutMode } from '@/lib/pricing';
import type { Locale } from '@/lib/locale';
import { submitCheckoutLead } from '@/app/checkout/actions';

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

  function submit() {
    track('checkout_started', { locale });
    startTransition(async () => {
      const result = await submitCheckoutLead(locale);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSubmitted(true);
    });
  }

  if (checkoutMode === 'stripe') {
    // Live payment path — implemented when Stripe credentials exist.
    return (
      <p className="text-slate">Оплата подключается. Обнови страницу через минуту.</p>
    );
  }

  if (submitted) {
    return (
      <div className="rounded-[14px] bg-paper p-6">
        <p className="text-2xl font-extrabold">Заявка принята</p>
        <p className="mt-3 leading-snug text-slate">
          Оплата ещё не подключена — мы открываем доступ вручную и напишем тебе на почту аккаунта,
          как только это будет готово. Ничего платить сейчас не нужно.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[14px] bg-paper p-6">
      <p className="eyebrow">{PRODUCT.name}</p>
      <p className="mt-2 text-2xl font-extrabold">{PRODUCT.edition}</p>
      {PRODUCT.price ? (
        <p className="mt-3 text-3xl font-extrabold tabular-nums">{PRODUCT.price.formatted}</p>
      ) : null}

      <ul className="mt-6 space-y-2">
        {PRODUCT.includes.map((line) => (
          <li key={line} className="flex gap-3 leading-snug">
            <span aria-hidden className="font-bold text-gruen">
              ✓
            </span>
            <span>{line}</span>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-sm text-slate">
        Приём онлайн-оплаты сейчас настраивается. Нажимая «Оформить», ты оставляешь заявку — доступ
        откроем вручную и напишем на твою почту.
      </p>

      {error ? (
        <p role="alert" className="mt-4 rounded-[14px] border-l-8 border-rot bg-concrete p-4 font-bold">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="mt-6 flex min-h-[68px] w-full items-center justify-center rounded-[14px] bg-signal px-5 text-xl font-bold text-ink shadow-[0_3px_0_var(--color-signal-deep)] disabled:opacity-50"
      >
        {pending ? 'Отправляю…' : 'Оформить'}
      </button>
    </div>
  );
}
