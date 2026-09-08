import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/States';
import { PhraseResults } from '@/components/PhraseResults';
import { requireOnboarded } from '@/lib/auth/guards';
import { searchPhrases } from '@/lib/content/lookup';

export const dynamic = 'force-dynamic';

/**
 * "Быстро сказать" — the panic button.
 *
 * The situation this serves: a worker needs to say something to a German
 * colleague right now and cannot recall the phrase. So the flow is one field,
 * results immediately, and a tap that throws the German onto the whole screen
 * to be shown to another person. Search is a plain GET form — it works with no
 * JavaScript and survives a bad connection on site.
 *
 * Only phrases RLS lets this user read appear here, so this is never a way
 * around the paywall.
 */
export default async function SayPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const profile = await requireOnboarded();
  const { q = '' } = await searchParams;
  const results = q.trim().length >= 2 ? await searchPhrases(profile.uiLocale, q) : [];

  return (
    <Screen>
      <ScreenHeader title="Быстро сказать" back="/app" />

      <form action="/app/say">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="закончился клей"
          className="field"
          aria-label="Что нужно сказать"
          autoFocus
        />
      </form>

      <div className="mt-6">
        {q.trim().length < 2 ? (
          <EmptyState
            title="Напиши, что нужно сказать"
            hint="По-русски или по-немецки. Найдёшь фразу — покажешь её немцу на весь экран."
          />
        ) : results.length === 0 ? (
          <EmptyState
            title="Такой фразы нет"
            hint="Ищет только по проверенным фразам курса. Попробуй сказать это другими словами."
          />
        ) : (
          <PhraseResults phrases={results} />
        )}
      </div>
    </Screen>
  );
}
