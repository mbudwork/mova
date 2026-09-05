'use client';

import {
  ATTRIBUTION_STORAGE_KEY,
  SESSION_STORAGE_KEY,
  type Attribution,
  type FunnelEvent,
} from './events';

/**
 * Client-side funnel tracking.
 *
 * Two identifiers, on purpose. `anonymousId` is written once on the first
 * visit and never changes — it is what lets a purchase in week three be
 * credited to the creative that brought the visitor in week one. `sessionId`
 * is per browsing session and is what makes "started the test twice" readable.
 *
 * UTM values are captured on first touch and then frozen: a visitor who
 * returns through a direct link must not have his original campaign
 * overwritten by nothing.
 */

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function detectDevice(): Attribution['deviceCategory'] {
  if (typeof window === 'undefined') return 'desktop';
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

function readParam(params: URLSearchParams, key: string): string | null {
  const value = params.get(key);
  return value && value.length <= 200 ? value : null;
}

export function getAttribution(): Attribution {
  const params = new URLSearchParams(window.location.search);

  let stored: Partial<Attribution> = {};
  try {
    const raw = window.localStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    if (raw) stored = JSON.parse(raw) as Partial<Attribution>;
  } catch {
    // Private mode or blocked storage: fall through to a fresh identity.
  }

  const hasNewCampaign = params.has('utm_source') || params.has('utm_campaign');

  const attribution: Attribution = {
    anonymousId: stored.anonymousId ?? randomId(),
    sessionId: '',
    // First touch wins unless this visit genuinely carries new campaign data.
    utmSource: hasNewCampaign ? readParam(params, 'utm_source') : (stored.utmSource ?? null),
    utmMedium: hasNewCampaign ? readParam(params, 'utm_medium') : (stored.utmMedium ?? null),
    utmCampaign: hasNewCampaign ? readParam(params, 'utm_campaign') : (stored.utmCampaign ?? null),
    utmContent: hasNewCampaign ? readParam(params, 'utm_content') : (stored.utmContent ?? null),
    utmTerm: hasNewCampaign ? readParam(params, 'utm_term') : (stored.utmTerm ?? null),
    landingVariant: readParam(params, 'v') ?? stored.landingVariant ?? null,
    landingLocale: stored.landingLocale ?? null,
    deviceCategory: detectDevice(),
    locale: typeof navigator !== 'undefined' ? navigator.language : null,
  };

  try {
    let sessionId = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!sessionId) {
      sessionId = randomId();
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    }
    attribution.sessionId = sessionId;

    const { deviceCategory: _d, locale: _l, sessionId: _s, ...durable } = attribution;
    window.localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(durable));
  } catch {
    attribution.sessionId = randomId();
  }

  return attribution;
}

/** Events already sent this page load, so a re-render cannot double-count. */
const sentOnce = new Set<string>();

export function track(
  event: FunnelEvent,
  properties: Record<string, string | number | boolean | null> = {},
  options: { once?: boolean } = {},
): void {
  if (typeof window === 'undefined') return;

  if (options.once) {
    const key = `${event}:${JSON.stringify(properties)}`;
    if (sentOnce.has(key)) return;
    sentOnce.add(key);
  }

  const body = JSON.stringify({ event, properties, attribution: getAttribution() });

  // sendBeacon survives the page being closed by a tap on the CTA, which is
  // exactly when the most valuable events fire.
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }));
      return;
    }
  } catch {
    // fall through to fetch
  }

  void fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    // Analytics must never break the product.
  });
}

/** Called once by each locale-specific landing page to record which locale was actually shown. */
export function setLandingLocale(locale: string): void {
  try {
    const raw = window.localStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    const stored = raw ? JSON.parse(raw) : {};
    stored.landingLocale = locale;
    window.localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Storage unavailable — locale still gets attached per-event via the caller.
  }
}
