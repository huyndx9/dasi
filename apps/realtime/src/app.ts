import { createLlmProvider, createSttProvider } from '@dasi/providers';
import Fastify from 'fastify';
import type { Env } from './env';

export function buildApp(env: Env) {
  const app = Fastify({ logger: { level: env.LOG_LEVEL } });

  // Fail at startup, not on the first lesson, if a provider is misconfigured.
  createSttProvider(env);
  createLlmProvider(env);

  app.get('/health', async () => ({
    status: 'ok',
    stt: env.STT_PROVIDER,
    llm: env.LLM_PROVIDER,
  }));

  return app;
}
