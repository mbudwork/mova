import { describe, expect, it } from 'vitest';
import { CTA_CONTRACT, landingRoutes } from './landing-routes';

describe('CTA routing contract', () => {
  const routes = landingRoutes('ru');

  it('never points a "get access" style CTA at the free test', () => {
    for (const [key, cta] of Object.entries(CTA_CONTRACT)) {
      const looksLikeOffer = /доступ/i.test(cta.label);
      if (looksLikeOffer) {
        expect(routes[cta.route], `${key} promises access but routes to ${cta.route}`).toBe(
          routes.checkout,
        );
      }
    }
  });

  it('never points a "test yourself" style CTA at checkout', () => {
    for (const [key, cta] of Object.entries(CTA_CONTRACT)) {
      const looksLikeTest = /провер|тест/i.test(cta.label);
      if (looksLikeTest) {
        expect(routes[cta.route], `${key} promises the test but routes to ${cta.route}`).toBe(
          routes.test,
        );
      }
    }
  });

  it('produces locale-prefixed paths for both supported locales', () => {
    expect(landingRoutes('ru').test).toBe('/ru/test');
    expect(landingRoutes('uk').test).toBe('/uk/test');
    expect(landingRoutes('uk').checkout).toBe('/uk/checkout');
  });
});
