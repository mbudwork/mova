'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/guards';

export type PasswordResult = { ok: true } | { ok: false; error: string } | undefined;

/**
 * Задаёт пароль уже вошедшему пользователю. Работает только внутри активной
 * сессии — updateUser меняет того, чей JWT пришёл с запросом, поэтому чужой
 * пароль так подменить нельзя, даже зная адрес почты.
 */
export async function setPassword(_prev: PasswordResult, formData: FormData): Promise<PasswordResult> {
  await requireUser();

  const password = String(formData.get('password') ?? '');
  if (password.length < 8) return { ok: false, error: 'Пароль — минимум 8 символов.' };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    console.error('[purchase] set password failed', error);
    return { ok: false, error: 'Не получилось сохранить пароль. Попробуй ещё раз.' };
  }

  return { ok: true };
}
