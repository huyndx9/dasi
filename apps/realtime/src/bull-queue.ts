import { LESSON_FINALIZE_JOB, LESSON_QUEUE, lessonFinalizeJobOptions } from '@dasi/shared';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import type { FinalizeQueue } from './store';

/** BullMQ producer for lesson.finalize. Connects on first use, so startup never waits on Redis. */
export class BullFinalizeQueue implements FinalizeQueue {
  private queue: Queue | undefined;
  private connection: Redis | undefined;

  constructor(private readonly redisUrl: string) {}

  async enqueue(lessonId: string): Promise<void> {
    if (!this.queue) {
      this.connection = new Redis(this.redisUrl, { maxRetriesPerRequest: null });
      this.queue = new Queue(LESSON_QUEUE, { connection: this.connection });
    }
    await this.queue.add(LESSON_FINALIZE_JOB, { lessonId }, lessonFinalizeJobOptions(lessonId));
  }

  async close(): Promise<void> {
    await this.queue?.close();
    await this.connection?.quit();
  }
}
