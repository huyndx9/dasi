import type { AudioSource, LiveSegment } from '@dasi/shared';

/** What a user may do in a lesson, decided by the store from the database. */
export interface LessonAccess {
  lessonId: string;
  role: 'teacher' | 'student';
  status: 'live' | 'processing' | 'review' | 'published';
  sources: AudioSource[];
  targetLangs: string[];
  startedAt: Date;
  /** Students: mother tongue chosen in this class (class_members). Teachers: null. */
  motherTongue: string | null;
}

/** Persistence used by the gateway. The Supabase implementation uses the service role. */
export interface LessonStore {
  /** User id for a valid Supabase access token, else null. */
  authenticate(token: string): Promise<string | null>;
  /** The user's access to the lesson, or null when they are neither its teacher nor a member. */
  loadAccess(lessonId: string, userId: string): Promise<LessonAccess | null>;
  /** Seq for the next final segment (0 for a new lesson; continues after a reconnect). */
  nextSeq(lessonId: string): Promise<number>;
  /** Stores a final segment and returns its id (segment_translations reference it). */
  saveFinal(lessonId: string, segment: LiveSegment): Promise<string>;
  saveTranslations(segmentId: string, translations: Record<string, string>): Promise<void>;
  markProcessing(lessonId: string, endedAt: Date): Promise<void>;
}

/** Queues post-class processing (apps/worker → lesson.finalize). */
export interface FinalizeQueue {
  enqueue(lessonId: string): Promise<void>;
}
