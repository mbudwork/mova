'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type AuthResult = { error: string } | undefined;

function readCredentials(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  return { email, password };
}

export async function signIn(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const { email, password } = readCredentials(formData);
  if (!email || !password) return { error: 'Введи почту и пароль.' };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  // Deliberately vague: a precise message would let anyone probe which emails
  // are registered.
  if (error) return { error: 'Почта или пароль не подходят.' };

  revalidatePath('/', 'layout');
  redirect('/app');
}

export async function signUp(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const { email, password } = readCredentials(formData);
  if (!email) return { error: 'Введи почту.' };
  if (password.length < 8) return { error: 'Пароль — минимум 8 символов.' };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({ email, password });

  if (error) return { error: 'Не получилось создать аккаунт. Проверь почту и попробуй ещё раз.' };

  revalidatePath('/', 'layout');
  redirect('/onboarding');
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}
