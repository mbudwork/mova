'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/Button';
import { changeProfession, type ChangeResult } from './actions';
import type { CoreScope, ProfessionChoice } from '@/lib/content/professions';
import { withPlural, FORMS } from '@/lib/plural';

function Submit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending || disabled}>
      {pending ? 'Сохраняю…' : 'Сохранить'}
    </Button>
  );
}

/**
 * Набор профессий, а не одна.
 *
 * Человек может освоить свою специальность и взяться за смежную — на стройке
 * это обычное дело. Прогресс по фразам общий, так что вторая профессия
 * начинается не с нуля: общая часть уже пройдена, добавляются только её
 * собственные уроки.
 */
export function ProfessionPicker({
  choices,
  selectedIds,
  primaryId,
  core,
}: {
  choices: ProfessionChoice[];
  selectedIds: string[];
  primaryId: string | null;
  core: CoreScope;
}) {
  const [selected, setSelected] = useState<string[]>(selectedIds);
  const [primary, setPrimary] = useState<string | null>(primaryId);
  const [state, formAction] = useActionState<ChangeResult, FormData>(changeProfession, undefined);

  function toggle(id: string) {
    setSelected((current) => {
      const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
      // Сняли основную — основной становится первая из оставшихся, иначе
      // профиль остался бы указывать на профессию, которой у человека нет.
      if (primary && !next.includes(primary)) setPrimary(next[0] ?? null);
      if (!primary && next.length > 0) setPrimary(next[0]!);
      return next;
    });
  }

  const picked = choices.filter((c) => selected.includes(c.id));
  const addedLessons = picked.reduce((sum, c) => sum + c.lessons, 0);
  const addedPhrases = picked.reduce((sum, c) => sum + c.phrases, 0);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="primaryId" value={primary ?? ''} />

      {choices.map((choice) => {
        const checked = selected.includes(choice.id);
        return (
          <label
            key={choice.id}
            className={`answer-opt min-h-[72px] cursor-pointer ${checked ? 'answer-opt-selected' : ''}`}
          >
            <input
              type="checkbox"
              name="professionId"
              value={choice.id}
              checked={checked}
              onChange={() => toggle(choice.id)}
              className="sr-only"
            />
            <span aria-hidden className="answer-mark">
              {checked ? '✓' : '+'}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold">{choice.name}</span>
              <span className="mt-0.5 block text-sm font-normal opacity-80">
                {choice.lessons > 0
                  ? `+${withPlural(choice.lessons, FORMS.lesson)} · +${withPlural(choice.phrases, FORMS.phrase)}`
                  : 'Своих уроков пока нет — только общая часть'}
              </span>
            </span>
            {checked && choice.id === primary ? (
              <span className="text-xs font-bold uppercase tracking-wider opacity-70">основная</span>
            ) : null}
          </label>
        );
      })}

      {/*
        Итог складывается прямо на экране. Без него человек видел только
        надстройку и не понимал, что покупает курс на три десятка уроков, а не
        на четыре.
      */}
      <div className="notice notice-gold">
        <span className="block font-bold">
          Итого у тебя: {withPlural(core.lessons + addedLessons, FORMS.lesson)} ·{' '}
          {withPlural(core.phrases + addedPhrases, FORMS.phrase)}
        </span>
        <span className="mt-1 block text-sm font-normal text-slate">
          {withPlural(core.lessons, FORMS.lesson)} общей части и{' '}
          {withPlural(addedLessons, FORMS.lesson)} по выбранным профессиям
        </span>
      </div>

      <p className="text-sm text-slate">
        Снятая профессия убирает свои уроки из курса, но прогресс по её фразам сохраняется —
        отметишь обратно, и он вернётся.
      </p>

      {state?.error ? (
        <p role="alert" className="notice notice-bad">
          {state.error}
        </p>
      ) : null}

      <div className="pt-2">
        <Submit disabled={selected.length === 0} />
      </div>
    </form>
  );
}
