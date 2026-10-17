import { notFound } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { StudentLive, type KnownWord } from './student-live';

/**
 * Student's screen during a lesson (SPEC S2, S3). RLS lets a class member read the lesson
 * only while it is live or published, and the vocabulary of published lessons.
 */
export default async function StudentLivePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireSession(`/live/${id}`, 'student');
  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, class_id, title, status, target_langs, classes(name)')
    .eq('id', id)
    .maybeSingle();
  if (!lesson) notFound();

  // Words already taught in this class, for tap-to-look-up during the lesson.
  const { data: vocab } = await supabase
    .from('vocab_items')
    .select('ko, topik_level, vocab_translations(lang, meaning), lessons!inner(class_id, status)')
    .eq('lessons.class_id', lesson.class_id)
    .eq('lessons.status', 'published');
  const words: KnownWord[] = (vocab ?? []).map((v) => ({
    ko: v.ko,
    topikLevel: v.topik_level,
    meanings: Object.fromEntries(v.vocab_translations.map((t) => [t.lang, t.meaning])),
  }));

  return (
    <StudentLive
      lesson={{
        id: lesson.id,
        title: lesson.title,
        className: lesson.classes?.name ?? '',
        live: lesson.status === 'live',
      }}
      motherTongue={profile.mother_tongue}
      words={words}
      realtimeUrl={process.env.NEXT_PUBLIC_REALTIME_URL ?? null}
    />
  );
}
