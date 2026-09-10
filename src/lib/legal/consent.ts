import 'server-only';

import { headers } from 'next/headers';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  CONSENT_FORM_VERSION,
  CONSENT_TEXTS,
  PRIVACY_VERSION,
  REFUND_POLICY_VERSION,
  TERMS_VERSION,
} from '@/lib/legal/versions';
import type { Locale } from '@/lib/locale';

/**
 * Записывает согласия ДО создания сессии оплаты.
 *
 * Порядок принципиален. Если писать после платежа, то при сбое между двумя
 * шагами останется оплата без доказательства согласия — а именно это
 * доказательство защищает от возврата денег после пройденного курса. Обратный
 * сбой безобиден: запись без платежа просто останется висеть со статусом
 * pending и никого ни к чему не обязывает.
 */

function firstIp(value: string | null): string | null {
  if (!value) return null;
  // x-forwarded-for приходит цепочкой «клиент, прокси, прокси». Нужен первый.
  const candidate = value.split(',')[0]?.trim();
  return candidate && candidate.length > 0 ? candidate : null;
}

export async function recordCheckoutConsent(params: {
  locale: Locale;
  userId: string | null;
  email: string | null;
}): Promise<string | null> {
  const texts = CONSENT_TEXTS[params.locale];
  const headerList = await headers();

  /*
    Netlify кладёт настоящий адрес клиента в x-nf-client-connection-ip.
    x-forwarded-for оставлен запасным вариантом — на случай смены хостинга,
    чтобы журнал не начал молча писать null.
  */
  const ip =
    firstIp(headerList.get('x-nf-client-connection-ip')) ??
    firstIp(headerList.get('x-forwarded-for'));

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('checkout_consents')
    .insert({
      user_id: params.userId,
      email: params.email,
      locale: params.locale,
      terms_version: TERMS_VERSION,
      refund_policy_version: REFUND_POLICY_VERSION,
      privacy_version: PRIVACY_VERSION,
      consent_form_version: CONSENT_FORM_VERSION,
      terms_consent_text: texts.terms,
      immediate_access_consent_text: texts.immediateAccess,
      terms_accepted: true,
      immediate_access_accepted: true,
      ip_address: ip,
      user_agent: headerList.get('user-agent'),
      payment_status: 'pending',
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('[consent] запись согласия не удалась', error);
    return null;
  }

  return data.id;
}

/** Привязывает запись к сессии Stripe сразу после её создания. */
export async function attachSessionToConsent(consentId: string, sessionId: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from('checkout_consents')
    .update({ stripe_checkout_session_id: sessionId })
    .eq('id', consentId);

  if (error) console.error('[consent] не удалось привязать сессию', error, consentId);
}
