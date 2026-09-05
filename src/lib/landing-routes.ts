import type { Locale } from './locale';
import { localePath } from './locale';

/**
 * One named destination per CTA, resolved from a single place. The audit
 * found buttons whose label promised one destination ("Получить доступ")
 * while the href silently pointed somewhere else ("/test"). Routing every
 * CTA through this module makes that class of bug a wrong key in an object
 * literal — checkable by a unit test — instead of a JSX href easy to miss
 * in review.
 */
export function landingRoutes(locale: Locale) {
  return {
    test: localePath(locale, '/test'),
    checkout: localePath(locale, '/checkout'),
    home: localePath(locale, ''),
  };
}

/** The contract a unit test checks: label intent → the route it must resolve to. */
export const CTA_CONTRACT = {
  hero_primary: { label: 'Проверить себя бесплатно', route: 'test' },
  hero_moment_followup: { label: 'Пройти тест из 7 команд', route: 'test' },
  showcase_cta: { label: 'Проверить, сколько поймёшь ты', route: 'test' },
  offer_primary: { label: 'Получить доступ', route: 'checkout' },
  result_primary: { label: 'Получить полный доступ', route: 'checkout' },
  final_cta: { label: 'Пройти бесплатный тест', route: 'test' },
} as const;

export type CtaKey = keyof typeof CTA_CONTRACT;
