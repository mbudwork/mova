import { ButtonLink } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';

export default function OfflinePage() {
  return (
    <Screen>
      <div className="flex min-h-[70vh] flex-col justify-center gap-6">
        <p className="eyebrow">Офлайн-режим</p>
        <h1 className="text-2xl font-extrabold">Нет интернета</h1>
        <p className="text-slate">
          Уроки, которые ты уже открывал, доступны без сети. Новые загрузятся, когда появится связь.
        </p>
        <ButtonLink href="/app" size="lg" variant="quiet">
          К загруженным урокам
        </ButtonLink>
      </div>
    </Screen>
  );
}
