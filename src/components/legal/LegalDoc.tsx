import type { ReactNode } from 'react';
import { Screen, ScreenHeader } from '@/components/ui/Screen';

/**
 * Оболочка для юридических документов.
 *
 * Дата версии показывается явно и вверху: для документов, на которые ссылается
 * договор, важно, какая редакция действовала в момент покупки.
 */
export function LegalDoc({
  title,
  effective,
  children,
}: {
  title: string;
  effective: string;
  children: ReactNode;
}) {
  return (
    <Screen>
      <ScreenHeader title={title} back="/" />
      <p className="-mt-2 mb-8 text-sm text-slate">Редакция от {effective}</p>
      <div className="legal-doc">{children}</div>
    </Screen>
  );
}

export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2>{heading}</h2>
      {children}
    </section>
  );
}

/** Реквизиты продавца. Один источник — чтобы они не разошлись между страницами. */
export function SellerDetails() {
  return (
    <address className="not-italic">
      MBUD sp. z o.o.
      <br />
      Ksawerów 3, 02-656 Warszawa, Polska
      <br />
      KRS 0000815662 · NIP 9522202055 · REGON 384966966
      <br />
      E-mail:{' '}
      <a href="mailto:info@mbud.agency" className="font-bold text-gold-deep underline">
        info@mbud.agency
      </a>
      <br />
      Сайт: mbud.de
    </address>
  );
}
