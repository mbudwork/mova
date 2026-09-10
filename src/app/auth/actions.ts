'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { env } from '@/lib/config/env';

/**
 * `code` lets the form render something other than a red error box —
 * specifically the "письмо ждёт в почте" case, which is not a failure and
 * must not look like one.
 */
export type AuthResult = { error: string; code?: 'email_not_confirmed' } | undefined;

function readCredentials(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  return { email, password };
}

/**
 * Where Supabase sends the user after they click the link in the confirmation
 * email. Without this option Supabase falls back to the Site URL configured in
 * the dashboard — on a fresh project that is still http://localhost:3000, so
 * every link in every email is dead on arrival.
 */
function confirmationRedirect(next = '/onboarding') {
  return `${env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`;
}

/** Same-origin paths only: `//evil.com` is a valid path and an open redirect. */
function safeNext(value: FormDataEntryValue | null): string {
  const next = String(value ?? '');
  return next.startsWith('/') && !next.startsWith('//') ? next : '/app';
}

export async function signIn(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const { email, password } = readCredentials(formData);
  if (!email || !password) return { error: 'Введи почту и пароль.' };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    /**
     * An unconfirmed email is not a wrong password, and saying so is not an
     * enumeration leak: Supabase returns a distinct error code for it, so
     * anyone probing the API gets that signal anyway. Flattening it here only
     * misled the actual account owner — which is exactly what happened. The
     * user registered, got bounced to /login, typed the correct password, and
     * was told it was wrong.
     */
    if (error.code === 'email_not_confirmed') {
      return {
        error: 'Аккаунт создан, но почта ещё не подтверждена. Открой письмо и нажми ссылку.',
        code: 'email_not_confirmed',
      };
    }

    // Everything else stays vague on purpose.
    return { error: 'Почта или пароль не подходят.' };
  }

  revalidatePath('/', 'layout');
  redirect(safeNext(formData.get('next')));
}

export async function signUp(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const { email, password } = readCredentials(formData);
  if (!email) return { error: 'Введи почту.' };
  if (password.length < 8) return { error: 'Пароль — минимум 8 символов.' };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: confirmationRedirect() },
  });

  if (error) return { error: 'Не получилось создать аккаунт. Проверь почту и попробуй ещё раз.' };

  /*
    Регистрация прошла, но сессии нет. Причин ровно две, и обе ведут на один
    экран — потому что различить их для пользователя значило бы разгласить,
    занят адрес или свободен, а это превращает форму регистрации в способ
    проверять чужие почты.

      1. Подтверждение почты включено — аккаунт создан, но не активен, пока
         человек не нажмёт ссылку в письме.
      2. Адрес уже зарегистрирован. Supabase намеренно отвечает так же: отдаёт
         пользователя с пустым identities и без сессии, и НИКАКОГО письма при
         этом не шлёт — подтверждать нечего.

    Пока подтверждение выключено (а сейчас так), в жизни случается только
    второй вариант. Поэтому экран больше не обещает письмо: обещать его в
    случае, когда оно не отправлялось, — значит отправить человека ждать и
    искать в спаме то, чего нет. Вместо этого он предлагает войти или
    восстановить пароль, что работает в обеих ситуациях.
  */
  if (!data.session) {
    redirect('/register/check-email');
  }

  revalidatePath('/', 'layout');
  redirect('/onboarding');
}

/**
 * Supabase's built-in sender is rate-limited and its mail lands in spam often
 * enough that a resend button is not a nicety. Says nothing about whether the
 * address is registered.
 */
export async function resendConfirmation(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const email = String(formData.get('email') ?? '').trim();
  if (!email) return { error: 'Введи почту, на которую регистрировался.' };

  const supabase = await createSupabaseServerClient();
  await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: confirmationRedirect() },
  });

  redirect('/register/check-email?resent=1');
}

/**
 * Письмо со ссылкой на смену пароля.
 *
 * До сих пор восстановления не существовало вовсе: ни этого действия, ни
 * ссылки на входе. Человек, забывший пароль, попасть в оплаченный курс не мог
 * никак — только через ручную правку в базе. Для покупателя, у которого
 * аккаунт создан оплатой, это единственный запасной вход.
 *
 * Ответ всегда одинаковый, независимо от того, есть такой адрес или нет:
 * иначе форма превращается в способ проверять чужие адреса на регистрацию.
 */
export async function requestPasswordReset(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const email = String(formData.get('email') ?? '').trim();
  if (!email) return { error: 'Введи почту, на которую оформлял доступ.' };

  const supabase = await createSupabaseServerClient();
  await supabase.auth.resetPasswordForEmail(email, {
    // Ссылка ведёт в тот же обработчик, что и подтверждение почты: он меняет
    // одноразовый код на сессию, и уже в ней человек задаёт новый пароль.
    redirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent('/account/password')}`,
  });

  redirect('/reset-password?sent=1');
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}
