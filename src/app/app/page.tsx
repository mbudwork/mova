import { ButtonLink } from '@/components/ui/Button';
import { RuleProgress } from '@/components/ui/RuleProgress';
import { signOut } from '@/app/auth/actions';
import { Screen } from '@/components/ui/Screen';
import { Tile } from '@/components/ui/Tile';
import { InstallHint } from '@/components/InstallHint';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireOnboarded } from '@/lib/auth/guards';
import { getCourseProgress, getNextLessonSlug } from '@/lib/content/course';
import { levelName } from '@/lib/levels';

export const dynamic = 'force-dynamic';

/**
 * Home is not a dashboard. One greeting, one measure of progress, one primary
 * action, five destinations. Everything else the product knows about the user
 * stays out of sight until it is actually useful.
 */
export default async function HomePage() {
  const profile = await requireOnboarded();
  const supabase = await createSupabaseServerClient();

  const [progress, nextSlug, { count: weakCount }] = await Promise.all([
    getCourseProgress(),
    getNextLessonSlug(),
    supabase
      .from('phrase_progress')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .eq('state', 'weak'),
  ]);

  const weak = weakCount ?? 0;
  const isNew = progress.lessonsCompleted === 0;
  const courseFinished = nextSlug === null && progress.lessonsTotal > 0;

  return (
    <Screen>
      <header className="pt-8">
        <p className="text-2xl font-extrabold">Привет 👋</p>
        <p className="mt-1 text-slate">
          {levelName(profile.currentLevel)} · сегодня 10 минут немецкого
        </p>
        <p className="mt-1 text-sm text-slate">
          Пройдено уроков: {progress.lessonsCompleted} из {progress.lessonsTotal}
        </p>
      </header>

      <div className="mt-6">
        <RuleProgress
          learned={progress.phrasesLearned}
          total={progress.phrasesTotal}
          label="Освоенные фразы"
        />
      </div>

      <div className="mt-6">
        {nextSlug ? (
          <ButtonLink href={`/app/lesson/${nextSlug}`} size="lg">
            {isNew ? 'Начать первый урок' : 'Продолжить'}
          </ButtonLink>
        ) : (
          <ButtonLink href="/app/bauleiter" size="lg">
            {courseFinished ? 'Слушать команды прораба' : 'Открыть полный доступ'}
          </ButtonLink>
        )}
      </div>

      {isNew ? (
        <p className="mt-4 text-center">
          <a
            href="/app/check"
            className="inline-block px-4 py-4 font-bold text-gold-deep underline"
          >
            Проверить мой уровень · около 2 минут
          </a>
        </p>
      ) : null}

      <nav className="mt-8 space-y-3">
        <Tile
          href="/app/bauleiter"
          glyph="👷"
          title="Что говорит прораб"
          hint="Слушай команды и понимай с первого раза"
        />
        <Tile
          href="/app/lessons"
          glyph="📚"
          title="Все уроки"
          hint="Общая часть и твоя профессия"
        />
        <Tile
          href="/app/review"
          glyph="🔁"
          title="Повторить слабые фразы"
          hint={weak > 0 ? `${weak} на повторении` : 'Пока нечего повторять'}
        />
      </nav>

      <InstallHint />

      {/*
        Выхода в интерфейсе не было вовсе: серверное действие signOut
        существовало, но ни к одной кнопке не подключалось. На общем телефоне
        сменить аккаунт было нельзя.
      */}
      <form action={signOut} className="pt-10 pb-4">
        <button type="submit" className="w-full py-4 text-center font-bold text-slate underline">
          Выйти
        </button>
      </form>

    </Screen>
  );
}
