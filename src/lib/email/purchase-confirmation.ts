import 'server-only';

import { sendMail } from '@/lib/email/send';
import { env } from '@/lib/config/env';
import {
  CONSENT_TEXTS,
  CONSENT_FORM_VERSION,
  PRIVACY_VERSION,
  REFUND_POLICY_VERSION,
  TERMS_VERSION,
} from '@/lib/legal/versions';
import type { Locale } from '@/lib/locale';

/**
 * Письмо-подтверждение после оплаты.
 *
 * Это не «спасибо за покупку», а обязательный документ. Право ЕС требует
 * подтвердить заключённый договор на долговечном носителе и зафиксировать в
 * нём согласие на немедленное предоставление цифрового контента — то самое,
 * из-за которого покупатель теряет право на отказ. Письмо, лежащее в ящике
 * покупателя, этому требованию отвечает; страница на сайте — нет, её можно
 * молча изменить.
 *
 * Поэтому текст согласия вставляется дословно, а не ссылкой, и рядом стоят
 * номера версий документов, действовавших в момент покупки.
 */
export async function sendPurchaseConfirmation(params: {
  to: string;
  locale: Locale;
  sessionId: string;
  purchasedAt: Date;
}): Promise<boolean> {
  const texts = CONSENT_TEXTS[params.locale];
  const site = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  const when = params.purchasedAt.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  const rows: [string, string][] = [
    ['Продавец', 'MBUD sp. z o.o., Ksawerów 3, 02-656 Warszawa, Polska'],
    ['Реквизиты', 'KRS 0000815662 · NIP 9522202055 · REGON 384966966'],
    ['Продукт', 'MOVA — полный цифровой доступ'],
    ['Цена', '29 € — единовременный платёж, без подписки'],
    ['Почта аккаунта', params.to],
    ['Дата и время заказа', when],
    ['Идентификатор заказа', params.sessionId],
    [
      'Версии документов',
      `условия ${TERMS_VERSION} · возврат ${REFUND_POLICY_VERSION} · конфиденциальность ${PRIVACY_VERSION} · форма согласия ${CONSENT_FORM_VERSION}`,
    ],
  ];

  const text = [
    'Оплата MOVA подтверждена, полный доступ открыт.',
    '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    '',
    'До оплаты вы дали следующее согласие:',
    `«${texts.immediateAccess}»`,
    '',
    `Войти в курс: ${site}/app`,
    `Условия: ${site}/legal/terms`,
    `Правила отказа и возврата: ${site}/legal/refund`,
    `Политика конфиденциальности: ${site}/legal/privacy`,
    '',
    'Вопросы и жалобы: info@mbud.agency',
    '',
    'MBUD sp. z o.o., Ksawerów 3, 02-656 Warszawa, Polska',
  ].join('\n');

  const html = `<!doctype html>
<html lang="ru"><body style="margin:0;padding:24px;background:#f5f5f4;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:28px">
    <h1 style="margin:0 0 8px;font-size:20px">Оплата подтверждена, доступ открыт</h1>
    <p style="margin:0 0 20px;color:#555;line-height:1.5">
      Это подтверждение заключённого договора. Сохрани письмо — в нём зафиксированы условия,
      действовавшие на момент покупки.
    </p>

    <table style="width:100%;border-collapse:collapse;font-size:14px">
      ${rows
        .map(
          ([k, v]) =>
            `<tr><td style="padding:7px 0;color:#666;vertical-align:top;width:38%">${k}</td><td style="padding:7px 0">${v}</td></tr>`,
        )
        .join('')}
    </table>

    <p style="margin:22px 0 6px;color:#666;font-size:13px">До оплаты вы дали следующее согласие:</p>
    <blockquote style="margin:0;padding:12px 14px;background:#faf7f0;border-left:3px solid #f0b429;font-size:13px;line-height:1.5;color:#333">
      ${texts.immediateAccess}
    </blockquote>

    <p style="margin:26px 0 0">
      <a href="${site}/app" style="display:inline-block;background:#f0b429;color:#241a02;text-decoration:none;font-weight:700;padding:13px 26px;border-radius:100px">Войти в курс</a>
    </p>

    <p style="margin:24px 0 0;font-size:12px;color:#888;line-height:1.7">
      <a href="${site}/legal/terms" style="color:#8a6300">Условия</a> ·
      <a href="${site}/legal/refund" style="color:#8a6300">Возврат</a> ·
      <a href="${site}/legal/privacy" style="color:#8a6300">Конфиденциальность</a><br>
      Вопросы и жалобы: <a href="mailto:info@mbud.agency" style="color:#8a6300">info@mbud.agency</a><br>
      MBUD sp. z o.o., Ksawerów 3, 02-656 Warszawa, Polska
    </p>
  </div>
</body></html>`;

  return sendMail({
    to: params.to,
    subject: 'MOVA — доступ открыт, подтверждение покупки',
    html,
    text,
  });
}
