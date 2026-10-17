'use server';

import { newLessonSchema } from '@dasi/shared';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { tr } from '@/lib/i18n';
import type { FormState } from './auth';

/**
 * Starts a lesson from the new-lesson wizard (SPEC §3): status `live`, then the live screen.
 * RLS only lets a teacher insert lessons into their own classes.
 */
export async function createLesson(input: unknown): Promise<FormState> {
  const { supabase } = await requireSession('/lessons/new', 'teacher');
  const parsed = newLessonSchema.safeParse(input);
  if (!parsed.success) return { error: tr('newLesson.errorInput') };
  const l = parsed.data;

  const { data, error } = await supabase
    .from('lessons')
    .insert({
      class_id: l.classId,
      title: l.title,
      topic: l.topic,
      textbook: l.textbook,
      format: l.format,
      sources: l.sources,
      target_langs: l.targetLangs,
      display: l.display,
      status: 'live',
    })
    .select('id')
    .single();
  // lessons_one_live_per_class: the class is already being taught.
  if (error?.code === '23505') return { error: tr('newLesson.errorAlreadyLive') };
  if (!data) return { error: tr('newLesson.errorSave') };

  revalidatePath(`/classes/${l.classId}`);
  redirect(`/lessons/${data.id}/live`);
}
