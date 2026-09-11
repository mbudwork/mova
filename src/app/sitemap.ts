import type { MetadataRoute } from 'next';
import { env } from '@/lib/config/env';

/**
 * Карта сайта. Только публичные страницы — те же, что разрешены в robots.txt.
 *
 * Лендинги на двух языках объявлены друг для друга альтернативами: без этого
 * поисковик считает их отдельными страницами с похожим смыслом и сам решает,
 * какую показать, — обычно не ту.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  const now = new Date();

  const landing = (path: string, priority: number): MetadataRoute.Sitemap[number] => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority,
    alternates: {
      languages: {
        ru: `${base}/ru`,
        uk: `${base}/uk`,
      },
    },
  });

  return [
    landing('/', 1),
    landing('/ru', 1),
    landing('/uk', 0.8),
    { url: `${base}/ru/test`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/uk/test`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/legal/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/legal/refund`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/legal/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/legal/cookies`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/legal/contact`, lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
  ];
}
