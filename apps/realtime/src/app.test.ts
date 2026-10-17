import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from './app';
import { loadEnv } from './env';

describe('realtime app', () => {
  let app: ReturnType<typeof buildApp> | undefined;
  afterEach(() => app?.close());

  it('reports health and the configured providers', async () => {
    app = buildApp(loadEnv({ LOG_LEVEL: 'silent' }));
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok', stt: 'mock', llm: 'mock' });
  });

  it('refuses to start with an unknown provider', () => {
    expect(() => buildApp(loadEnv({ LOG_LEVEL: 'silent', STT_PROVIDER: 'nope' }))).toThrow(
      /STT_PROVIDER "nope"/,
    );
  });
});

describe('loadEnv', () => {
  it('applies defaults', () => {
    expect(loadEnv({}).REALTIME_PORT).toBe(8787);
  });

  it('explains invalid values', () => {
    expect(() => loadEnv({ REALTIME_PORT: 'abc' })).toThrow(/REALTIME_PORT/);
  });
});
