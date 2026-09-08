import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { hasFullAccess } from '@/lib/auth/guards';
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

  return <LandingPageContent locale="uk" />;
}
