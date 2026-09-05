import type { Metadata } from 'next';
import { LandingPageContent } from '@/components/landing/LandingPageContent';

export const metadata: Metadata = {
  title: 'MOVA — розумій німецького прораба на будівництві',
  description:
    'Практична німецька для будівництва: реальні команди прораба, інструменти, матеріали, розміри та робочі ситуації. Перевір себе безкоштовно.',
  openGraph: {
    title: 'MOVA — розумій німецького прораба',
    description: 'Практична німецька для будівництва. Перевір себе безкоштовно за 2 хвилини.',
    type: 'website',
    locale: 'uk_UA',
    siteName: 'MOVA',
  },
  twitter: { card: 'summary_large_image', title: 'MOVA' },
};

export const dynamic = 'force-dynamic';

export default async function LandingPageUk() {
  return <LandingPageContent locale="uk" />;
}
