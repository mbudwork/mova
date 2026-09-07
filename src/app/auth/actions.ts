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

  /**
   * The whole bug lived on this line.
   *
   * With email confirmation enabled, signUp succeeds but returns no session:
   * the account exists and is unusable until the link is clicked. The old code
   * redirected to /onboarding regardless, proxy.ts saw an anonymous request
   * and bounced it to /login, and the user was left at a login form with no
   * idea that a letter had been sent at all.
   *
   * A null session is therefore not an error — it is the "check your inbox"
   * state, and it needs its own screen.
   *
   * This also covers the already-registered case: Supabase returns a user with
   * an empty identities array and no session, deliberately, so that signup
   * cannot be used to enumerate addresses. Same screen, same wording.
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

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}
