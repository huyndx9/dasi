import type { LessonStatus } from '@dasi/shared';
import type { MessageKey } from '@dasi/i18n';

/** Colour of a lesson status tag (docs/UI-UX.md tokens). */
export type StatusTone = 'live' | 'muted' | 'warn' | 'learn';

const statusInfo: Record<LessonStatus, { label: MessageKey; tone: StatusTone }> = {
  live: { label: 'lessonStatus.live', tone: 'live' },
  processing: { label: 'lessonStatus.processing', tone: 'muted' },
  review: { label: 'lessonStatus.review', tone: 'warn' },
  published: { label: 'lessonStatus.published', tone: 'learn' },
};

export function lessonStatusInfo(status: LessonStatus) {
  return statusInfo[status];
}

/** Whole minutes from start to end; a lesson still live counts up to `now`. */
export function lessonMinutes(startedAt: string, endedAt: string | null, now = new Date()): number {
  const end = endedAt ? new Date(endedAt) : now;
  return Math.max(0, Math.round((end.getTime() - new Date(startedAt).getTime()) / 60_000));
}

/** Where a lesson card leads: the live screen while teaching, otherwise the lesson detail. */
export function lessonHref(lesson: { id: string; status: LessonStatus }): string {
  return lesson.status === 'live' ? `/lessons/${lesson.id}/live` : `/lessons/${lesson.id}`;
}
