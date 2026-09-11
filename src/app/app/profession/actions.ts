'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireOnboarded } from '@/lib/auth/guards';

export type ChangeResult = { error: string } | undefined;

/**
 * Сохраняет набор профессий пользователя.
 *
 * Профессий может быть несколько. Схема это поддерживала с самого начала —
 * user_professions связь «многие ко многим», и accessible_lessons() раздаёт
 * доступ по любой строке, — но интерфейса не было, и набор менялся только
 * побочным эффектом онбординга.
 *
 * Прогресс при этом никуда не девается ни при каком раскладе: phrase_progress
 * привязан к фразам, а не к профессиям. Снятая профессия убирает свои уроки из
 * курса, отмеченная обратно — возвращает их вместе с состоянием каждой фразы и
 * сроком следующего повторения.
 */
export async function changeProfession(_prev: ChangeResult, formData: FormData): Promise<ChangeResult> {
  const user = await requireOnboarded();

  const selected = formData.getAll('professionId').map(String).filter(Boolean);
  if (selected.length === 0) {
    return { error: 'Оставь хотя бы одну профессию — иначе курс останется без второй половины.' };
  }

  const primary = String(formData.get('primaryId') ?? '');
  // Основной считается отмеченная явно, иначе первая из выбранных: держать
  // профиль без primary_profession_id нельзя, на него завязан экран курса.
  const primaryId = selected.includes(primary) ? primary : selected[0]!;

  const supabase = await createSupabaseServerClient();

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ primary_profession_id: primaryId })
    .eq('id', user.id);

  if (profileError) {
    console.error('[profession] не удалось сохранить профиль', profileError);
    return { error: 'Не получилось сохранить. Попробуй ещё раз.' };
  }

  /*
    Сначала удаляем снятые, потом добавляем выбранные. Обратный порядок на
    короткое время оставил бы пользователя вообще без профессий, и параллельный
    запрос к accessible_lessons() увидел бы курс без второй половины.
  */
  const { error: deleteError } = await supabase
    .from('user_professions')
    .delete()
    .eq('user_id', user.id)
    .not('profession_id', 'in', `(${selected.join(',')})`);

  if (deleteError) console.error('[profession] не удалось снять лишние', deleteError);

  const { error: linkError } = await supabase.from('user_professions').upsert(
    selected.map((id) => ({
      user_id: user.id,
      profession_id: id,
      is_primary: id === primaryId,
    })),
  );

  if (linkError) {
    console.error('[profession] не удалось сохранить набор', linkError);
    return { error: 'Не получилось сохранить. Попробуй ещё раз.' };
  }

  revalidatePath('/app', 'layout');
  // Справочник профессий и объём курса закэшированы на пять минут. Без сброса
  // человек, только что сменивший специальность, увидел бы прежний итог.
  revalidateTag('course-scope', 'max');
  redirect('/app/lessons');
}
