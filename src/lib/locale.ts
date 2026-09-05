export const LOCALES = ['ru', 'uk'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'ru';
export const LOCALE_COOKIE = 'mova_locale';

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function localePath(locale: Locale, path: string): string {
  const clean = path.startsWith('/') ? path.slice(1) : path;
  return clean ? `/${locale}/${clean}` : `/${locale}`;
}
