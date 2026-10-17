import OpenAI from 'openai';
import type { ChatCompletionCreateParamsNonStreaming } from 'openai/resources/chat/completions';
import { z } from 'zod';
import type { CompleteInput, LlmProvider, TranslateInput } from '../llm';

/** The part of the OpenAI client this adapter uses, so tests can pass a fake. */
export interface ChatClient {
  chat: {
    completions: {
      create(
        body: ChatCompletionCreateParamsNonStreaming,
      ): Promise<{ choices: { message: { content: string | null } }[] }>;
    };
  };
}

export interface OpenAiLlmOptions {
  apiKey: string;
  /** Model for realtime translation and the teaching assistant (low latency). */
  fastModel: string;
  /** Model for post-lesson material (summary, vocabulary, exercises). */
  qualityModel: string;
  client?: ChatClient;
}

const TRANSLATE_SYSTEM = [
  'You translate Korean spoken by a teacher in a Korean-language class into the students’ mother tongues.',
  'Translate meaning naturally for a learner; keep Korean grammar patterns such as -고 싶다 or -아/어서 exactly as written.',
  'Answer with one JSON object. Its keys are exactly the requested ISO 639-1 codes and each value is the translation.',
].join(' ');

export class OpenAiLlmProvider implements LlmProvider {
  private readonly client: ChatClient;

  constructor(private readonly opts: OpenAiLlmOptions) {
    this.client = opts.client ?? new OpenAI({ apiKey: opts.apiKey });
  }

  async translate({ text, from, to, glossary }: TranslateInput): Promise<Record<string, string>> {
    if (to.length === 0) return {};
    const glossaryLines = Object.entries(glossary ?? {}).map(
      ([ko, meaning]) => `${ko} = ${meaning}`,
    );
    const content = await this.chat({
      model: this.opts.fastModel,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: TRANSLATE_SYSTEM },
        {
          role: 'user',
          content: [
            `Source language: ${from}`,
            `Target languages: ${to.join(', ')}`,
            ...(glossaryLines.length ? ['Class glossary:', ...glossaryLines] : []),
            `Text: ${text}`,
          ].join('\n'),
        },
      ],
    });
    const shape = z.object(Object.fromEntries(to.map((code) => [code, z.string().min(1)])));
    return shape.parse(parseJson(content)) as Record<string, string>;
  }

  async complete<T>({ system, prompt, schema }: CompleteInput<T>): Promise<T> {
    const content = await this.chat({
      model: this.opts.qualityModel,
      ...(schema
        ? {
            response_format: {
              type: 'json_schema',
              json_schema: {
                name: 'result',
                schema: z.toJSONSchema(schema) as Record<string, unknown>,
              },
            },
          }
        : {}),
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
    });
    return schema ? schema.parse(parseJson(content)) : (content as T);
  }

  private async chat(body: ChatCompletionCreateParamsNonStreaming): Promise<string> {
    const res = await this.client.chat.completions.create(body);
    const content = res.choices[0]?.message.content;
    if (!content) throw new Error('OpenAI trả về phản hồi rỗng');
    return content;
  }
}

function parseJson(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    throw new Error(`OpenAI không trả về JSON hợp lệ: ${content.slice(0, 120)}`);
  }
}
