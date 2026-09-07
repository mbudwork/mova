'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/Button';
import { SELF_LEVEL_LABELS, type SelfReportedLevel } from '@/types/domain';
import type { OnboardingResult } from '@/app/onboarding/actions';

export type ProfessionOption = { id: string; name: string };

const LEVEL_ORDER: SelfReportedLevel[] = ['none', 'words', 'simple_commands', 'some_speaking'];

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? 'Сохраняю…' : 'Готово'}
    </Button>
  );
}

function Choice({
  checked,
  children,
  ...input
}: { checked: boolean; children: React.ReactNode } & React.ComponentProps<'input'>) {
  return (
    <label
      className={[
        'flex min-h-[68px] cursor-pointer items-center gap-4 rounded-[18px] border-2 px-4 py-3 text-lg',
        checked ? 'border-ink bg-gold font-bold' : 'border-cream-deep bg-paper',
      ].join(' ')}
    >
      <input {...input} checked={checked} className="sr-only" />
      <span
        aria-hidden
        className={[
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2',
          checked ? 'border-ink bg-ink text-gold-deep' : 'border-cream-deep',
        ].join(' ')}
      >
        {checked ? '✓' : ''}
      </span>
      <span>{children}</span>
    </label>
  );
}

export function OnboardingFlow({
  professions,
  action,
}: {
  professions: ProfessionOption[];
  action: (prev: OnboardingResult, formData: FormData) => Promise<OnboardingResult>;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const [step, setStep] = useState<0 | 1>(0);
  const [level, setLevel] = useState<SelfReportedLevel | null>(null);
  const [professionId, setProfessionId] = useState<string | null>(null);

  return (
    <form action={formAction}>
      <p className="eyebrow">Шаг {step + 1} из 2</p>

      {step === 0 ? (
        <section className="mt-4">
          <h1 className="text-2xl font-extrabold leading-tight">Какой у тебя немецкий?</h1>
          <div className="mt-6 space-y-3">
            {LEVEL_ORDER.map((value) => (
              <Choice
                key={value}
                type="radio"
                name="level"
                value={value}
                checked={level === value}
                onChange={() => setLevel(value)}
              >
                {SELF_LEVEL_LABELS[value]}
              </Choice>
            ))}
          </div>
          <div className="mt-8">
            <Button type="button" size="lg" disabled={!level} onClick={() => setStep(1)}>
              Дальше
            </Button>
          </div>
        </section>
      ) : (
        <section className="mt-4">
          <h1 className="text-2xl font-extrabold leading-tight">Кем ты работаешь?</h1>
          <p className="mt-2 text-slate">Потом можно добавить ещё профессии.</p>
          <div className="mt-6 space-y-3">
            {professions.map((profession) => (
              <Choice
                key={profession.id}
                type="radio"
                name="professionId"
                value={profession.id}
                checked={professionId === profession.id}
                onChange={() => setProfessionId(profession.id)}
              >
                {profession.name}
              </Choice>
            ))}
          </div>

          {state?.error ? (
            <p role="alert" className="mt-6 notice notice-bad">
              {state.error}
            </p>
          ) : null}

          <div className="mt-8 space-y-3">
            <Submit />
            <Button type="button" variant="ghost" onClick={() => setStep(0)}>
              Назад
            </Button>
          </div>
        </section>
      )}

      {/* Keep the first answer in the form when the second step is showing. */}
      {step === 1 && level ? <input type="hidden" name="level" value={level} /> : null}
    </form>
  );
}
