import { notFound, redirect } from 'next/navigation';
import { requireSession } from '@/lib/auth';
import { LiveTeacher } from './live-teacher';

/** Teacher's live class screen (SPEC L1–L5). Only while the lesson is `live`. */
export default async function LiveLessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireSession(`/lessons/${id}/live`, 'teacher');
  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, class_id, title, status, sources, target_langs, started_at, classes(name)')
    .eq('id', id)
    .maybeSingle();
  if (!lesson) notFound();
  if (lesson.status !== 'live') redirect(`/lessons/${lesson.id}`);

  return (
    <LiveTeacher
      lesson={{
        id: lesson.id,
        classId: lesson.class_id,
        className: lesson.classes?.name ?? '',
        title: lesson.title,
        sources: lesson.sources,
        targetLangs: lesson.target_langs,
        startedAt: lesson.started_at,
      }}
      teacherName={profile.display_name}
      realtimeUrl={process.env.NEXT_PUBLIC_REALTIME_URL ?? null}
    />
  );
}
