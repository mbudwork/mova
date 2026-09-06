import { ButtonLink } from '@/components/ui/Button';
import { ReviewSessionClient } from '@/components/ReviewSessionClient';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/States';
import { requireOnboarded } from '@/lib/auth/guards';
import { getReviewSession } from '@/lib/content/course';

export const dynamic = 'force-dynamic';

/**
 * Real, no longer a stub: pulls this user's actual due/weak phrases from
 * phrase_progress via due_review_phrases() and runs the same scored
 * exercise the lesson uses. An empty result now means "nothing is due",
 * which is a genuine state, not a hardcoded message.
 */
export default async function ReviewPage() {
  const profile = await requireOnboarded();
  const phrases = await getReviewSession(profile.uiLocale);

  return (
    <Screen>
      <ScreenHeader title="Повторение" back="/app" />
      {phrases.length === 0 ? (
        <EmptyState
          title="Пока нечего повторять"
          hint="Фразы, которые пора повторить, появятся здесь сами — по расписанию или если ты в них ошибся."
          action={
            <ButtonLink href="/app" variant="quiet">
              К урокам
            </ButtonLink>
          }
        />
      ) : (
        <ReviewSessionClient phrases={phrases} />
      )}
    </Screen>
  );
}
