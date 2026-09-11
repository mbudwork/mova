import type { Metadata } from 'next';
import { DiagnosticFlow } from '@/components/landing/DiagnosticFlow';
import { EmptyState } from '@/components/ui/States';
import { Screen } from '@/components/ui/Screen';
import { landingRoutes } from '@/lib/landing-routes';
import { getDiagnostic } from '@/lib/content/diagnostic';

export const metadata: Metadata = {
  title: 'MOVA — что сказал прораб?',
  description: 'Семь настоящих команд с немецкой стройки. Две минуты, без регистрации.',
};

export const dynamic = 'force-dynamic';

/**
 * Public by design: no account, no email wall, no paid content. Reads only
 * the diagnostic snapshot — never `phrases` — so opening this to anonymous
 * visitors does not open the course.
 */
export default async function DiagnosticPage() {
  const locale = 'uk' as const;
  const questions = await getDiagnostic(locale);
  const routes = landingRoutes(locale);

  if (questions.length === 0) {
    return (
      <main>
        <Screen>
          <div className="pt-12">
            <EmptyState title="Тест сейчас недоступен" hint="Попробуй обновить страницу через минуту." />
          </div>
        </Screen>
      </main>
    );
  }

  return (
    <main>
      <Screen>
        <DiagnosticFlow
          questions={questions}
          checkoutHref={routes.checkout}
          learnMoreHref="/uk#price"
        />
      </Screen>
    </main>
  );
}
