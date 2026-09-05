import { Screen, ScreenHeader } from '@/components/ui/Screen';

export const metadata = { robots: { index: false } };

export default function CookiesPage() {
  return (
    <Screen>
      <ScreenHeader title="Файлы cookie" back="/" />
      <p className="text-slate">
        Раздел готовится. MOVA сохраняет технические идентификаторы для аналитики воронки
        (anonymous_id, session_id) и UTM-метки; полное описание появится здесь.
      </p>
    </Screen>
  );
}
