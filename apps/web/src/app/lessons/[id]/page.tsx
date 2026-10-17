import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { Alert, btn, Card, cx } from '@/components/ui';
import { requireSession } from '@/lib/auth';
import { locale, tr } from '@/lib/i18n';
import { lessonMinutes, lessonTabs, parseLessonTab, transcriptLanguage } from '@/lib/lessons';
import { StatusTag } from '../../classes/[id]/lessons-tab';
import { ProcessingView } from './processing-view';
import { PublishButton } from './publish-button';
import { SummaryTab } from './summary-tab';
import { TranscriptTab } from './transcript-tab';
import { VocabTab } from './vocab-tab';

const tabLabel = {
  transcript: 'lessonDetail.tabTranscript',
  vocab: 'lessonDetail.tabVocab',
  summary: 'lessonDetail.tabSummary',
  questions: 'lessonDetail.tabQuestions',
} as const;

/** Lesson detail for the teacher (SPEC D1–D3): review AI material, then send it to the class. */
export default async function LessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; lang?: string; published?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const { supabase, profile } = await requireSession(`/lessons/${id}`, 'teacher');

  // RLS: only the class's teacher reads a lesson in processing or review.
  const { data: lesson } = await supabase
    .from('lessons')
    .select(
      'id, class_id, title, topic, status, started_at, ended_at, target_langs, processing_error, classes(name)',
    )
    .eq('id', id)
    .maybeSingle();
  if (!lesson) notFound();

  const dateFormat = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const tab = parseLessonTab(query.tab);
  const lang = transcriptLanguage(query.lang, lesson.target_langs);
  const href = (t: string) => `/lessons/${lesson.id}${t === 'transcript' ? '' : `?tab=${t}`}`;

  return (
    <AppShell profile={profile}>
      <Link
        href={`/classes/${lesson.class_id}?tab=lessons`}
        className="mb-2 inline-block text-sm text-muted hover:text-fg"
      >
        ← {lesson.classes?.name ?? tr('lessonDetail.back')}
      </Link>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{lesson.title}</h1>
            <StatusTag status={lesson.status} />
          </div>
          <p className="text-sm text-muted">
            {dateFormat.format(new Date(lesson.started_at))} ·{' '}
            {tr('classDetail.lessonMinutes', {
              n: lessonMinutes(lesson.started_at, lesson.ended_at),
            })}
            {lesson.topic && (
              <span lang="ko" className="font-ko">
                {' '}
                · {lesson.topic}
              </span>
            )}
          </p>
        </div>
        {lesson.status === 'review' && <PublishButton lessonId={lesson.id} />}
      </header>

      {query.published && lesson.status === 'published' && (
        <div className="mb-4">
          <Alert tone="success">{tr('lessonDetail.published')}</Alert>
        </div>
      )}

      {lesson.status === 'live' ? (
        <Card className="flex flex-col items-start gap-3 p-6">
          <p>{tr('lessonDetail.stillLive')}</p>
          <Link href={`/lessons/${lesson.id}/live`} className={cx(btn.base, btn.live)}>
            {tr('lessonDetail.openLive')}
          </Link>
        </Card>
      ) : lesson.status === 'processing' ? (
        <ProcessingView status={lesson.status} error={lesson.processing_error} />
      ) : (
        <Card className="min-w-0">
          <nav
            className="flex gap-1 overflow-x-auto border-b border-line px-4"
            aria-label={lesson.title}
          >
            {lessonTabs.map((t) => (
              <Link
                key={t}
                href={href(t)}
                aria-current={tab === t ? 'page' : undefined}
                className={cx(
                  '-mb-px h-10 border-b-2 px-3 pt-2.5 text-sm font-semibold whitespace-nowrap',
                  tab === t ? 'border-live text-fg' : 'border-transparent text-muted',
                )}
              >
                {tr(tabLabel[t])}
              </Link>
            ))}
          </nav>
          <div className="p-4">
            {tab === 'transcript' && (
              <TranscriptTab
                supabase={supabase}
                lessonId={lesson.id}
                targetLangs={lesson.target_langs}
                lang={lang}
              />
            )}
            {tab === 'vocab' && (
              <VocabTab
                supabase={supabase}
                lessonId={lesson.id}
                targetLangs={lesson.target_langs}
              />
            )}
            {tab === 'summary' && (
              <SummaryTab
                supabase={supabase}
                lessonId={lesson.id}
                targetLangs={lesson.target_langs}
              />
            )}
            {tab === 'questions' && <p className="text-muted">{tr('lessonDetail.noQuestions')}</p>}
          </div>
        </Card>
      )}
    </AppShell>
  );
}
