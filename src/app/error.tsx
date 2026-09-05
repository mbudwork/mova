'use client';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <Screen>
      <div className="flex min-h-[70vh] flex-col justify-center gap-6">
        <p className="eyebrow">Ошибка</p>
        <h1 className="text-2xl font-extrabold">Не получилось загрузить экран</h1>
        <p className="text-slate">
          Проверь интернет и попробуй ещё раз. Уже загруженные уроки работают без сети.
        </p>
        <Button size="lg" onClick={reset}>
          Попробовать ещё раз
        </Button>
      </div>
    </Screen>
  );
}
