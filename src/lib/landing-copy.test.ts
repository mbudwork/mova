import { describe, expect, it } from 'vitest';
import { LANDING_COPY } from './landing-copy';
import { LOCALES } from './locale';
import { stickyLabel } from '@/components/landing/StickyCta';

describe('landing copy', () => {
  it('provides every locale the app supports', () => {
    for (const locale of LOCALES) {
      expect(LANDING_COPY[locale]).toBeDefined();
    }
  });

  it('marks Russian as reviewed and Ukrainian as a draft', () => {
    expect(LANDING_COPY.ru.reviewed).toBe(true);
    expect(LANDING_COPY.uk.reviewed).toBe(false);
  });

  it('never leaves a Ukrainian field silently falling back to an untranslated key at the type level', () => {
    // Fields intentionally inherited via {...ru} (e.g. showcaseSteps) are a
    // deliberate scope decision documented in the strategy; this test exists
    // to make future additions to LandingCopy conscious rather than accidental.
    const ruKeys = Object.keys(LANDING_COPY.ru);
    const ukKeys = Object.keys(LANDING_COPY.uk);
    expect(ukKeys.sort()).toEqual(ruKeys.sort());
  });
});

describe('sticky CTA label', () => {
  const copy = { stickyTest: 'Проверить себя', stickyOffer: 'Получить MOVA' };

  it('invites the test before completion', () => {
    expect(stickyLabel(false, copy)).toBe('Проверить себя');
  });

  it('invites the offer after completion', () => {
    expect(stickyLabel(true, copy)).toBe('Получить MOVA');
  });
});
