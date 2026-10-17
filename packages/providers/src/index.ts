import { MockLlmProvider, MockSttProvider } from './adapters/mock';
import type { LlmProvider } from './llm';
import type { SttProvider } from './stt';

export type * from './llm';
export type * from './stt';
export type * from './tts';
export { MockLlmProvider, MockSttProvider };

/** Adapters that exist today. Real vendors are added after the STT spike (docs/ROADMAP.md). */
export const STT_PROVIDERS = ['mock'] as const;
export const LLM_PROVIDERS = ['mock'] as const;

export interface ProviderEnv {
  STT_PROVIDER?: string;
  LLM_PROVIDER?: string;
}

export function createSttProvider(env: ProviderEnv): SttProvider {
  const name = env.STT_PROVIDER ?? 'mock';
  switch (name) {
    case 'mock':
      return new MockSttProvider();
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
    default:
      throw new Error(
        `LLM_PROVIDER "${name}" chưa có adapter. Hiện có: ${LLM_PROVIDERS.join(', ')}.`,
      );
  }
}
