import { ButtonLink } from '@/components/ui/Button';
import { ReviewSessionClient } from '@/components/ReviewSessionClient';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/States';
import { requireOnboarded } from '@/lib/auth/guards';
import { getListeningSession } from '@/lib/content/course';

export const dynamic = 'force-dynamic';

/**
 * The mode that carries the product: прораб говорит — что он сказал?
 *
 * Until now this page rendered `<PlayButton src={null} />` with a hardcoded
 * null — a frame from PHASE 2 that was never wired to content, so it always
 * showed "аудио ещё не записано" no matter how many clips existed. It now runs
 * a real drill over the phrases this learner can access.
 *
 * Unlike /app/review it does not depend on the spaced-repetition queue, which
 * is empty for someone who has just signed up. This mode has to work on the
 * very first session — it is the one people came for.
 */
export default async function BauleiterPage() {
  const profile = await requireOnboarded();
  const phrases = await getListeningSession(profile.uiLocale);

  if (phrases.length === 0) {
    return (
      <Screen>
        <ScreenHeader title="Что говорит прораб?" back="/app" />
        <EmptyState
          title="Пока нечего слушать"
          hint="Здесь появятся фразы с озвучкой из доступных тебе уроков."
          action={
            <ButtonLink href="/app" variant="ghost">
              На главную
            </ButtonLink>
          }
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="Что говорит прораб?" back="/app" />
      <p className="-mt-2 mb-4 text-slate">
        Нажми и слушай. Выбери, что он сказал — немецкий покажем после ответа.
      </p>
      <ReviewSessionClient phrases={phrases} />
    </Screen>
  );
}
