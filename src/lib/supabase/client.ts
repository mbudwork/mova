'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

/**
 * Browser client. Carries the user's JWT, so every query it makes is subject
 * to RLS. Never use it for anything that must be authoritative (entitlement
 * checks, grading, audio URL minting) — those live on the server.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
