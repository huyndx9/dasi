import type { LlmProvider } from '@dasi/providers';
import type { LessonStatus } from '@dasi/shared';
import { z } from 'zod';

/** Lesson fields the job needs. */
export interface FinalizeLesson {
  id: string;
  status: LessonStatus;
  title: string;
  topic: string | null;
  target_langs: string[];
}

export interface FinalizeSegment {
  id: string;
  seq: number;
  text: string;
}

export interface VocabMaterial {
  position: number;
  ko: string;
  pos: PartOfSpeech;
  topikLevel: number | null;
  exampleKo: string | null;
  segmentId: string | null;
  /** Meaning per target language. */
  meanings: Record<string, string>;
}

export interface LessonMaterials {
  /** 'ko' first, then one per target language. */
  summaries: { lang: string; text: string }[];
  vocab: VocabMaterial[];
}

/** Database access of the job, so the logic can be tested without Supabase. */
export interface LessonStore {
  getLesson(id: string): Promise<FinalizeLesson | null>;
  getSegments(lessonId: string): Promise<FinalizeSegment[]>;
  /** Replaces every material of the lesson, then moves it from `processing` to `review`. */
  saveMaterials(lessonId: string, materials: LessonMaterials): Promise<void>;
  /** Stores why the last attempt failed (shown on the processing screen). */
  recordError(lessonId: string, message: string): Promise<void>;
}

export const PARTS_OF_SPEECH = [
  'noun',
  'verb',
  'adjective',
  'adverb',
  'expression',
  'grammar',
  'other',
] as const;
export type PartOfSpeech = (typeof PARTS_OF_SPEECH)[number];

/** Most vocabulary items kept per lesson. */
export const MAX_VOCAB = 30;
/** Transcript characters sent to the model; a 90-minute lesson is well below this. */
export const MAX_TRANSCRIPT_CHARS = 60_000;

/** What the model must return. Meanings are keyed by exactly the lesson's target languages. */
export function materialsSchema(langs: string[]) {
  return z.object({
    summary: z.string().trim().min(1),
    vocab: z
      .array(
        z.object({
          ko: z.string().trim().min(1).max(60),
          pos: z.enum(PARTS_OF_SPEECH),
          topikLevel: z.number().int().min(1).max(6).nullable(),
          exampleSeq: z.number().int().nonnegative().nullable(),
          meanings: z.object(Object.fromEntries(langs.map((l) => [l, z.string().trim().min(1)]))),
        }),
      )
      .max(MAX_VOCAB * 2),
  });
}

const SYSTEM = [
  'You prepare study material from the transcript of a Korean-language class.',
  'Each transcript line is "[seq] sentence" as spoken by the teacher.',
  'Write `summary` in Korean: 3 to 6 short sentences a learner can read, naming the grammar patterns taught (for example -고 싶다) and the situations practised.',
  `List up to ${MAX_VOCAB} useful words, expressions or grammar patterns from the lesson in \`vocab\`, most useful first.`,
  'For each item give its part of speech, TOPIK level 1-6 (null if unsure), the seq of one transcript line that uses it as `exampleSeq` (null if none), and a short learner-friendly meaning in every requested language.',
  'Use only words that occur in the transcript. Answer with JSON only.',
].join(' ');

export type FinalizeResult =
  | { lessonId: string; status: 'review'; vocab: number; summaries: number }
  | { lessonId: string; skipped: string };

/**
 * Job `lesson.finalize` (ARCHITECTURE "Luồng realtime" steps 7-8): summary and vocabulary
 * from the lesson's segments, translated into the class languages, then `status = review`.
 *
 * Safe to run again: it only works on lessons still `processing` and replaces whatever an
 * earlier, failed attempt wrote. Lessons the teacher is reviewing or has published are left
 * alone, so a duplicate job never overwrites their edits.
 */
export async function finalizeLesson(
  lessonId: string,
  deps: { store: LessonStore; llm: LlmProvider },
): Promise<FinalizeResult> {
  const { store, llm } = deps;
  const lesson = await store.getLesson(lessonId);
  if (!lesson) return { lessonId, skipped: 'not-found' };
  if (lesson.status !== 'processing') return { lessonId, skipped: `status-${lesson.status}` };

  try {
    const materials = await buildMaterials(lesson, await store.getSegments(lessonId), llm);
    await store.saveMaterials(lessonId, materials);
    return {
      lessonId,
      status: 'review',
      vocab: materials.vocab.length,
      summaries: materials.summaries.length,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await store.recordError(lessonId, message.slice(0, 500)).catch(() => {});
    throw e;
  }
}

export async function buildMaterials(
  lesson: FinalizeLesson,
  segments: FinalizeSegment[],
  llm: LlmProvider,
): Promise<LessonMaterials> {
  const langs = [...new Set(lesson.target_langs.filter((l) => l !== 'ko'))];
  const lines = transcriptLines(segments);
  if (lines.length === 0) return { summaries: [], vocab: [] };

  const result = await llm.complete({
    system: SYSTEM,
    prompt: [
      `Lesson: ${lesson.title}`,
      ...(lesson.topic ? [`Planned content: ${lesson.topic}`] : []),
      `Meaning languages (ISO 639-1): ${langs.length ? langs.join(', ') : 'none, use {}'}`,
      'Transcript:',
      ...lines,
    ].join('\n'),
    schema: materialsSchema(langs),
  });

  const summaries = [{ lang: 'ko', text: result.summary }];
  if (langs.length) {
    const translated = await llm.translate({ text: result.summary, from: 'ko', to: langs });
    for (const lang of langs) summaries.push({ lang, text: translated[lang]! });
  }

  const bySeq = new Map(segments.map((s) => [s.seq, s]));
  const seen = new Set<string>();
  const vocab: VocabMaterial[] = [];
  for (const item of result.vocab) {
    if (seen.has(item.ko) || vocab.length >= MAX_VOCAB) continue;
    seen.add(item.ko);
    // The example must be a real sentence of this lesson; drop references to unknown lines.
    const example = item.exampleSeq === null ? undefined : bySeq.get(item.exampleSeq);
    vocab.push({
      position: vocab.length,
      ko: item.ko,
      pos: item.pos,
      topikLevel: item.topikLevel,
      exampleKo: example?.text ?? null,
      segmentId: example?.id ?? null,
      meanings: item.meanings as Record<string, string>,
    });
  }
  return { summaries, vocab };
}

/** "[seq] text" lines in speaking order, cut at MAX_TRANSCRIPT_CHARS. */
export function transcriptLines(segments: FinalizeSegment[]): string[] {
  const lines: string[] = [];
  let size = 0;
  for (const s of [...segments].sort((a, b) => a.seq - b.seq)) {
    const text = s.text.trim();
    if (!text) continue;
    const line = `[${s.seq}] ${text}`;
    if (size + line.length > MAX_TRANSCRIPT_CHARS) break;
    lines.push(line);
    size += line.length + 1;
  }
  return lines;
}
