'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/Button';
import type { AuthResult } from '@/app/auth/actions';

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? 'Секунду…' : label}
    </Button>
  );
}

export function AuthForm({
  mode,
  action,
  next,
}: {
  mode: 'login' | 'register';
  action: (prev: AuthResult, formData: FormData) => Promise<AuthResult>;
  /** Where to land after a successful sign-in. Set by proxy.ts on the bounce. */
  next?: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const isRegister = mode === 'register';
  const pendingConfirmation = state?.code === 'email_not_confirmed';

  return (
    <form action={formAction} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <label className="block">
        <span className="eyebrow">Почта</span>
        <input
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          className="field mt-2"
        />
      </label>

      <label className="block">
        <span className="eyebrow">Пароль</span>
        <input
          name="password"
          type="password"
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          required
          minLength={isRegister ? 8 : undefined}
          className="field mt-2"
        />
        {isRegister ? <span className="mt-2 block text-sm text-slate">Минимум 8 символов</span> : null}
      </label>

      {/*
        An unconfirmed account is not a red-box failure — the user did nothing
        wrong and there is exactly one thing to do about it. Blue border, and a
        way out rather than a dead end.
      */}
      {state?.error ? (
        <div
          role="alert"
          className={`notice ${pendingConfirmation ? 'notice-gold' : 'notice-bad'}`}
        >
          <p>{state.error}</p>
          {pendingConfirmation ? (
            <p className="mt-2 font-normal text-slate">
              Не нашёл письмо?{' '}
              <Link href="/register/check-email" className="font-bold text-gold-deep underline">
                Отправить ещё раз
              </Link>
            </p>
          ) : null}
        </div>
      ) : null}

      <Submit label={isRegister ? 'Создать аккаунт' : 'Войти'} />

      <p className="pt-2 text-center text-slate">
        {isRegister ? 'Уже есть аккаунт? ' : 'Ещё нет аккаунта? '}
        <Link href={isRegister ? '/login' : '/register'} className="font-bold text-gold-deep underline">
          {isRegister ? 'Войти' : 'Создать'}
        </Link>
      </p>
    </form>
  );
}
