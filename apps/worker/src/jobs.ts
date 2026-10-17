import { LESSON_FINALIZE_JOB } from '@dasi/shared';
import { z } from 'zod';

// Queue name and job options are shared with the producer (apps/realtime): @dasi/shared jobs.ts.
export { LESSON_QUEUE } from '@dasi/shared';

/** Payload schemas per job name. The realtime gateway enqueues `lesson.finalize` when a lesson ends. */
export const jobSchemas = {
  [LESSON_FINALIZE_JOB]: z.object({ lessonId: z.uuid() }),
} as const;

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
