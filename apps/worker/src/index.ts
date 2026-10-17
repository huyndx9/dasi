import { createLlmProvider } from '@dasi/providers';
import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { loadEnv } from './env';
import { dispatch, LESSON_QUEUE, type JobHandlers } from './jobs';

const env = loadEnv();
createLlmProvider(env);

const handlers: JobHandlers = {
  // Summary, vocabulary and exercises are built in Phase 1 (docs/ROADMAP.md).
  'lesson.finalize': async ({ lessonId }) => {
    console.info(`lesson.finalize ${lessonId}: chưa triển khai`);
    return { lessonId, skipped: true };
  },
};

// BullMQ 6 needs a ready client in ESM; workers must not cap retries per request.
const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });

const worker = new Worker(LESSON_QUEUE, (job) => dispatch(handlers, job.name, job.data), {
  connection,
});

worker.on('failed', (job, err) => console.error(`${job?.name} ${job?.id} lỗi:`, err.message));

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void worker
      .close()
      .then(() => connection.quit())
      .then(() => process.exit(0));
  });
}

console.info(`Worker đang nghe hàng đợi "${LESSON_QUEUE}"`);
