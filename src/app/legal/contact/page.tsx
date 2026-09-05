import { Screen, ScreenHeader } from '@/components/ui/Screen';

export const metadata = { robots: { index: false } };

export default function ContactPage() {
  return (
    <Screen>
      <ScreenHeader title="Контакты" back="/" />
      <p className="text-slate">Раздел готовится. Реквизиты компании будут указаны здесь.</p>
    </Screen>
  );
}
