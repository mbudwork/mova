import { ButtonLink } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';

export default function OfflinePage() {
  return (
    <Screen>
      <div className="flex min-h-[70vh] flex-col justify-center gap-6">
        <p className="eyebrow">Офлайн-режим</p>
        <h1 className="text-2xl font-extrabold">Нет интернета</h1>
        <p className="text-slate">
          Для занятий нужна связь: фразы и озвучка подгружаются с сервера. Как только интернет
          появится, продолжишь с того места, где остановился — прогресс сохранён.
        </p>
        <ButtonLink href="/app" size="lg" variant="ghost">
          К загруженным урокам
        </ButtonLink>
      </div>
    </Screen>
  );
}
