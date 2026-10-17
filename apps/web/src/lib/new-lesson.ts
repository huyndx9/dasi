import {
  audioSourceSchema,
  lessonFormatSchema,
  MAX_TARGET_LANGS_PER_LESSON,
  subtitleDisplaySchema,
  type AudioSource,
  type LanguageCode,
  type LessonFormat,
  type SubtitleDisplay,
} from '@dasi/shared';
import type { MessageKey } from '@dasi/i18n';
import { z } from 'zod';
import { languageDistribution } from './classes';

/**
 * Subtitle languages of a lesson: the class's mother tongues, largest group first, capped at
 * MAX_TARGET_LANGS_PER_LESSON. `uncovered` counts students left out by the cap; they read
 * English (SPEC §7), so English takes the last slot when anyone is left out.
 */
export function subtitleLanguages(members: { mother_tongue: string }[]): {
  langs: LanguageCode[];
  uncovered: number;
} {
  const shares = languageDistribution(members);
  if (shares.length <= MAX_TARGET_LANGS_PER_LESSON) {
    return { langs: shares.map((s) => s.code), uncovered: 0 };
  }
  const withoutEn = shares.filter((s) => s.code !== 'en');
  const kept = withoutEn.slice(0, MAX_TARGET_LANGS_PER_LESSON - 1);
  const keptCodes = new Set<LanguageCode>([...kept.map((s) => s.code), 'en']);
  const uncovered = shares.filter((s) => !keptCodes.has(s.code)).reduce((n, s) => n + s.count, 0);
  return { langs: [...kept.map((s) => s.code), 'en'], uncovered };
}

/** "Buổi 17/10" style default title, so the teacher can start without typing. */
export function defaultLessonTitle(prefix: string, date: Date, locale: string): string {
  const day = new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit' }).format(date);
  return `${prefix} ${day.replace(/[.-]/g, '/')}`;
}

/** Source picker value in step 2: one source or both. */
export type SourceChoice = 'mic' | 'tab' | 'both';

export function sourcesOf(choice: SourceChoice): AudioSource[] {
  return choice === 'both' ? ['mic', 'tab'] : [choice];
}

export function choiceOf(sources: AudioSource[]): SourceChoice {
  return sources.length === 2 ? 'both' : sources[0]!;
}

/** Readiness of one audio source in the device check. */
export type SourceState =
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'ready'; label: string }
  | { kind: 'error'; message: MessageKey };

/** Start stays locked until every selected source is ready (SPEC §3). */
export function canStart(sources: AudioSource[], states: Record<AudioSource, SourceState>) {
  return sources.every((s) => states[s].kind === 'ready');
}

/** Turns a getUserMedia / getDisplayMedia failure into advice the teacher can act on. */
export function mediaErrorKey(source: AudioSource, error: unknown): MessageKey {
  const name = error instanceof Error || isDomLike(error) ? error.name : '';
  if (source === 'tab') {
    if (name === 'NotAllowedError' || name === 'AbortError') return 'newLesson.errorTabCancelled';
    if (name === 'NoAudioTrack') return 'newLesson.errorTabNoAudio';
    if (name === 'NotSupportedError' || name === 'TypeError')
      return 'newLesson.errorTabUnsupported';
    return 'newLesson.errorTabOther';
  }
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'newLesson.errorMicDenied';
  if (name === 'NotFoundError' || name === 'OverconstrainedError')
    return 'newLesson.errorMicMissing';
  if (name === 'NotReadableError') return 'newLesson.errorMicBusy';
  return 'newLesson.errorMicOther';
}

function isDomLike(e: unknown): e is { name: string } {
  return typeof e === 'object' && e !== null && typeof (e as { name?: unknown }).name === 'string';
}

/** Last choices per class, kept in the browser (SPEC §3: "App nhớ lựa chọn cuối cùng"). */
export const savedChoiceSchema = z.object({
  format: lessonFormatSchema,
  sources: z.array(audioSourceSchema).min(1).max(2),
  display: subtitleDisplaySchema,
  textbook: z.string().max(200).optional(),
  micId: z.string().max(200).optional(),
});
export type SavedChoice = z.infer<typeof savedChoiceSchema>;

export function savedChoiceKey(classId: string): string {
  return `dasi.newLesson.${classId}`;
}

/** Parses a stored choice; anything unreadable counts as "nothing saved". */
export function parseSavedChoice(raw: string | null): SavedChoice | null {
  if (!raw) return null;
  try {
    const parsed = savedChoiceSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export const formatOptions: {
  key: LessonFormat;
  label: MessageKey;
  hint: MessageKey;
  recommended?: boolean;
}[] = [
  { key: 'room', label: 'newLesson.formatRoom', hint: 'newLesson.formatRoomHint' },
  { key: 'online', label: 'newLesson.formatOnline', hint: 'newLesson.formatOnlineHint' },
  {
    key: 'hybrid',
    label: 'newLesson.formatHybrid',
    hint: 'newLesson.formatHybridHint',
    recommended: true,
  },
];

export const displayOptions: { key: SubtitleDisplay; label: MessageKey; hint: MessageKey }[] = [
  { key: 'bilingual', label: 'newLesson.displayBilingual', hint: 'newLesson.displayBilingualHint' },
  { key: 'korean_only', label: 'newLesson.displayKorean', hint: 'newLesson.displayKoreanHint' },
  { key: 'hidden', label: 'newLesson.displayHidden', hint: 'newLesson.displayHiddenHint' },
];
