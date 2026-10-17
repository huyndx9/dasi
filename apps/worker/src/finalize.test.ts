import { OpenAiLlmProvider, type LlmProvider } from '@dasi/providers';
import { describe, expect, it, vi } from 'vitest';
import {
  finalizeLesson,
  MAX_TRANSCRIPT_CHARS,
  MAX_VOCAB,
  transcriptLines,
  type FinalizeLesson,
  type FinalizeSegment,
  type LessonMaterials,
  type LessonStore,
} from './finalize';
import { LESSON_FINALIZE_JOB } from '@dasi/shared';
import { jobSchemas } from './jobs';

const lessonId = '6f1c1f7e-3a0b-4c55-9d43-1f0a0f3f2b10';

const segments: FinalizeSegment[] = [
  { id: 's1', seq: 1, text: '이 가방 할인 좀 해 주세요.' },
  { id: 's0', seq: 0, text: '오늘은 쇼핑할 때 쓰는 표현을 배워요.' },
  { id: 's2', seq: 2, text: '배가 고파서 밥을 먹고 싶어요.' },
];

/** In-memory LessonStore that applies writes the way the Supabase store does. */
function memoryStore(lesson: Partial<FinalizeLesson> = {}) {
  const state = {
    lesson: {
      id: lessonId,
      status: 'processing',
      title: 'Bài 7 – Mua sắm',
      topic: '-아/어서, -고 싶다',
      target_langs: ['vi', 'zh'],
      ...lesson,
    } as FinalizeLesson,
    materials: undefined as LessonMaterials | undefined,
    error: undefined as string | undefined,
    saves: 0,
  };
  const store: LessonStore = {
    getLesson: async (id) => (id === lessonId ? state.lesson : null),
    getSegments: async () => segments,
    saveMaterials: async (_id, m) => {
      state.materials = m;
      state.saves++;
      state.lesson = { ...state.lesson, status: 'review' };
      state.error = undefined;
    },
    recordError: async (_id, message) => {
      state.error = message;
    },
  };
  return { store, state };
}

const materialsReply = {
  summary: '쇼핑할 때 할인을 부탁하는 표현과 -아/어서, -고 싶다를 배웠어요.',
  vocab: [
    {
      ko: '할인',
      pos: 'noun',
      topikLevel: 2,
      exampleSeq: 1,
      meanings: { vi: 'giảm giá', zh: '打折' },
    },
    {
      ko: '-고 싶다',
      pos: 'grammar',
      topikLevel: 1,
      exampleSeq: 2,
      meanings: { vi: 'muốn', zh: '想' },
    },
    // Duplicate and a reference to a line that does not exist.
    { ko: '할인', pos: 'noun', topikLevel: 2, exampleSeq: 1, meanings: { vi: 'x', zh: 'x' } },
    {
      ko: '가방',
      pos: 'noun',
      topikLevel: null,
      exampleSeq: 99,
      meanings: { vi: 'túi', zh: '包' },
    },
  ],
};

/** OpenAiLlmProvider with a fake client: JSON materials from the quality model, translations from the fast one. */
function openAi(reply: unknown = materialsReply) {
  const create = vi.fn(async (body: { model: string }) => ({
    choices: [
      {
        message: {
          content: JSON.stringify(
            body.model === 'quality'
              ? reply
              : { vi: 'Học cách xin giảm giá khi mua sắm.', zh: '学习了购物时请求打折。' },
          ),
        },
      },
    ],
  }));
  const llm = new OpenAiLlmProvider({
    apiKey: 'test',
    fastModel: 'fast',
    qualityModel: 'quality',
    client: { chat: { completions: { create } } } as never,
  });
  return { llm, create };
}

