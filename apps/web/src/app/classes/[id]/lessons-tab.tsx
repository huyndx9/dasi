import { isLanguageCode, type LessonStatus } from '@dasi/shared';
import Link from 'next/link';
import { Alert, cx, LangChip } from '@/components/ui';
import { locale, tr } from '@/lib/i18n';
import { lessonHref, lessonMinutes, lessonStatusInfo, type StatusTone } from '@/lib/lessons';

export interface LessonRow {
  id: string;
  title: string;
  topic: string | null;
  status: LessonStatus;
  started_at: string;
  ended_at: string | null;
  target_langs: string[];
}

const toneClass: Record<StatusTone, string> = {
  live: 'bg-live-soft text-live',
  muted: 'bg-sunk text-muted',
  warn: 'bg-warn-soft text-warn',
  learn: 'bg-learn-soft text-learn',
};

/** Lessons of a class, newest first (SPEC C4). Rows arrive sorted from the query. */
export function LessonsTab({ lessons, failed }: { lessons: LessonRow[]; failed: boolean }) {
  if (failed) return <Alert tone="error">{tr('classDetail.lessonsError')}</Alert>;
  if (lessons.length === 0) return <p className="text-muted">{tr('classDetail.noLessons')}</p>;

  const dateFormat = new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit' });
  return (
    <ul className="flex flex-col gap-2">
      {lessons.map((l) => {
        const langs = l.target_langs.filter(isLanguageCode);
        return (
          <li key={l.id}>
            <Link
              href={lessonHref(l)}
              prefetch={false}
              className="flex flex-col gap-2.5 rounded border border-line px-4 py-3.5 hover:bg-sunk sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <h3 className="truncate font-semibold">{l.title}</h3>
                <p className="text-sm text-muted">
                  {l.topic && (
                    <span lang="ko" className="font-ko">
                      {l.topic} ·{' '}
                    </span>
                  )}
                  <span className="font-mono text-xs text-faint tabular-nums">
                    {dateFormat.format(new Date(l.started_at))} ·{' '}
                    {tr('classDetail.lessonMinutes', {
                      n: lessonMinutes(l.started_at, l.ended_at),
                    })}
                  </span>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {langs.length > 0 && (
                  <span className="sr-only">{tr('classDetail.lessonLanguages')}:</span>
                )}
                {langs.map((code) => (
                  <LangChip key={code} code={code} />
                ))}
                <StatusTag status={l.status} />
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Coloured lesson status tag; a live lesson gets a pulsing dot (docs/UI-UX.md). */
export function StatusTag({ status }: { status: LessonStatus }) {
  const info = lessonStatusInfo(status);
  return (
    <span
      className={cx(
        'inline-flex h-5 items-center gap-1.5 rounded-[5px] px-1.5 font-mono text-[10.5px] font-semibold tracking-[.04em] whitespace-nowrap',
        toneClass[info.tone],
      )}
    >
      {status === 'live' && (
        <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-live" />
      )}
      {tr(info.label)}
    </span>
  );
}
