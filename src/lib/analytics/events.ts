/**
 * The funnel's vocabulary. Every event the product emits is named here, so a
 * typo becomes a type error rather than a hole in next month's report.
 */
export const FUNNEL_EVENTS = [
  'landing_view',
  'hero_test_click',
  'hero_buy_click',
  'hero_demo_play',

  'mini_test_audio_play',
  'mini_test_answer',

  'full_test_started',
  'test_question_audio_play',
  'test_question_answered',
  'test_completed',
  'test_result_viewed',

  'product_video_started',
  'product_video_25',
  'product_video_50',
  'product_video_75',
  'product_video_completed',

  'offer_viewed',
  'purchase_clicked',
  'checkout_started',
  'purchase_completed',

  'faq_opened',
  'locale_selected',
  'sticky_cta_click',

  'login',
  'onboarding_started',
  'onboarding_completed',
  'lesson_started',
  'lesson_completed',
  'pwa_install_prompt_viewed',
  'pwa_install_instruction_opened',

  // Retained from the previous funnel phase for backward compatibility with
  // any in-flight sessions; V2 code paths use the more specific names above.
  'demo_audio_play',
  'test_started',
  'pricing_viewed',
] as const;

export type FunnelEvent = (typeof FUNNEL_EVENTS)[number];

export type Attribution = {
  anonymousId: string;
  sessionId: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  landingVariant: string | null;
  landingLocale: string | null;
  deviceCategory: 'mobile' | 'tablet' | 'desktop';
  locale: string | null;
};

export type TrackPayload = {
  event: FunnelEvent;
  properties?: Record<string, string | number | boolean | null>;
  attribution: Attribution;
};

export const ATTRIBUTION_STORAGE_KEY = 'mova.attribution';
export const SESSION_STORAGE_KEY = 'mova.session';
