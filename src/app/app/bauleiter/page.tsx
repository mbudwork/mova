import { PlayButton } from '@/components/PlayButton';
import { ButtonLink } from '@/components/ui/Button';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { requireOnboarded } from '@/lib/auth/guards';

export const dynamic = 'force-dynamic';

/**
 * The mode that carries the product. PHASE 2 ships the frame; PHASE 4 wires
 * real audio and the answer step behind the same layout.
 */
export default async function BauleiterPage() {
  await requireOnboarded();

  return (
    <Screen>
      <ScreenHeader title="Что говорит прораб?" back="/app" />

      <div className="mt-8 flex justify-center">
        <PlayButton src={null} />
      </div>

      <p className="mt-10 text-center text-lg text-slate">
        Нажми и слушай. Сначала будет медленно и с переводом, дальше — как на объекте.
      </p>

      <div className="mt-10">
        <ButtonLink href="/app" size="lg" variant="quiet">
          На главную
        </ButtonLink>
      </div>
    </Screen>
  );
}
