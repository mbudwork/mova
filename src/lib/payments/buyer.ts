import 'server-only';

import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * Находит аккаунт покупателя по адресу почты или создаёт новый.
 *
 * Нужно потому, что платить теперь можно без регистрации: единственное, что
 * известно после анонимной оплаты, — адрес, введённый на странице Stripe.
 *
 * Пароль не задаётся вовсе. Придумать его за человека и не сказать — значит
 * создать аккаунт, в который никто не сможет войти; сгенерировать и прислать
 * письмом — вернуть ровно ту почтовую возню, ради устранения которой всё это
 * и делается. Вместо этого покупатель входит автоматически при возврате с
 * оплаты и там же может задать пароль.
 *
 * `email_confirm: true` выставляется осознанно: адрес уже подтверждён
 * платежом. Stripe провёл по нему транзакцию, это более сильное
 * доказательство владения, чем клик по ссылке в письме.
 */
export async function findOrCreateBuyer(
  email: string,
): Promise<{ userId: string; created: boolean } | null> {
  const supabase = createSupabaseAdminClient();
  const clean = email.trim();
  if (!clean) return null;

  const { data: existing, error: lookupError } = await supabase.rpc('user_id_by_email', {
    p_email: clean,
  });

  if (lookupError) {
    console.error('[buyer] lookup failed', lookupError);
    return null;
  }

  if (existing) return { userId: existing, created: false };

  const { data, error } = await supabase.auth.admin.createUser({
    email: clean,
    email_confirm: true,
  });

  if (error || !data.user) {
    /*
      Гонка: два вебхука по одному платежу пришли одновременно, второй упал
      на уникальности адреса. Аккаунт при этом существует — перечитываем и
      продолжаем, потому что для вызывающего результат тот же.
    */
    const { data: retry } = await supabase.rpc('user_id_by_email', { p_email: clean });
    if (retry) return { userId: retry, created: false };

    console.error('[buyer] create failed', error);
    return null;
  }

  return { userId: data.user.id, created: true };
}
