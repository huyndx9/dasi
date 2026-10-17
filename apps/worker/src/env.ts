import { z } from 'zod';

const envSchema = z.object({
  REDIS_URL: z.url().default('redis://localhost:6379'),
  LLM_PROVIDER: z.string().default('mock'),
  // Read by @dasi/providers when LLM_PROVIDER=openai. Never logged or sent to clients.
  OPENAI_API_KEY: z.string().optional(),
  LLM_MODEL_FAST: z.string().optional(),
  LLM_MODEL_QUALITY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Biến môi trường không hợp lệ:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}
