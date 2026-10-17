import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { FinalizeLesson, FinalizeSegment, LessonMaterials, LessonStore } from './finalize';

/**
 * LessonStore on Supabase with the service role key, which bypasses RLS: server only,
 * never sent to a browser (CLAUDE.md rule 1).
 */
export function createSupabaseStore(url: string, serviceRoleKey: string): LessonStore {
  return new SupabaseLessonStore(
    createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } }),
  );
}

export class SupabaseLessonStore implements LessonStore {
  constructor(private readonly db: SupabaseClient) {}

  async getLesson(id: string): Promise<FinalizeLesson | null> {
    const { data, error } = await this.db
      .from('lessons')
      .select('id, status, title, topic, target_langs')
      .eq('id', id)
      .maybeSingle();
    check(error, 'đọc buổi học');
    return data as FinalizeLesson | null;
  }

  async getSegments(lessonId: string): Promise<FinalizeSegment[]> {
    const { data, error } = await this.db
      .from('segments')
      .select('id, seq, text')
      .eq('lesson_id', lessonId)
      .order('seq');
    check(error, 'đọc bản ghi');
    return data as FinalizeSegment[];
  }

  async saveMaterials(lessonId: string, m: LessonMaterials): Promise<void> {
    // Replace what an earlier attempt may have written; translations go with their items.
    check(
      (await this.db.from('vocab_items').delete().eq('lesson_id', lessonId)).error,
      'xoá từ vựng cũ',
    );
    check(
      (await this.db.from('lesson_summaries').delete().eq('lesson_id', lessonId)).error,
      'xoá tóm tắt cũ',
    );

    if (m.summaries.length) {
      const { error } = await this.db
        .from('lesson_summaries')
        .insert(m.summaries.map((s) => ({ lesson_id: lessonId, lang: s.lang, text: s.text })));
      check(error, 'lưu tóm tắt');
    }

    if (m.vocab.length) {
      const { data, error } = await this.db
        .from('vocab_items')
        .insert(
          m.vocab.map((v) => ({
            lesson_id: lessonId,
            position: v.position,
            ko: v.ko,
            pos: v.pos,
            topik_level: v.topikLevel,
            example_ko: v.exampleKo,
            segment_id: v.segmentId,
          })),
        )
        .select('id, ko');
      check(error, 'lưu từ vựng');
      const ids = new Map((data as { id: string; ko: string }[]).map((r) => [r.ko, r.id]));
      const translations = m.vocab.flatMap((v) =>
        Object.entries(v.meanings).map(([lang, meaning]) => ({
          vocab_id: ids.get(v.ko)!,
          lang,
          meaning,
        })),
      );
      if (translations.length) {
        check(
          (await this.db.from('vocab_translations').insert(translations)).error,
          'lưu nghĩa từ vựng',
        );
      }
    }

    // Last step, so a crash above leaves the lesson in `processing` for the retry.
    const { error } = await this.db
      .from('lessons')
      .update({ status: 'review', processing_error: null })
      .eq('id', lessonId)
      .eq('status', 'processing');
    check(error, 'chuyển buổi học sang chờ duyệt');
  }

  async recordError(lessonId: string, message: string): Promise<void> {
    const { error } = await this.db
      .from('lessons')
      .update({ processing_error: message })
      .eq('id', lessonId);
    check(error, 'ghi lỗi xử lý');
  }
}

function check(error: { message: string } | null, what: string) {
  if (error) throw new Error(`Supabase: không ${what}: ${error.message}`);
}
