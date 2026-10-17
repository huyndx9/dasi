import { createLlmProvider } from '@dasi/providers';
import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { loadEnv } from './env';
import { finalizeLesson } from './finalize';
import { dispatch, LESSON_QUEUE, type JobHandlers } from './jobs';
import { createSupabaseStore } from './supabase-store';

const env = loadEnv();
const llm = createLlmProvider(env);
const store =
  env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
    ? createSupabaseStore(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
    : null;
if (!store) {
  console.warn(
    'Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY: job buổi học sẽ lỗi.',
  );
}

const handlers: JobHandlers = {
  'lesson.finalize': async ({ lessonId }) => {
    if (!store)
      throw new Error('Worker chưa có NEXT_PUBLIC_SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY');
    const result = await finalizeLesson(lessonId, { store, llm });
    console.info(`lesson.finalize ${lessonId}:`, result);
    return result;
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
