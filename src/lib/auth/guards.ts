import 'server-only';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { AppRole, SkillLevel } from '@/types/domain';

export type SessionProfile = {
  id: string;
  role: AppRole;
  uiLocale: string;
  currentLevel: SkillLevel;
  primaryProfessionId: string | null;
  onboardingCompleted: boolean;
  displayName: string | null;
};

/**
 * Always getUser(), never getSession(): getSession() trusts whatever is in the
 * cookie, getUser() revalidates the JWT against the auth server. Authorization
 * decisions must not be made from an unverified token.
 */
export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

export async function getSessionProfile(): Promise<SessionProfile | null> {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, ui_locale, current_level, primary_profession_id, onboarding_completed, display_name')
    .eq('id', auth.user.id)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    role: data.role,
    uiLocale: data.ui_locale,
    currentLevel: data.current_level,
    primaryProfessionId: data.primary_profession_id,
    onboardingCompleted: data.onboarding_completed,
    displayName: data.display_name,
  };
}

export async function requireProfile(): Promise<SessionProfile> {
  const profile = await getSessionProfile();
  if (!profile) redirect('/login');
  return profile;
}

export async function requireOnboarded(): Promise<SessionProfile> {
  const profile = await requireProfile();
  if (!profile.onboardingCompleted) redirect('/onboarding');
  return profile;
}

/**
 * Admin check re-runs in the database, not from a client-supplied claim.
 * The RLS policies rely on the same public.is_admin() function, so a UI bug
 * cannot widen access on its own.
 */
export async function requireAdmin(): Promise<SessionProfile> {
  const profile = await requireProfile();
  if (profile.role !== 'admin') redirect('/');

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('is_admin');
  if (error || data !== true) redirect('/');

  return profile;
}

export async function hasFullAccess(): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('has_full_access');
  return !error && data === true;
}

export async function requireFullAccess(): Promise<SessionProfile> {
  const profile = await requireProfile();
  if (!(await hasFullAccess())) redirect('/purchase');
  return profile;
}
