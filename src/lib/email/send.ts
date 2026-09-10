import 'server-only';

import { env, mailMode } from '@/lib/config/env';

/**
 * Отправка транзакционной почты через HTTP-API Resend.
 *
 * Именно HTTP, а не SMTP: серверные функции Netlify живут секунды и не держат
 * исходящие TCP-соединения надёжно, а SMTP требует рукопожатия и таймаутов,
 * которые в такой среде срываются чаще, чем обычный POST.
 *
 * Без ключа функция не бросает исключение, а честно возвращает false и пишет
 * в лог. Причина: единственный её вызов идёт из вебхука Stripe после
 * подтверждённого платежа. Упасть там значит вернуть Stripe пятисотку, тот
 * повторит доставку, и на каждый повтор пользователь получит ещё одно
 * начисление доступа. Недоставленное письмо — проблема, потерянная оплата —
 * катастрофа.
 */
export async function sendMail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<boolean> {
  if (mailMode !== 'resend') {
    console.warn('[mail] RESEND_API_KEY не задан — письмо не отправлено:', params.subject);
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.MAIL_FROM,
        reply_to: env.MAIL_REPLY_TO,
        to: [params.to],
        subject: params.subject,
        html: params.html,
        // Текстовая версия обязательна: часть почтовых клиентов на телефонах
        // режет HTML, а это письмо — подтверждение договора, оно должно
        // читаться в любом виде.
        text: params.text,
      }),
    });

    if (!response.ok) {
      console.error('[mail] Resend отказал', response.status, await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error('[mail] отправка сорвалась', error);
    return false;
  }
}
