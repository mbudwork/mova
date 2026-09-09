import { DiagnosticFlow } from '@/components/landing/DiagnosticFlow';
import { ButtonLink } from '@/components/ui/Button';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/States';
import { requireOnboarded } from '@/lib/auth/guards';
import { getDiagnostic } from '@/lib/content/diagnostic';

export const dynamic = 'force-dynamic';

/**
 * Level check, on the same seven recordings as the public test.
 *
 * It used to offer only a "Пропустить" button next to a description of a test
 * that did not exist here — the questions were wired to the marketing funnel
 * and never to the account. Same content, same component; the difference is
 * that a logged-in learner finishes into the course rather than into checkout.
 *
 * Optional by design: nothing requires it, and skipping costs nothing. It is
 * for people who want to start further in.
 */
export default async function CheckPage() {
  const profile = await requireOnboarded();
  const locale = profile.uiLocale === 'uk' ? 'uk' : 'ru';
  const questions = await getDiagnostic(locale);

  if (questions.length === 0) {
    return (
      <Screen>
        <ScreenHeader title="Проверить уровень" back="/app" />
        <EmptyState
          title="Проверка сейчас недоступна"
          hint="Попробуй обновить страницу через минуту."
          action={
            <ButtonLink href="/app" variant="ghost">
              Начать урок
            </ButtonLink>
          }
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="Проверить уровень" back="/app" />
      <p className="-mt-2 mb-5 text-slate">
        Слушаешь и выбираешь, что от тебя хотят. Около двух минут. Можно пропустить — курс
        начнётся с самого начала.
      </p>
      {/* checkoutHref → /app: this learner has already paid, so finishing the
          check must lead into the course, never back to a purchase screen. */}
      <DiagnosticFlow
        questions={questions}
        checkoutHref="/app"
        ctaLabel="Продолжить курс"
        learnMoreHref={null}
      />
    </Screen>
  );
}
