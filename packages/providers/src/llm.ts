import type { ZodType } from 'zod';

export interface TranslateInput {
  text: string;
  from: string;
  to: string[];
  glossary?: Record<string, string>;
}

export interface CompleteInput<T> {
  system: string;
  prompt: string;
  schema?: ZodType<T>;
}

export interface LlmProvider {
  /** Returns one translation per target language, keyed by language code. */
  translate(input: TranslateInput): Promise<Record<string, string>>;
  complete<T>(input: CompleteInput<T>): Promise<T>;
}