describe('finalizeLesson', () => {
  it('writes the summary in Korean and every class language, and the vocabulary, then moves to review', async () => {
    const { store, state } = memoryStore();
    const { llm, create } = openAi();

    await expect(finalizeLesson(lessonId, { store, llm })).resolves.toEqual({
      lessonId,
      status: 'review',
      vocab: 3,
      summaries: 3,
    });

    expect(state.lesson.status).toBe('review');
    expect(state.materials!.summaries).toEqual([
      { lang: 'ko', text: materialsReply.summary },
      { lang: 'vi', text: 'Học cách xin giảm giá khi mua sắm.' },
      { lang: 'zh', text: '学习了购物时请求打折。' },
    ]);
    expect(state.materials!.vocab).toEqual([
      {
        position: 0,
        ko: '할인',
        pos: 'noun',
        topikLevel: 2,
        exampleKo: '이 가방 할인 좀 해 주세요.',
        segmentId: 's1',
        meanings: { vi: 'giảm giá', zh: '打折' },
      },
      expect.objectContaining({ position: 1, ko: '-고 싶다', segmentId: 's2' }),
      // Example pointing at an unknown line is dropped rather than invented.
      expect.objectContaining({ position: 2, ko: '가방', exampleKo: null, segmentId: null }),
    ]);

    // One structured call to the quality model with the transcript in speaking order.
    const first = create.mock.calls[0]![0] as {
      model: string;
      response_format: { type: string };
      messages: { content: string }[];
    };
    expect(first.model).toBe('quality');
    expect(first.response_format.type).toBe('json_schema');
    const prompt = first.messages[1]!.content;
    expect(prompt).toContain('Meaning languages (ISO 639-1): vi, zh');
    expect(prompt.indexOf('[0] 오늘은')).toBeLessThan(prompt.indexOf('[1] 이 가방'));
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('rejects a reply that misses a class language and records the error for the teacher', async () => {
    const { store, state } = memoryStore();
    const bad = {
      ...materialsReply,
      vocab: [{ ...materialsReply.vocab[0], meanings: { vi: 'giảm giá' } }],
    };
    await expect(finalizeLesson(lessonId, { store, llm: openAi(bad).llm })).rejects.toThrow();
    expect(state.lesson.status).toBe('processing');
    expect(state.error).toBeTruthy();
    expect(state.saves).toBe(0);
  });

  it('is safe to run again: a retry replaces the materials, a finished lesson is left alone', async () => {
    const { store, state } = memoryStore();
    const failing: LlmProvider = {
      complete: vi.fn().mockRejectedValueOnce(new Error('rate limited')),
      translate: vi.fn(),
    };
    await expect(finalizeLesson(lessonId, { store, llm: failing })).rejects.toThrow('rate limited');
    expect(state.error).toBe('rate limited');

    await finalizeLesson(lessonId, { store, llm: openAi().llm });
    expect(state.saves).toBe(1);
    expect(state.error).toBeUndefined();

    // A duplicate job after the teacher started reviewing must not overwrite their edits.
    const again = openAi();
    await expect(finalizeLesson(lessonId, { store, llm: again.llm })).resolves.toEqual({
      lessonId,
      skipped: 'status-review',
    });
    expect(again.create).not.toHaveBeenCalled();
    expect(state.saves).toBe(1);
  });

  it('skips unknown and still-live lessons', async () => {
    const { llm } = openAi();
    await expect(
      finalizeLesson('00000000-0000-0000-0000-000000000000', { store: memoryStore().store, llm }),
    ).resolves.toEqual({ lessonId: '00000000-0000-0000-0000-000000000000', skipped: 'not-found' });
    await expect(
      finalizeLesson(lessonId, { store: memoryStore({ status: 'live' }).store, llm }),
    ).resolves.toEqual({ lessonId, skipped: 'status-live' });
  });

  it('handles a lesson without subtitle languages and caps the vocabulary', async () => {
    const { store, state } = memoryStore({ target_langs: [] });
    const many = {
      summary: '요약',
      vocab: Array.from({ length: MAX_VOCAB + 5 }, (_, i) => ({
        ko: `단어${i}`,
        pos: 'noun',
        topikLevel: null,
        exampleSeq: null,
        meanings: {},
      })),
    };
    const { llm, create } = openAi(many);
    await finalizeLesson(lessonId, { store, llm });
    expect(state.materials!.summaries).toEqual([{ lang: 'ko', text: '요약' }]);
    expect(state.materials!.vocab).toHaveLength(MAX_VOCAB);
    expect(create).toHaveBeenCalledTimes(1); // nothing to translate into
  });
});

describe('transcriptLines', () => {
  it('orders by seq, skips empty lines and stops at the size limit', () => {
    expect(
      transcriptLines([
        { id: 'b', seq: 1, text: ' 둘 ' },
        { id: 'a', seq: 0, text: '하나' },
        { id: 'c', seq: 2, text: '   ' },
      ]),
    ).toEqual(['[0] 하나', '[1] 둘']);

    const long = Array.from({ length: 2000 }, (_, i) => ({
      id: `${i}`,
      seq: i,
      text: '가'.repeat(50),
    }));
    const lines = transcriptLines(long);
    expect(lines.join('\n').length).toBeLessThanOrEqual(MAX_TRANSCRIPT_CHARS);
    expect(lines.length).toBeLessThan(2000);
  });
});

describe('job contract', () => {
  it('handles the job name the producer enqueues (@dasi/shared)', () => {
    expect(Object.keys(jobSchemas)).toEqual([LESSON_FINALIZE_JOB]);
  });
});
