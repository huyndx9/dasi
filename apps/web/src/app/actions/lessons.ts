'use server';

import { languageCodeSchema, newLessonSchema } from '@dasi/shared';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
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

/** Result of an edit form: an error to show, or `saved` for a short confirmation. */
export interface SaveState extends FormState {
  saved?: boolean;
}

const lessonPath = (id: string) => `/lessons/${id}`;

/** "Duyệt và gửi cho lớp" (SPEC D3): students can read the lesson from now on (RLS). */
export async function publishLesson(_prev: FormState, formData: FormData): Promise<FormState> {
  const lessonId = z.uuid().safeParse(formData.get('lessonId'));
  if (!lessonId.success) return { error: tr('lessonDetail.errorSave') };
  const { supabase } = await requireSession(lessonPath(lessonId.data), 'teacher');
  const { data, error } = await supabase
    .from('lessons')
    .update({ status: 'published' })
    .eq('id', lessonId.data)
    .eq('status', 'review')
    .select('id, class_id')
    .maybeSingle();
  if (error || !data) return { error: tr('lessonDetail.errorPublish') };
  revalidatePath(`/classes/${data.class_id}`);
  redirect(`${lessonPath(lessonId.data)}?published=1`);
}

const vocabSchema = z.object({
  id: z.uuid(),
  lessonId: z.uuid(),
  ko: z.string().trim().min(1).max(60),
  topikLevel: z
    .string()
    .transform((v) => (v ? Number(v) : null))
    .pipe(z.number().int().min(1).max(6).nullable()),
});

/** Saves one vocabulary item and its meanings (fields `meaning.<lang>`); marks it edited. */
export async function saveVocab(_prev: SaveState, formData: FormData): Promise<SaveState> {
  const parsed = vocabSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: tr('lessonDetail.errorVocab') };
  const v = parsed.data;
  const { supabase } = await requireSession(lessonPath(v.lessonId), 'teacher');

  const { error } = await supabase
    .from('vocab_items')
    .update({ ko: v.ko, topik_level: v.topikLevel, edited: true })
    .eq('id', v.id);
  // vocab_items (lesson_id, ko) is unique.
  if (error)
    return {
      error: tr(error.code === '23505' ? 'lessonDetail.errorDuplicate' : 'lessonDetail.errorSave'),
    };

  const meanings = [...formData.entries()].flatMap(([key, value]) => {
    const lang = languageCodeSchema.safeParse(key.replace(/^meaning\./, ''));
    const text = String(value).trim();
    return key.startsWith('meaning.') && lang.success && text
      ? [{ vocab_id: v.id, lang: lang.data, meaning: text }]
      : [];
  });
  if (meanings.length) {
    const { error: mError } = await supabase.from('vocab_translations').upsert(meanings);
    if (mError) return { error: tr('lessonDetail.errorSave') };
  }
  revalidatePath(lessonPath(v.lessonId));
  return { saved: true };
}

export async function deleteVocab(formData: FormData): Promise<void> {
  const ids = z
    .object({ id: z.uuid(), lessonId: z.uuid() })
    .safeParse(Object.fromEntries(formData));
  if (!ids.success) return;
  const { supabase } = await requireSession(lessonPath(ids.data.lessonId), 'teacher');
  await supabase.from('vocab_items').delete().eq('id', ids.data.id);
  revalidatePath(lessonPath(ids.data.lessonId));
}

const summarySchema = z.object({
  lessonId: z.uuid(),
  lang: z.string().regex(/^[a-z]{2}$/),
  text: z.string().trim().min(1).max(4000),
});

/** Saves the summary in one language ('ko' or a lesson language); marks it edited. */
export async function saveSummary(_prev: SaveState, formData: FormData): Promise<SaveState> {
  const parsed = summarySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: tr('lessonDetail.errorSummary') };
  const s = parsed.data;
  const { supabase } = await requireSession(lessonPath(s.lessonId), 'teacher');
  const { error } = await supabase
    .from('lesson_summaries')
    .upsert({ lesson_id: s.lessonId, lang: s.lang, text: s.text, edited: true });
  if (error) return { error: tr('lessonDetail.errorSave') };
  revalidatePath(lessonPath(s.lessonId));
  return { saved: true };
}

/**
 * A fresh Supabase access token for the realtime gateway's `hello` (never put in a URL).
 * Called before each (re)connect, so a lesson longer than the token lifetime keeps working.
 */
export async function getRealtimeToken(): Promise<string> {
  // Teachers and students: the gateway checks the role against the lesson itself.
  const { supabase } = await requireSession('/');
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error('Phiên đăng nhập đã hết hạn');
  return data.session.access_token;
}
