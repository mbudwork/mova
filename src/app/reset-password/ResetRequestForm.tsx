'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/Button';
import { requestPasswordReset, type AuthResult } from '@/app/auth/actions';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? 'Отправляю…' : 'Прислать ссылку'}
    </Button>
  );
}

export function ResetRequestForm() {
  const [state, formAction] = useActionState<AuthResult, FormData>(
    requestPasswordReset,
    undefined,
  );

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
          className="field mt-2"
        />
      </label>

      {state?.error ? (
        <p role="alert" className="notice notice-bad">
          {state.error}
        </p>
      ) : null}

      <Submit />
    </form>
  );
}
