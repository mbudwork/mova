'use client';

import { useEffect } from 'react';
import { setLandingLocale, track } from '@/lib/analytics/client';
import type { Locale } from '@/lib/locale';

/** Records which locale route actually rendered, once per page load. */
export function LocaleInit({ locale }: { locale: Locale }) {
  useEffect(() => {
    setLandingLocale(locale);
    track('locale_selected', { locale }, { once: true });
    document.cookie = `mova_locale=${locale}; path=/; max-age=${60 * 60 * 24 * 180}; samesite=lax`;
  }, [locale]);

  return null;
}
