'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/guards';
import { checkoutMode } from '@/lib/pricing';

export type LeadResult = { ok: true } | { ok: false; error: string };

/**
 * Records purchase intent. This does NOT grant an entitlement and does NOT
 * emit purchase_completed — those only happen from a verified Stripe webhook
 * in a later phase. What it does: prove, honestly, that checkout was started
 * by someone real, so a manual follow-up (or a later Stripe migration) has
 * something to act on.
 */
export async function submitCheckoutLead(locale: string): Promise<LeadResult> {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  if (checkoutMode === 'stripe') {
    return { ok: false, error: 'Stripe checkout is not wired into this action yet.' };
  }

  const { error } = await supabase.from('checkout_leads').upsert(
    { user_id: user.id, product_code: 'FULL_ACCESS', locale, status: 'pending' },
    { onConflict: 'user_id,product_code', ignoreDuplicates: true },
  );

  if (error) return { ok: false, error: 'Не получилось отправить заявку. Проверь интернет.' };

  revalidatePath('/checkout');
  return { ok: true };
}
