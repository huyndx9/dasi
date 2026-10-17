import { z } from 'zod';

const envSchema = z.object({
  REALTIME_PORT: z.coerce.number().int().positive().default(8787),
  REALTIME_HOST: z.string().default('0.0.0.0'),
  STT_PROVIDER: z.string().default('mock'),
  LLM_PROVIDER: z.string().default('mock'),
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
