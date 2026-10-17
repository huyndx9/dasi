/**
 * Background job contract shared by the job producer (apps/realtime) and the
 * consumer (apps/worker).
 */
export const LESSON_QUEUE = 'lessons';
export const LESSON_FINALIZE_JOB = 'lesson.finalize';

/**
 * One job per lesson: the job id makes a second "end" a no-op (BullMQ forbids `:` in
 * ids), and failures retry with backoff.
 */
export function lessonFinalizeJobOptions(lessonId: string) {
  return {
    jobId: `${LESSON_FINALIZE_JOB}-${lessonId}`,
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 10_000 },
    removeOnComplete: 1000,
    removeOnFail: 1000,
  };
}
