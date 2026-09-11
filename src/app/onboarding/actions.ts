'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/guards';
import { trackServer } from '@/lib/analytics/server';
import type { SelfReportedLevel } from '@/types/domain';

const LEVELS: SelfReportedLevel[] = ['none', 'words', 'simple_commands', 'some_speaking'];

export type OnboardingResult = { error: string } | undefined;

/**
 * Two answers, one write, straight to Home. Onboarding exists to get the user
 * to their first useful audio, not to profile them.
 */
export async function completeOnboarding(
  _prev: OnboardingResult,
  formData: FormData,
): Promise<OnboardingResult> {
  const user = await requireUser();

  const rawLevel = String(formData.get('level') ?? '');
  const professionId = String(formData.get('professionId') ?? '');

  const level = LEVELS.find((value) => value === rawLevel);
  if (!level) {
    return { error: 'Выбери, как ты оцениваешь свой немецкий.' };
  }
  if (!professionId) {
    return { error: 'Выбери профессию.' };
  }

  const supabase = await createSupabaseServerClient();

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      self_level: level,
      primary_profession_id: professionId,
      onboarding_completed: true,
    })
    .eq('id', user.id);

  if (profileError) {
    return { error: 'Не получилось сохранить. Проверь интернет и нажми ещё раз.' };
  }

  // Additional professions can be added later from the profile screen; the
  // primary one is all onboarding asks for.
  await supabase
    .from('user_professions')
    .upsert({ user_id: user.id, profession_id: professionId, is_primary: true });

  /*
    Событие пишется с сервера, а не из формы: redirect() ниже уводит со
    страницы, и клиентский вызов успевал бы не всегда. До сих пор его не было
    совсем — при десяти пройденных онбордингах в таблице ноль записей, и
    посчитать долю дошедших от регистрации до первого урока было нечем.
  */
  await trackServer('onboarding_completed', { profession_id: professionId }, user.id);

  revalidatePath('/app');
  redirect('/app');
}
