'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/Button';
import { setPassword, type PasswordResult } from './actions';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? 'Сохраняю…' : 'Сохранить пароль'}
    </Button>
  );
}

/**
 * Единственный момент, когда покупатель без регистрации может задать пароль
 * не через почту: он уже внутри по одноразовому входу. Пропустить можно, и
 * форма об этом честно предупреждает.
 */
export function SetPasswordForm() {
  const [state, formAction] = useActionState<PasswordResult, FormData>(setPassword, undefined);

  if (state?.ok) {
    return (
      <p className="notice notice-good">Пароль сохранён — теперь можно входить с любого телефона.</p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <p className="text-lg font-bold">Придумай пароль</p>
        <p className="mt-1 text-slate">
          Чтобы заходить с другого телефона. Без него вернуться получится только через письмо на
          почту.
        </p>
      </div>

      <input
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
        placeholder="Минимум 8 символов"
        className="field"
        aria-label="Новый пароль"
      />

      {state?.error ? (
        <p role="alert" className="notice notice-bad">
          {state.error}
        </p>
      ) : null}

      <Submit />
    </form>
  );
}
