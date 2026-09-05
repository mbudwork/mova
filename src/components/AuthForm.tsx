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
}: {
  mode: 'login' | 'register';
  action: (prev: AuthResult, formData: FormData) => Promise<AuthResult>;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const isRegister = mode === 'register';

  return (
    <form action={formAction} className="space-y-4">
      <label className="block">
        <span className="eyebrow">Почта</span>
        <input
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          className="mt-2 min-h-[60px] w-full rounded-[14px] border-2 border-concrete-deep bg-paper px-4 text-lg"
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
          className="mt-2 min-h-[60px] w-full rounded-[14px] border-2 border-concrete-deep bg-paper px-4 text-lg"
        />
        {isRegister ? <span className="mt-2 block text-sm text-slate">Минимум 8 символов</span> : null}
      </label>

      {state?.error ? (
        <p role="alert" className="rounded-[14px] border-l-8 border-rot bg-paper p-4 font-bold">
          {state.error}
        </p>
      ) : null}

      <Submit label={isRegister ? 'Создать аккаунт' : 'Войти'} />

      <p className="pt-2 text-center text-slate">
        {isRegister ? 'Уже есть аккаунт? ' : 'Ещё нет аккаунта? '}
        <Link href={isRegister ? '/login' : '/register'} className="font-bold text-blau underline">
          {isRegister ? 'Войти' : 'Создать'}
        </Link>
      </p>
    </form>
  );
}
