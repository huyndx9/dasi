import { createLlmProvider, createSttProvider, type SttProvider } from '@dasi/providers';
import { MAX_AUDIO_FRAME_BYTES } from '@dasi/shared';
import websocket from '@fastify/websocket';
import Fastify from 'fastify';
import { BullFinalizeQueue } from './bull-queue';
import type { Env } from './env';
import { RoomRegistry } from './room';
import type { FinalizeQueue, LessonStore } from './store';
import { SupabaseLessonStore } from './supabase-store';
import { registerGateway } from './ws';

export interface AppDeps {
  store: LessonStore | null;
  queue: FinalizeQueue | null;
  stt: SttProvider;
  helloTimeoutMs?: number;
}

/** Real dependencies from the environment. Missing Supabase or Redis settings disable that part. */
export function depsFromEnv(env: Env): AppDeps {
  return {
    store:
      env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
        ? new SupabaseLessonStore(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
        : null,
    queue: env.REDIS_URL ? new BullFinalizeQueue(env.REDIS_URL) : null,
    stt: createSttProvider(env),
  };
}

export function buildApp(env: Env, overrides: Partial<AppDeps> = {}) {
  const app = Fastify({ logger: { level: env.LOG_LEVEL } });

  // Fail at startup, not on the first lesson, if a provider is misconfigured.
  createLlmProvider(env);
  const deps = { ...depsFromEnv(env), ...overrides };
  if (!deps.store) {
    app.log.warn(
      'NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set: lessons cannot be joined',
    );
  }

  const rooms = deps.store
    ? new RoomRegistry({ store: deps.store, queue: deps.queue, stt: deps.stt, log: app.log })
    : null;

  app.get('/health', async () => ({
    status: 'ok',
    stt: env.STT_PROVIDER,
    llm: env.LLM_PROVIDER,
  }));

  app.register(websocket, { options: { maxPayload: MAX_AUDIO_FRAME_BYTES } });
  app.register(async (scoped) => {
    registerGateway(scoped, { store: deps.store, rooms, helloTimeoutMs: deps.helloTimeoutMs });
  });

  app.addHook('onClose', async () => {
    if (deps.queue instanceof BullFinalizeQueue) await deps.queue.close();
  });

  return app;
}
