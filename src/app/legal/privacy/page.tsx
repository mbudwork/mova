import { Screen, ScreenHeader } from '@/components/ui/Screen';

export const metadata = { robots: { index: false } };

export default function PrivacyPage() {
  return (
    <Screen>
      <ScreenHeader title="Конфиденциальность" back="/" />
      <p className="text-slate">
        Раздел готовится. Здесь будет описано, какие данные собирает MOVA — включая аналитику
        воронки и, при подключении, Meta Pixel — и как ими распоряжаются.
      </p>
    </Screen>
  );
}
