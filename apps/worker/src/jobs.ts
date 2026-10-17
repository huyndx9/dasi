import type { JobsOptions } from 'bullmq';
import { z } from 'zod';

export const LESSON_QUEUE = 'lessons';

/** Payload schemas per job name. The realtime gateway enqueues `lesson.finalize` when a lesson ends. */
export const jobSchemas = {
  'lesson.finalize': z.object({ lessonId: z.uuid() }),
} as const;

/**
 * Options the producer passes to `queue.add`: limited retries with backoff, and the lesson id
 * as job id so ending a lesson twice queues one job.
 */
export function lessonJobOptions(lessonId: string): JobsOptions {
  return {
    jobId: `lesson.finalize-${lessonId}`,
    attempts: 3,
    backoff: { type: 'exponential', delay: 30_000 },
    removeOnComplete: 1_000,
    removeOnFail: 5_000,
  };
}

export type JobName = keyof typeof jobSchemas;
export type JobData<N extends JobName> = z.infer<(typeof jobSchemas)[N]>;

export type JobHandlers = { [N in JobName]: (data: JobData<N>) => Promise<unknown> };

export function isJobName(name: string): name is JobName {
  return Object.hasOwn(jobSchemas, name);
}

/** Validates the payload and routes a job to its handler. */
export async function dispatch(handlers: JobHandlers, name: string, data: unknown) {
  if (!isJobName(name)) throw new Error(`Job không xác định: ${name}`);
  const payload = jobSchemas[name].parse(data);
  return handlers[name](payload);
}
