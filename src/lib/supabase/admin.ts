import 'server-only';

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { env } from '@/lib/config/env';

/**
 * Service-role client. BYPASSES RLS ENTIRELY.
 *
 * Permitted callers only:
 *   - Stripe webhook handler (granting entitlements)
 *   - audio generation worker (writing audio_assets + storage)
 *   - admin server actions that have already passed requireAdmin()
 *   - test grading, which must read is_correct without exposing it
 *
 * Must never be imported into a Client Component. The 'server-only' import
 * turns any such attempt into a build error.
 */
export function createSupabaseAdminClient() {
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
