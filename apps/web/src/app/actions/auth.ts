'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { roleSchema, languageCodeSchema } from '@dasi/shared';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { homePathFor, safeNext } from '@/lib/routes';
import { getSession } from '@/lib/auth';
import { tr } from '@/lib/i18n';

async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'http';
  return host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000');
}

export async function signInWithGoogle(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) redirect('/login');
  const next = safeNext(formData.get('next')?.toString());
  const origin = await requestOrigin();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect('/login?error=oauth');
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase?.auth.signOut();
  redirect('/');
}

export interface FormState {
  error?: string;
}

const onboardingSchema = z.discriminatedUnion('role', [
  z.object({ role: z.literal('teacher') }),
  z.object({ role: z.literal('student'), motherTongue: languageCodeSchema }),
]);

export async function completeOnboarding(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session) redirect('/login');

  const role = roleSchema.safeParse(formData.get('role'));
  if (!role.success || role.data === 'admin') return { error: tr('onboarding.errorRole') };
  const parsed = onboardingSchema.safeParse({
    role: role.data,
    motherTongue: formData.get('motherTongue') ?? undefined,
  });
  if (!parsed.success) return { error: tr('onboarding.errorLanguage') };

  const { error } = await session.supabase
    .from('profiles')
    .update({
      role: parsed.data.role,
      ...(parsed.data.role === 'student' ? { mother_tongue: parsed.data.motherTongue } : {}),
    })
    .eq('id', session.profile.id);
  if (error) return { error: tr('onboarding.errorSave') };

  redirect(homePathFor(parsed.data.role));
}
