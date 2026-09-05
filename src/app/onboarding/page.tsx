import { Screen } from '@/components/ui/Screen';
import { ErrorState } from '@/components/ui/States';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/guards';
import { OnboardingFlow, type ProfessionOption } from './OnboardingFlow';
import { completeOnboarding } from './actions';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  await requireUser();

  const supabase = await createSupabaseServerClient();

  // Two flat queries instead of an embedded select: PostgREST relationship
  // inference needs generated types, and joining seven rows in JS is cheaper
  // than pretending we have them.
  const [{ data: professionRows, error }, { data: nameRows }] = await Promise.all([
    supabase.from('professions').select('id, sort_order').eq('is_active', true).order('sort_order'),
    supabase.from('profession_translations').select('profession_id, name').eq('language_code', 'ru'),
  ]);

  if (error || !professionRows) {
    return (
      <main>
        <Screen>
          <div className="pt-10">
            <ErrorState
              title="Список профессий не загрузился"
              hint="Проверь интернет и обнови страницу."
            />
          </div>
        </Screen>
      </main>
    );
  }

  const names = new Map((nameRows ?? []).map((row) => [row.profession_id, row.name]));

  const professions: ProfessionOption[] = professionRows.map((row) => ({
    id: row.id,
    name: names.get(row.id) ?? 'Allgemein',
  }));

  return (
    <main>
      <Screen>
        <div className="pt-8">
          <OnboardingFlow professions={professions} action={completeOnboarding} />
        </div>
      </Screen>
    </main>
  );
}
