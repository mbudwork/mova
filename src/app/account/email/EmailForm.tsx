'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/Button';
import { changeEmail, type EmailResult } from './actions';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? 'Отправляю…' : 'Отправить письмо'}
    </Button>
  );
}

export function EmailForm({ current }: { current: string }) {
  const [state, formAction] = useActionState<EmailResult, FormData>(changeEmail, undefined);

  if (state?.ok) {
    return (
      <div className="space-y-4">
        <p className="notice notice-good">
          Письмо отправлено на <b>{state.pending}</b>.
        </p>
        <p className="text-slate">
          Открой его и нажми ссылку. До этого момента входить нужно старым адресом — так и
          задумано: пока новый ящик не подтверждён, опечатка в нём отрезала бы тебя от курса.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <span className="eyebrow">Сейчас</span>
        <p className="mt-1 text-lg font-bold">{current}</p>
      </div>

      <label className="block">
        <span className="eyebrow">Новый адрес</span>
        <input
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          className="field mt-2"
        />
      </label>

      {state && !state.ok ? (
        <p role="alert" className="notice notice-bad">
          {state.error}
        </p>
      ) : null}

      <Submit />
    </form>
  );
}
