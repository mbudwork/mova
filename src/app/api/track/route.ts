import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { FUNNEL_EVENTS, type FunnelEvent } from '@/lib/analytics/events';
import type { Json } from '@/types/database';

/**
 * Funnel event sink.
 *
 * The client proposes; the server decides. Event names are checked against the
 * known list, strings are length-capped, and `user_id` is taken from the
 * session rather than from the request body — a browser must not be able to
 * write events on someone else's behalf.
 */

const MAX_STRING = 200;
const KNOWN_EVENTS = new Set<string>(FUNNEL_EVENTS);

function clamp(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  return value.slice(0, MAX_STRING);
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const payload = body as {
    event?: string;
    properties?: Record<string, unknown>;
    attribution?: Record<string, unknown>;
  };

  if (!payload.event || !KNOWN_EVENTS.has(payload.event)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const attribution = payload.attribution ?? {};
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const device = clamp(attribution.deviceCategory);

  const { error } = await supabase.from('analytics_events').insert({
    user_id: user?.id ?? null,
    event_type: payload.event as FunnelEvent,
    payload: (payload.properties ?? {}) as Json,
    anonymous_id: clamp(attribution.anonymousId),
    session_id: clamp(attribution.sessionId),
    utm_source: clamp(attribution.utmSource),
    utm_medium: clamp(attribution.utmMedium),
    utm_campaign: clamp(attribution.utmCampaign),
    utm_content: clamp(attribution.utmContent),
    utm_term: clamp(attribution.utmTerm),
    landing_variant: clamp(attribution.landingVariant),
    landing_locale: clamp(attribution.landingLocale),
    device_category: device === 'mobile' || device === 'tablet' ? device : 'desktop',
    locale: clamp(attribution.locale),
  });

  if (error) {
    // Never surface a storage failure to the visitor; the funnel is not the
    // product.
    return NextResponse.json({ ok: false }, { status: 202 });
  }

  // When a visitor has just become a user, freeze the attribution that
  // brought him. Written once — later visits must not overwrite first touch.
  if (user) {
    await supabase.from('user_attribution').upsert(
      {
        user_id: user.id,
        anonymous_id: clamp(attribution.anonymousId),
        utm_source: clamp(attribution.utmSource),
        utm_medium: clamp(attribution.utmMedium),
        utm_campaign: clamp(attribution.utmCampaign),
        utm_content: clamp(attribution.utmContent),
        utm_term: clamp(attribution.utmTerm),
        landing_variant: clamp(attribution.landingVariant),
      },
      { onConflict: 'user_id', ignoreDuplicates: true },
    );
  }

  return NextResponse.json({ ok: true });
}
