import { ButtonLink } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';

export default function NotFound() {
  return (
    <Screen>
      <div className="flex min-h-[70vh] flex-col justify-center gap-6">
        <p className="eyebrow">Страница не найдена</p>
        <h1 className="de-phrase">Такой страницы нет</h1>
        <ButtonLink href="/app" size="lg">
          На главную
        </ButtonLink>
      </div>
    </Screen>
  );
}
