import Link from 'next/link';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/States';
import { requireOnboarded } from '@/lib/auth/guards';
import { searchVocabulary, vocabularyCategories } from '@/lib/content/lookup';

export const dynamic = 'force-dynamic';

/**
 * The dictionary, on real data.
 *
 * Search and filter live in the URL rather than in client state: a worker who
 * found «die Wasserwaage» can hand the link to a colleague or come back to it
 * from history, and the page needs no JavaScript to work at all — which
 * matters on a phone with one bar of signal on a construction site.
 */
export default async function DictionaryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string }>;
}) {
  const profile = await requireOnboarded();
  const { q = '', cat } = await searchParams;

  const [entries, categories] = await Promise.all([
    searchVocabulary(profile.uiLocale, q, cat),
    vocabularyCategories(),
  ]);

  return (
    <Screen>
      <ScreenHeader title="Словарь" back="/app" />

      <form action="/app/dictionary" className="space-y-3">
        {cat ? <input type="hidden" name="cat" value={cat} /> : null}
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="клей, Wasserwaage, раствор…"
          className="field"
          aria-label="Поиск по словарю"
        />
      </form>

      {categories.length > 0 ? (
        <div className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1">
          <Link
            href={q ? `/app/dictionary?q=${encodeURIComponent(q)}` : '/app/dictionary'}
            className={`pill ${cat ? '' : 'pill-active'}`}
          >
            Все
          </Link>
          {categories.map((name) => {
            const params = new URLSearchParams();
            if (q) params.set('q', q);
            params.set('cat', name);
            return (
              <Link
                key={name}
                href={`/app/dictionary?${params.toString()}`}
                className={`pill ${cat === name ? 'pill-active' : ''}`}
              >
                {name}
              </Link>
            );
          })}
        </div>
      ) : null}

      <div className="mt-6 space-y-3">
        {entries.length === 0 ? (
          <EmptyState
            title="Ничего не нашлось"
            hint="Попробуй другое слово или убери фильтр по категории."
          />
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="card p-5">
              <p className="text-xl font-bold leading-tight">
                {entry.article ? <span className="text-slate">{entry.article} </span> : null}
                {entry.german}
                {entry.plural ? <span className="text-slate"> · {entry.plural}</span> : null}
              </p>
              <p className="mt-1 text-lg">{entry.translation}</p>
              {entry.colloquial ? (
                <p className="mt-2 text-sm text-slate">{entry.colloquial}</p>
              ) : null}
            </div>
          ))
        )}
      </div>
    </Screen>
  );
}
