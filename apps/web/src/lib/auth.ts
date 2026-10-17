import { redirect } from 'next/navigation';
import type { Profile } from './supabase/database.types';
import { createClient, type Supabase } from './supabase/server';
import { homePathFor, loginPath, onboardingPath } from './routes';

export interface Session {
  supabase: Supabase;
  profile: Profile;
}

/** The signed-in user's profile, or null when signed out or Supabase is not configured. */
export async function getSession(): Promise<Session | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) return null;
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
  return profile ? { supabase, profile } : null;
}

/**
 * Guards a page. Sends signed-out visitors to the login page (returning to `currentPath`),
 * users without a role to onboarding, and users with the other role to their own home.
 */
export async function requireSession(
  currentPath: string,
  role?: 'teacher' | 'student',
): Promise<Session> {
  const session = await getSession();
  if (!session) redirect(loginPath(currentPath));
  if (!session.profile.role) redirect(onboardingPath(currentPath));
  if (role && session.profile.role !== role) redirect(homePathFor(session.profile.role));
  return session;
}
