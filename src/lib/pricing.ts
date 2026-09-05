/**
 * Single source of truth for what the purchase block says.
 *
 * The price is read from configuration and is deliberately allowed to be
 * absent: inventing a number the business has not decided would be a lie on
 * the most load-bearing part of the page. When unset, the UI shows what is
 * included and says the price is shown at checkout.
 *
 * Only claims that are actually true belong in `includes`. No lifetime access,
 * no refund window, no guarantee, until those are real decisions.
 */

export type Price = { amount: number; currency: string; formatted: string } | null;

function readPrice(): Price {
  const raw = process.env.NEXT_PUBLIC_MOVA_PRICE_EUR;
  if (!raw) return null;

  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  return {
    amount,
    currency: 'EUR',
    formatted: new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(amount),
  };
}

export const PRODUCT = {
  name: 'MOVA',
  edition: 'Полный доступ',
  price: readPrice(),
  /** Each line must be verifiable against the production database. */
  includes: [
    'Весь курс: команды прораба, инструменты, материалы, размеры',
    'Модули по специальностям, которые есть в курсе',
    'Упражнения на понимание на слух',
    'Словарь стройки',
    'Повторение того, что забывается',
    'Прогресс сохраняется — продолжаешь с того же места',
  ],
} as const;

/** Checkout is adapter-based until a payment provider is configured. */
export const checkoutMode: 'stripe' | 'unconfigured' =
  process.env.NEXT_PUBLIC_CHECKOUT_ENABLED === 'true' ? 'stripe' : 'unconfigured';
