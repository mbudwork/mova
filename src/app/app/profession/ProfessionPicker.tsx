'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/Button';
import { changeProfession, type ChangeResult } from './actions';
import type { ProfessionChoice } from '@/lib/content/professions';

function Submit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending || disabled}>
      {pending ? 'Сохраняю…' : 'Сохранить'}
    </Button>
  );
}

export function ProfessionPicker({
  choices,
  currentId,
}: {
  choices: ProfessionChoice[];
  currentId: string | null;
}) {
  const [selected, setSelected] = useState<string | null>(currentId);
  const [state, formAction] = useActionState<ChangeResult, FormData>(changeProfession, undefined);

  return (
    <form action={formAction} className="space-y-3">
      {choices.map((choice) => {
        const checked = selected === choice.id;
        return (
          <label
            key={choice.id}
            className={`answer-opt min-h-[72px] cursor-pointer ${checked ? 'answer-opt-selected' : ''}`}
          >
            <input
              type="radio"
              name="professionId"
              value={choice.id}
              checked={checked}
              onChange={() => setSelected(choice.id)}
              className="sr-only"
            />
            <span aria-hidden className="answer-mark">
              {checked ? '✓' : '›'}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold">{choice.name}</span>
              {/*
                Объём подписан числами из базы, а не словами. «Разнорабочий»
                честно показывает, что своих уроков у него нет, — человек
                выбирает его осознанно, а не потому что вариант стоял первым.
              */}
              <span className="mt-0.5 block text-sm font-normal opacity-80">
                {choice.lessons > 0
                  ? `${choice.lessons} уроков · ${choice.phrases} фраз`
                  : 'Своих уроков пока нет — только общая часть'}
              </span>
            </span>
            {choice.id === currentId ? (
              <span className="text-xs font-bold uppercase tracking-wider opacity-70">сейчас</span>
            ) : null}
          </label>
        );
      })}

      {state?.error ? (
        <p role="alert" className="notice notice-bad">
          {state.error}
        </p>
      ) : null}

      <div className="pt-3">
        <Submit disabled={!selected || selected === currentId} />
      </div>
    </form>
  );
}
