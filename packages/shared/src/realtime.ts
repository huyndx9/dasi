/**
 * WebSocket protocol between browsers and apps/realtime (issue #7).
 *
 * 1. Open `${NEXT_PUBLIC_REALTIME_URL}/ws/lessons/<lessonId>`.
 * 2. First message, within HELLO_TIMEOUT_MS: `hello` with the user's Supabase access
 *    token (never in the URL, so it stays out of proxy logs).
 * 3. Teacher audio connections (`source` set) then send binary frames of raw audio in
 *    AUDIO_FORMAT, at most MAX_AUDIO_FRAME_BYTES each. One connection per source.
 * 4. The server answers with ServerMessage JSON frames; errors carry a code, and the UI
 *    turns codes into words (packages/i18n), never the server.
 */
import { z } from 'zod';
import { FALLBACK_LANGUAGE, type LanguageCode } from './languages';
import { audioSourceSchema, segmentSchema } from './schemas';

export const AUDIO_FORMAT = { encoding: 'pcm_s16le', sampleRate: 16_000, channels: 1 } as const;
/** About 2 s of audio; browsers should send 100–200 ms chunks (docs/ARCHITECTURE.md). */
export const MAX_AUDIO_FRAME_BYTES = 64 * 1024;
export const HELLO_TIMEOUT_MS = 10_000;
/** Final segments replayed to a client that joins mid-lesson. */
export const RECENT_SEGMENTS = 30;

export const clientMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('hello'),
    token: z.string().min(1),
    role: z.enum(['teacher', 'student']),
    /** Teacher audio connections only: which input this connection carries. */
    source: audioSourceSchema.optional(),
  }),
  z.object({ type: z.literal('pause') }),
  z.object({ type: z.literal('resume') }),
  /** Teacher ends the lesson: flush, mark it processing, queue post-class work. */
  z.object({ type: z.literal('end') }),
]);
export type ClientMessage = z.infer<typeof clientMessageSchema>;

/**
 * A segment as sent live. Only `final` ones are stored, and finals arrive in seq order.
 * A `partial` carries the seq its final will most likely get; finals are saved before they
 * are broadcast, so the next utterance's partial can arrive before the previous final.
 * Clients keep one partial per `source` and drop it when a final from the same source
 * with seq >= the partial's seq arrives.
 */
export const liveSegmentSchema = segmentSchema.omit({ lessonId: true });
export type LiveSegment = z.infer<typeof liveSegmentSchema>;

export type RoomStatus = 'live' | 'paused' | 'processing';

export const realtimeErrorCodes = [
  'bad_message',
  'unauthorized',
  'forbidden',
  'not_live',
  'not_configured',
  'stt_failed',
  'save_failed',
  'end_failed',
] as const;
export type RealtimeErrorCode = (typeof realtimeErrorCodes)[number];

/**
 * The subtitle language a student receives: their mother tongue when the lesson
 * translates into it, else English when available (SPEC §7), else none (Korean only).
 */
export function subtitleLanguageFor(
  motherTongue: string | null | undefined,
  targetLangs: readonly string[],
): string | null {
  if (motherTongue && targetLangs.includes(motherTongue)) return motherTongue;
  return targetLangs.includes(FALLBACK_LANGUAGE) ? FALLBACK_LANGUAGE : null;
}

export type ServerMessage =
  | {
      type: 'ready';
      lessonId: string;
      role: 'teacher' | 'student';
      status: RoomStatus;
      targetLangs: string[];
      /**
       * Students: the one language their translations arrive in (subtitleLanguageFor),
       * or null for Korean only. Teachers: null, they receive every target language.
       */
      language: string | null;
      /** Recent finals, with translations already filtered to `language` for students. */
      recent: LiveSegment[];
    }
  | { type: 'segment'; segment: LiveSegment }
  /**
   * Translations of a final, sent after it (finals go out as soon as they are saved).
   * Students get only their language; a final may never get one if translation fails.
   */
  | { type: 'translation'; seq: number; translations: Partial<Record<LanguageCode, string>> }
  | { type: 'status'; status: RoomStatus }
  /** Teachers only: students currently connected. */
  | { type: 'presence'; students: number }
  | { type: 'error'; code: RealtimeErrorCode };

/** WebSocket close codes (4000–4999 are free for applications). */
export const REALTIME_CLOSE = {
  ended: 4000,
  badMessage: 4400,
  unauthorized: 4401,
  forbidden: 4403,
  replaced: 4408,
  notLive: 4409,
  notConfigured: 4503,
} as const;
