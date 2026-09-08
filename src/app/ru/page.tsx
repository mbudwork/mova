import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { hasFullAccess } from '@/lib/auth/guards';
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
  /*
    Кто уже купил, не должен видеть страницу продажи.

    Купивший открывает сайт из закладки, из старой ссылки в рекламе или по
    ссылке от знакомого — и попадает в курс, а не в предложение купить то,
    что у него уже есть. Аноним и зарегистрированный без оплаты видят лендинг
    ровно как раньше, воронка не меняется.

    Условие именно на оплату, а не на «залогинен»: незаплатившему здесь ещё
    есть что купить.
  */
  if (await hasFullAccess()) redirect('/app');

  return <LandingPageContent locale="ru" />;
}
