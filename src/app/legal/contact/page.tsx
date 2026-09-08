import { LegalDoc, LegalSection, SellerDetails } from '@/components/legal/LegalDoc';

export const metadata = { title: 'Контакты — MOVA' };

export default function ContactPage() {
  return (
    <LegalDoc title="Контакты и реквизиты" effective="8 сентября 2026 г.">
      <LegalSection heading="Продавец">
        <p>
          Стороной договора при покупке MOVA является MBUD sp. z o.o. Stripe выступает только
          платёжным провайдером и стороной договора не является.
        </p>
        <SellerDetails />
      </LegalSection>

      <LegalSection heading="Поддержка, жалобы, запросы по данным">
        <p>
          Все обращения — на <a href="mailto:info@mbud.agency">info@mbud.agency</a>. Это же адрес
          для жалоб на несоответствие сервиса договору, запросов о возврате и обращений по правам,
          предусмотренным GDPR.
        </p>
        <p>
          Чтобы ответить быстрее, укажите e-mail аккаунта, дату или примерное время покупки и
          описание проблемы. Скриншот помогает, если речь о технической ошибке.
        </p>
      </LegalSection>

      <LegalSection heading="Документы">
        <ul>
          <li>
            <a href="/legal/terms">Пользовательское соглашение</a>
          </li>
          <li>
            <a href="/legal/refund">Правила отказа и возврата</a>
          </li>
          <li>
            <a href="/legal/privacy">Политика конфиденциальности</a>
          </li>
          <li>
            <a href="/legal/cookies">Использование cookies</a>
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="Важно">
        <p>
          MOVA — языковой тренажёр. Он не заменяет профессиональную квалификацию,
          Sicherheitsunterweisung и официальный инструктаж по охране труда.
        </p>
      </LegalSection>
    </LegalDoc>
  );
}
