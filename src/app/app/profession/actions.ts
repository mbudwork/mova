'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireOnboarded } from '@/lib/auth/guards';

export type ChangeResult = { error: string } | undefined;

/**
 * Смена профессии после онбординга.
 *
 * Прогресс не трогается намеренно. Ответы привязаны к фразам, а не к урокам,
 * и общая часть у всех профессий одна: человек, переходивший из
 * гипсокартонщиков в маляры, не должен терять полторы сотни выученных общих
 * команд. Уроки прежней специальности просто уходят из доступных, а если он
 * вернётся обратно — прогресс по ним окажется на месте.
 */
export async function changeProfession(_prev: ChangeResult, formData: FormData): Promise<ChangeResult> {
  const user = await requireOnboarded();
  const professionId = String(formData.get('professionId') ?? '');
  if (!professionId) return { error: 'Выбери профессию.' };

  const supabase = await createSupabaseServerClient();

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ primary_profession_id: professionId })
    .eq('id', user.id);

  if (profileError) {
    console.error('[profession] не удалось сохранить', profileError);
    return { error: 'Не получилось сохранить. Попробуй ещё раз.' };
  }

  /*
    user_professions хранит связь для accessible_lessons(), и там же лежит
    флаг is_primary. Старую основную снимаем явно: без этого у человека
    оказались бы две «основные» профессии, и в доступные уроки попали бы обе —
    ровно та мешанина, из-за которой плиточнику прилетали команды электрика.
  */
  await supabase
    .from('user_professions')
    .update({ is_primary: false })
    .eq('user_id', user.id)
    .neq('profession_id', professionId);

  const { error: linkError } = await supabase
    .from('user_professions')
    .upsert({ user_id: user.id, profession_id: professionId, is_primary: true });

  if (linkError) {
    console.error('[profession] не удалось связать профессию', linkError);
    return { error: 'Не получилось сохранить. Попробуй ещё раз.' };
  }

  revalidatePath('/app', 'layout');
  redirect('/app/lessons');
}
