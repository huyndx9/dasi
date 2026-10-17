import { z } from 'zod';

const envSchema = z.object({
  REALTIME_PORT: z.coerce.number().int().positive().default(8787),
  REALTIME_HOST: z.string().default('0.0.0.0'),
  STT_PROVIDER: z.string().default('mock'),
  STT_MODEL: z.string().optional(),
  LLM_PROVIDER: z.string().default('mock'),
  // Read by @dasi/providers when STT_PROVIDER or LLM_PROVIDER is openai. Never logged or sent to clients.
  OPENAI_API_KEY: z.string().optional(),
  LLM_MODEL_FAST: z.string().optional(),
  LLM_MODEL_QUALITY: z.string().optional(),
  // Same Supabase project as the web app. The service role key bypasses RLS: server only.
  NEXT_PUBLIC_SUPABASE_URL: z.url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  // Queue for lesson.finalize. Unset: lessons still end, the job is skipped with a warning.
  REDIS_URL: z.url().optional(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Biến môi trường không hợp lệ:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}
