'use server';

import { inviteCodeSchema, languageCodeSchema } from '@dasi/shared';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireSession } from '@/lib/auth';
import { tr } from '@/lib/i18n';
import { joinErrorKey } from '@/lib/join';
import type { FormState } from './auth';

const optionalText = z
  .string()
  .trim()
  .max(120)
  .transform((s) => s || null)
  .nullish();

const newClassSchema = z.object({
  name: z.string().trim().min(1).max(120),
  level: optionalText,
  schedule: optionalText,
  textbook: optionalText,
});

export async function createClass(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireSession('/classes/new', 'teacher');
  const parsed = newClassSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: tr('newClass.errorName') };

  // The invite code is random; retry once in the rare case it collides.
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error } = await supabase
      .from('classes')
      .insert(parsed.data)
      .select('id')
      .single();
    if (data) {
      revalidatePath('/classes');
      redirect(`/classes/${data.id}`);
    }
    if (error?.code !== '23505') break;
  }
  return { error: tr('newClass.errorSave') };
}

export async function joinClass(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase } = await requireSession('/join', 'student');

  const code = inviteCodeSchema.safeParse(formData.get('code') ?? '');
  if (!code.success) return { error: tr('join.errorCode') };
  const lang = languageCodeSchema.safeParse(formData.get('motherTongue') ?? '');
  if (!lang.success) return { error: tr('join.errorLanguage') };
  if (formData.get('consent') !== 'on') return { error: tr('join.errorConsent') };

  const { data: classId, error } = await supabase.rpc('join_class', {
    p_invite_code: code.data,
    p_mother_tongue: lang.data,
  });
  if (error || !classId) return { error: tr(joinErrorKey(error?.code)) };

  revalidatePath('/home');
  redirect(`/home?joined=${classId}`);
}

export async function setMotherTongue(formData: FormData) {
  const { supabase, profile } = await requireSession('/home', 'student');
  const lang = languageCodeSchema.safeParse(formData.get('motherTongue') ?? '');
  if (!lang.success) redirect('/home');

  await supabase.from('profiles').update({ mother_tongue: lang.data }).eq('id', profile.id);
  await supabase
    .from('class_members')
    .update({ mother_tongue: lang.data })
    .eq('student_id', profile.id);
  revalidatePath('/home');
  redirect('/home?saved=language');
}
