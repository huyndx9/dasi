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

/** "04:05", or "1:02:03" past an hour: position of a sentence in the lesson. */
export function formatOffset(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mmss = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return h ? `${h}:${mmss}` : mmss;
}

export const lessonTabs = ['transcript', 'vocab', 'summary', 'questions'] as const;
export type LessonTab = (typeof lessonTabs)[number];

export function parseLessonTab(value: string | undefined): LessonTab {
  return lessonTabs.find((t) => t === value) ?? 'transcript';
}

/** Language shown under each Korean line: the requested one if the lesson has it, else the first. */
export function transcriptLanguage(
  requested: string | undefined,
  targetLangs: string[],
): string | null {
  if (requested && targetLangs.includes(requested)) return requested;
  return targetLangs[0] ?? null;
}

export type StepState = 'done' | 'running' | 'failed';

/**
 * Steps of the processing screen (prototype "Đang hoàn tất buổi học"). Recording and live
 * subtitles are done once the lesson leaves `live`; the worker step runs until `review`.
 */
export function processingSteps(
  status: LessonStatus,
  error: string | null,
): { key: MessageKey; state: StepState }[] {
  const workerState: StepState = status === 'processing' ? (error ? 'failed' : 'running') : 'done';
  return [
    { key: 'lessonDetail.stepTranscript', state: 'done' },
    { key: 'lessonDetail.stepTranslations', state: 'done' },
    { key: 'lessonDetail.stepMaterials', state: workerState },
  ];
}
