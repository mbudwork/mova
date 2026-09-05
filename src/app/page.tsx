import { redirect } from 'next/navigation';

/**
 * The root path is not a page — it is the RU landing's canonical location's
 * fallback. Ads deep-link straight to /ru or /uk (see MOVA_LANDING_V2_STRATEGY
 * §14); anyone landing on bare "/" gets the Russian version, with the query
 * string (UTM params) preserved.
 */
export default async function RootRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') qs.set(key, value);
  }
  const suffix = qs.toString();
  redirect(`/ru${suffix ? `?${suffix}` : ''}`);
}
