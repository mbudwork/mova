import type { MetadataRoute } from 'next';
import { env } from '@/lib/config/env';

/**
 * Сайт открыт для поисковиков, кроме личных и служебных разделов.
 *
 * Раньше здесь стоял сплошной Disallow — остаток времён, когда это была
 * закрытая review-сборка. Снимать запрет нужно было в двух местах: тут и в
 * заголовке X-Robots-Tag в netlify.toml. Заголовок сильнее: он действует,
 * даже когда краулер не читал robots.txt, так что один robots.ts ничего бы
 * не решил.
 *
 * Закрыто всё, что за входом или не несёт смысла в выдаче: личный кабинет,
 * админка, оплата, экраны аутентификации. Не из соображений секретности —
 * данные защищены RLS, а не robots.txt, — а чтобы поисковик не тратил обход
 * на страницы, которые всё равно отдадут редирект на вход.
 */
export default function robots(): MetadataRoute.Robots {
  const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/app',
          '/admin',
          '/onboarding',
          '/purchase',
          '/checkout',
          '/set-password',
          '/account',
          '/login',
          '/register',
          '/reset-password',
          '/auth',
          '/api',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
