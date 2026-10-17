import { MockLlmProvider, MockSttProvider } from './adapters/mock';
import { OpenAiLlmProvider } from './adapters/openai';
import { OpenAiSttProvider } from './adapters/openai-stt';
import type { LlmProvider } from './llm';
import type { SttProvider } from './stt';

export type * from './llm';
export type * from './stt';
export type * from './tts';
export { MockLlmProvider, MockSttProvider, OpenAiLlmProvider, OpenAiSttProvider };

export const STT_PROVIDERS = ['mock', 'openai'] as const;
export const LLM_PROVIDERS = ['mock', 'openai'] as const;

export interface ProviderEnv {
  STT_PROVIDER?: string;
  LLM_PROVIDER?: string;
  OPENAI_API_KEY?: string;
  STT_MODEL?: string;
  LLM_MODEL_FAST?: string;
  LLM_MODEL_QUALITY?: string;
}

export function createSttProvider(env: ProviderEnv): SttProvider {
  const name = env.STT_PROVIDER ?? 'mock';
  switch (name) {
    case 'mock':
      return new MockSttProvider();
    case 'openai': {
      const missing = (['OPENAI_API_KEY', 'STT_MODEL'] as const).filter((key) => !env[key]);
      if (missing.length) {
        throw new Error(`STT_PROVIDER=openai cần thêm biến môi trường: ${missing.join(', ')}.`);
      }
      return new OpenAiSttProvider({ apiKey: env.OPENAI_API_KEY!, model: env.STT_MODEL! });
    }
    default:
      throw new Error(
        `STT_PROVIDER "${name}" chưa có adapter. Hiện có: ${STT_PROVIDERS.join(', ')}.`,
      );
  }
}

export function createLlmProvider(env: ProviderEnv): LlmProvider {
  const name = env.LLM_PROVIDER ?? 'mock';
  switch (name) {
    case 'mock':
      return new MockLlmProvider();
    case 'openai': {
      const missing = (['OPENAI_API_KEY', 'LLM_MODEL_FAST', 'LLM_MODEL_QUALITY'] as const).filter(
        (key) => !env[key],
      );
      if (missing.length) {
        throw new Error(`LLM_PROVIDER=openai cần thêm biến môi trường: ${missing.join(', ')}.`);
      }
      return new OpenAiLlmProvider({
        apiKey: env.OPENAI_API_KEY!,
        fastModel: env.LLM_MODEL_FAST!,
        qualityModel: env.LLM_MODEL_QUALITY!,
      });
    }
    default:
      throw new Error(
        `LLM_PROVIDER "${name}" chưa có adapter. Hiện có: ${LLM_PROVIDERS.join(', ')}.`,
      );
  }
}
