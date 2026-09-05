import type { Metadata } from 'next';
import { LandingPageContent } from '@/components/landing/LandingPageContent';

export const metadata: Metadata = {
  title: 'MOVA — понимай немецкого прораба на стройке',
  description:
    'Практический немецкий для стройки: реальные команды прораба, инструменты, материалы, размеры и рабочие ситуации. Проверь себя бесплатно.',
  openGraph: {
    title: 'MOVA — понимай немецкого прораба',
    description: 'Практический немецкий для стройки. Проверь себя бесплатно за 2 минуты.',
    type: 'website',
    locale: 'ru_RU',
    siteName: 'MOVA',
  },
  twitter: { card: 'summary_large_image', title: 'MOVA' },
};

export const dynamic = 'force-dynamic';

export default async function LandingPageRu() {
  return <LandingPageContent locale="ru" />;
}
