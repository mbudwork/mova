'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/guards';
import { env } from '@/lib/config/env';

export type EmailResult = { ok: true; pending: string } | { ok: false; error: string } | undefined;

/**
 * Смена адреса почты.
 *
 * Почта здесь не просто контакт: это логин. Для покупателя, оплатившего без
 * регистрации, адрес вообще берётся из формы Stripe, и опечатка в домене
 * превращалась в аккаунт, куда не войти и который не восстановить — чинилось
 * только руками через базу.
 *
 * Supabase меняет адрес не сразу: он отправляет письмо со ссылкой на НОВЫЙ
 * адрес, и до перехода по ней логином остаётся старый. Это правильно и
 * специально не обходится — иначе опечатка мгновенно отрезала бы человека от
 * оплаченного курса, а подтверждение как раз и доказывает, что ящик
 * существует и принадлежит ему.
 */
export async function changeEmail(_prev: EmailResult, formData: FormData): Promise<EmailResult> {
  const user = await requireUser();
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();

  if (!email || !email.includes('@')) return { ok: false, error: 'Введи корректный адрес почты.' };
  if (email === user.email?.toLowerCase()) {
    return { ok: false, error: 'Это твой текущий адрес.' };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser(
    { email },
    { emailRedirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent('/app')}` },
  );

  if (error) {
    /*
      Адрес уже занят другим аккаунтом — единственная ошибка, которую стоит
      назвать своими словами: без неё человек будет раз за разом вводить тот
      же адрес, не понимая, почему письмо не приходит. Проверять чужие адреса
      через эту форму нельзя — она доступна только вошедшему.
    */
    if (error.code === 'email_exists' || error.message.toLowerCase().includes('already')) {
      return { ok: false, error: 'На этот адрес уже зарегистрирован другой аккаунт.' };
    }

    console.error('[account] смена почты не удалась', error);
    return { ok: false, error: 'Не получилось отправить письмо. Попробуй ещё раз через минуту.' };
  }

  return { ok: true, pending: email };
}
