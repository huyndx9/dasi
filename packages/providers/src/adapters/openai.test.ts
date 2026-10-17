import type { ChatCompletionCreateParamsNonStreaming } from 'openai/resources/chat/completions';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createLlmProvider } from '../index';
import { OpenAiLlmProvider, type ChatClient } from './openai';

function fakeClient(...replies: (string | null)[]) {
  const create = vi.fn(async (_body: ChatCompletionCreateParamsNonStreaming) => ({
    choices: [{ message: { content: replies.shift() ?? null } }],
  }));
  return { client: { chat: { completions: { create } } } as ChatClient, create };
}

const opts = { apiKey: 'test', fastModel: 'fast-model', qualityModel: 'quality-model' };

describe('OpenAiLlmProvider.translate', () => {
  it('asks the fast model for every target language and returns them', async () => {
    const { client, create } = fakeClient('{"vi":"Tôi muốn ăn món Hàn.","zh":"我想吃韩国料理。"}');
    const llm = new OpenAiLlmProvider({ ...opts, client });

    const out = await llm.translate({
      text: '저는 한국 음식을 먹고 싶어요.',
      from: 'ko',
      to: ['vi', 'zh'],
      glossary: { '-고 싶다': 'muốn' },
    });

    expect(out).toEqual({ vi: 'Tôi muốn ăn món Hàn.', zh: '我想吃韩国料理。' });
    const body = create.mock.calls[0]![0];
    expect(body.model).toBe('fast-model');
    expect(body.response_format).toEqual({ type: 'json_object' });
    const user = body.messages[1]!.content as string;
    expect(user).toContain('Target languages: vi, zh');
    expect(user).toContain('-고 싶다 = muốn');
  });

  it('rejects a reply that misses a language', async () => {
    const { client } = fakeClient('{"vi":"Xin chào"}');
    const llm = new OpenAiLlmProvider({ ...opts, client });
    await expect(llm.translate({ text: '안녕', from: 'ko', to: ['vi', 'en'] })).rejects.toThrow();
  });

  it('skips the call when there is nothing to translate into', async () => {
    const { client, create } = fakeClient();
    await expect(
      new OpenAiLlmProvider({ ...opts, client }).translate({ text: '안녕', from: 'ko', to: [] }),
    ).resolves.toEqual({});
    expect(create).not.toHaveBeenCalled();
  });
});

describe('OpenAiLlmProvider.complete', () => {
  it('uses the quality model with a JSON schema and validates the reply', async () => {
    const { client, create } = fakeClient('{"words":["할인","계산"]}');
    const schema = z.object({ words: z.array(z.string()) });
    const out = await new OpenAiLlmProvider({ ...opts, client }).complete({
      system: 'Extract vocabulary.',
      prompt: '할인 좀 해 주세요. 계산은 어디서 해요?',
      schema,
    });

    expect(out).toEqual({ words: ['할인', '계산'] });
    const body = create.mock.calls[0]![0];
    expect(body.model).toBe('quality-model');
    expect(body.response_format).toMatchObject({ type: 'json_schema' });
  });

  it('reports invalid JSON and empty replies clearly', async () => {
    const schema = z.object({ ok: z.boolean() });
    const bad = new OpenAiLlmProvider({ ...opts, client: fakeClient('not json').client });
    await expect(bad.complete({ system: '', prompt: '', schema })).rejects.toThrow(/JSON/);
    const empty = new OpenAiLlmProvider({ ...opts, client: fakeClient(null).client });
    await expect(empty.complete({ system: '', prompt: '' })).rejects.toThrow(/rỗng/);
  });
});

describe('createLlmProvider("openai")', () => {
  it('names every missing setting', () => {
    expect(() => createLlmProvider({ LLM_PROVIDER: 'openai', OPENAI_API_KEY: 'k' })).toThrow(
      /LLM_MODEL_FAST, LLM_MODEL_QUALITY/,
    );
  });

  it('builds the adapter when configured', () => {
    const llm = createLlmProvider({
      LLM_PROVIDER: 'openai',
      OPENAI_API_KEY: 'k',
      LLM_MODEL_FAST: 'a',
      LLM_MODEL_QUALITY: 'b',
    });
    expect(llm).toBeInstanceOf(OpenAiLlmProvider);
  });
});
