import { describe, expect, it } from 'vitest';
import { createLlmProvider, createSttProvider, type SttResult } from './index';

describe('createSttProvider', () => {
  it('defaults to the mock adapter', () => {
    expect(createSttProvider({}).constructor.name).toBe('MockSttProvider');
  });

  it('names the available adapters for an unknown provider', () => {
    expect(() => createSttProvider({ STT_PROVIDER: 'soniox' })).toThrow(/Hiện có: mock/);
  });
});

describe('MockSttProvider', () => {
  it('emits a partial before each final', async () => {
    const stream = await createSttProvider({}).openStream({ languages: ['ko'] });
    const events: [string, SttResult][] = [];
    stream.on('partial', (r) => events.push(['partial', r]));
    stream.on('final', (r) => events.push(['final', r]));

    for (let i = 0; i < 20; i++) stream.write(new ArrayBuffer(6_400));

    expect(events.map(([kind]) => kind)).toEqual(['partial', 'final', 'partial', 'final']);
    expect(events[1]![1]).toMatchObject({
      text: '안녕하세요, 여러분.',
      lang: 'ko',
      startMs: 0,
      endMs: 2000,
    });
    expect(events[3]![1].startMs).toBe(2000);
  });

  it('reports an error when written after end', async () => {
    const stream = await createSttProvider({}).openStream({ languages: ['ko'] });
    const errors: Error[] = [];
    stream.on('error', (e) => errors.push(e));
    await stream.end();
    stream.write(new ArrayBuffer(10));
    expect(errors).toHaveLength(1);
  });
});

describe('MockLlmProvider', () => {
  it('translates into every target language', async () => {
    const out = await createLlmProvider({}).translate({
      text: '안녕',
      from: 'ko',
      to: ['vi', 'zh'],
    });
    expect(out).toEqual({ vi: '[vi] 안녕', zh: '[zh] 안녕' });
  });
});
