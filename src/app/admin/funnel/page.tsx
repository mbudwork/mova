import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/States';
import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Owner funnel report, extended with locale (RU/UA) since traffic is now
 * split by ad language. Still one question, still not a BI tool: of the
 * people the ads brought, how many reached each stage, by campaign and
 * locale.
 */
export default async function FunnelPage({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string }>;
}) {
  await requireAdmin();
  const { locale } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const activeLocale = locale && locale !== 'all' ? locale : undefined;
  const { data, error } = await supabase.rpc('funnel_summary', { p_locale: activeLocale });

  const rows = data ?? [];

  return (
    <Screen>
      <ScreenHeader title="Воронка" back="/admin" />
      <p className="-mt-2 mb-4 text-slate">За последние 30 дней, по кампаниям.</p>

      <div className="mb-5 flex gap-2">
        {[
          { value: 'all', label: 'Все языки' },
          { value: 'ru', label: 'RU' },
          { value: 'uk', label: 'UA' },
        ].map((option) => (
          <a
            key={option.value}
            href={option.value === 'all' ? '/admin/funnel' : `/admin/funnel?locale=${option.value}`}
            className={[
              'rounded-full border-2 px-4 py-2 text-sm font-bold',
              (locale ?? 'all') === option.value
                ? 'border-ink bg-ink text-concrete'
                : 'border-concrete-deep bg-paper',
            ].join(' ')}
          >
            {option.label}
          </a>
        ))}
      </div>

      {error || rows.length === 0 ? (
        <EmptyState
          title="Событий пока нет"
          hint="Данные появятся, как только на лендинг придёт первый посетитель."
        />
      ) : (
        <div className="space-y-4">
          {rows.map((row) => {
            const views = Number(row.landing_views ?? 0);
            const started = Number(row.tests_started ?? 0);
            const completed = Number(row.tests_completed ?? 0);
            const offers = Number(row.offers_viewed ?? 0);
            const clicks = Number(row.purchase_clicks ?? 0);
            const purchases = Number(row.purchases ?? 0);
            const rate = (value: number) => (views > 0 ? Math.round((value / views) * 100) : 0);

            return (
              <section
                key={`${row.utm_campaign ?? 'none'}-${row.landing_locale ?? 'unknown'}`}
                className="rounded-[14px] bg-paper p-4"
              >
                <h2 className="text-lg font-bold">
                  {row.utm_campaign ?? '(без кампании)'}{' '}
                  <span className="text-sm font-normal text-slate">
                    · {(row.landing_locale ?? 'unknown').toUpperCase()}
                  </span>
                </h2>
                <dl className="mt-3 space-y-2">
                  {[
                    ['Посетители', views, 100],
                    ['Начали тест', started, rate(started)],
                    ['Прошли тест', completed, rate(completed)],
                    ['Увидели оффер', offers, rate(offers)],
                    ['Нажали покупку', clicks, rate(clicks)],
                    ['Оплатили', purchases, rate(purchases)],
                  ].map(([label, value, percent]) => (
                    <div key={String(label)} className="flex items-center gap-3">
                      <dt className="w-32 shrink-0 text-sm text-slate">{label}</dt>
                      <dd className="flex flex-1 items-center gap-2">
                        <span
                          aria-hidden
                          className="h-3 rounded-full bg-signal"
                          style={{ width: `${Math.max(Number(percent), 2)}%` }}
                        />
                        <span className="text-sm font-bold tabular-nums">
                          {Number(value)} · {Number(percent)}%
                        </span>
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            );
          })}
        </div>
      )}
    </Screen>
  );
}
