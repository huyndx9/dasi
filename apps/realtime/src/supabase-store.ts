import type { AudioSource, LiveSegment } from '@dasi/shared';
import { createClient } from '@supabase/supabase-js';
import type { LessonAccess, LessonStore } from './store';

interface LessonRow {
  id: string;
  status: LessonAccess['status'];
  sources: AudioSource[];
  target_langs: string[];
  started_at: string;
  class_id: string;
  classes: { teacher_id: string } | null;
}

/** LessonStore backed by Supabase with the service role key (bypasses RLS: checks are here). */
export class SupabaseLessonStore implements LessonStore {
  private readonly db;

  constructor(url: string, serviceRoleKey: string) {
    this.db = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  async authenticate(token: string): Promise<string | null> {
    const { data, error } = await this.db.auth.getUser(token);
    return error ? null : (data.user?.id ?? null);
  }

  async loadAccess(lessonId: string, userId: string): Promise<LessonAccess | null> {
    const { data, error } = await this.db
      .from('lessons')
      .select('id, status, sources, target_langs, started_at, class_id, classes(teacher_id)')
      .eq('id', lessonId)
      .maybeSingle<LessonRow>();
    if (error) throw new Error(`Không đọc được buổi học: ${error.message}`);
    if (!data) return null;

    let role: LessonAccess['role'] | null = null;
    let motherTongue: string | null = null;
    if (data.classes?.teacher_id === userId) {
      role = 'teacher';
    } else {
      const { data: member, error: memberError } = await this.db
        .from('class_members')
        .select('mother_tongue')
        .eq('class_id', data.class_id)
        .eq('student_id', userId)
        .maybeSingle<{ mother_tongue: string }>();
      if (memberError) throw new Error(`Không đọc được danh sách lớp: ${memberError.message}`);
      if (member) {
        role = 'student';
        motherTongue = member.mother_tongue;
      }
    }
    if (!role) return null;

    return {
      lessonId: data.id,
      role,
      status: data.status,
      sources: data.sources,
      targetLangs: data.target_langs,
      startedAt: new Date(data.started_at),
      motherTongue,
    };
  }

  async nextSeq(lessonId: string): Promise<number> {
    const { data, error } = await this.db
      .from('segments')
      .select('seq')
      .eq('lesson_id', lessonId)
      .order('seq', { ascending: false })
      .limit(1)
      .maybeSingle<{ seq: number }>();
    if (error) throw new Error(`Không đọc được bản ghi: ${error.message}`);
    return data ? data.seq + 1 : 0;
  }

  async saveFinal(lessonId: string, s: LiveSegment): Promise<string> {
    const { data, error } = await this.db
      .from('segments')
      .insert({
        lesson_id: lessonId,
        seq: s.seq,
        source: s.source,
        speaker_label: s.speaker ?? null,
        text: s.text,
        start_ms: s.startMs,
        end_ms: s.endMs,
      })
      .select('id')
      .single<{ id: string }>();
    if (error) throw new Error(`Không lưu được câu ${s.seq}: ${error.message}`);
    return data.id;
  }

  async saveTranslations(segmentId: string, translations: Record<string, string>): Promise<void> {
    const rows = Object.entries(translations).map(([lang, text]) => ({
      segment_id: segmentId,
      lang,
      text,
    }));
    if (rows.length === 0) return;
    const { error } = await this.db.from('segment_translations').upsert(rows);
    if (error) throw new Error(`Không lưu được bản dịch: ${error.message}`);
  }

  async markProcessing(lessonId: string, endedAt: Date): Promise<void> {
    const { error } = await this.db
      .from('lessons')
      .update({ status: 'processing', ended_at: endedAt.toISOString() })
      .eq('id', lessonId)
      .eq('status', 'live');
    if (error) throw new Error(`Không kết thúc được buổi học: ${error.message}`);
  }
}
