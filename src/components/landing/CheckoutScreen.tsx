'use client';

import { useState, useTransition } from 'react';
import { track } from '@/lib/analytics/client';
import { PRODUCT, checkoutMode } from '@/lib/pricing';
import type { Locale } from '@/lib/locale';
import { startStripeCheckout, submitCheckoutLead } from '@/app/checkout/actions';
import { CONSENT_TEXTS } from '@/lib/legal/versions';

/**
 * Один чекбокс согласия.
 *
 * Область нажатия — вся строка целиком, включая текст: на телефоне попасть в
 * квадратик 20×20 пальцем в перчатке почти невозможно, а промах здесь означает
 * не «неудобно», а «человек не смог купить».
 */
function ConsentBox({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer gap-3 text-sm leading-snug">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-6 w-6 shrink-0 accent-[var(--color-gold)]"
      />
      <span className="text-slate">{children}</span>
    </label>
  );
}

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

  /*
    Два раздельных состояния, оба false по умолчанию.

    Предотмеченная галочка согласием не считается — закон требует активного
    действия. И второе согласие нельзя было бы просто вписать в текст первого:
    просьба начать предоставление немедленно и понимание последствий должны
    быть выражены отдельно, иначе исключение из права на отказ не работает и
    покупатель вправе вернуть деньги, пройдя курс целиком.
  */
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedImmediate, setAcceptedImmediate] = useState(false);

  const live = checkoutMode === 'stripe';
  const consentTexts = CONSENT_TEXTS[locale];
  const consentGiven = acceptedTerms && acceptedImmediate;

  function submit() {
    track('checkout_started', { locale, mode: live ? 'stripe' : 'lead' });
    setError(null);

    startTransition(async () => {
      if (live) {
        const session = await startStripeCheckout(locale, {
          terms: acceptedTerms,
          immediateAccess: acceptedImmediate,
        });
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

      {live ? (
        <div className="mt-6 space-y-4">
          <ConsentBox checked={acceptedTerms} onChange={setAcceptedTerms}>
            Я принимаю{' '}
            <a href="/legal/terms" target="_blank" className="font-bold text-gold-deep underline">
              Пользовательское соглашение
            </a>{' '}
            и подтверждаю, что ознакомился с{' '}
            <a href="/legal/privacy" target="_blank" className="font-bold text-gold-deep underline">
              Политикой конфиденциальности
            </a>{' '}
            и{' '}
            <a href="/legal/refund" target="_blank" className="font-bold text-gold-deep underline">
              Правилами отказа и возврата
            </a>
            .
          </ConsentBox>

          <ConsentBox checked={acceptedImmediate} onChange={setAcceptedImmediate}>
            {consentTexts.immediateAccess}
          </ConsentBox>

          <p className="text-xs leading-snug text-mist-2">{consentTexts.obligation}</p>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="notice notice-bad mt-4">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={submit}
        disabled={pending || (live && !consentGiven)}
        className="mt-6 btn btn-gold btn-lg btn-block"
      >
        {pending ? (live ? 'Открываю оплату…' : 'Отправляю…') : live ? 'Оплатить' : 'Оформить'}
      </button>
    </div>
  );
}
