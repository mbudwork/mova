import { Screen, ScreenHeader } from '@/components/ui/Screen';

export const metadata = { robots: { index: false } };

export default function TermsPage() {
  return (
    <Screen>
      <ScreenHeader title="Условия использования" back="/" />
      <p className="text-slate">
        Раздел готовится. Юридические реквизиты компании и полные условия появятся здесь до начала
        приёма платежей.
      </p>
    </Screen>
  );
}
