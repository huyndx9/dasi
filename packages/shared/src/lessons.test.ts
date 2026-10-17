import { describe, expect, it } from 'vitest';
import { MAX_TARGET_LANGS_PER_LESSON, newLessonSchema, sourcesForFormat } from './schemas';

const valid = {
  classId: '10000000-0000-4000-8000-000000000001',
  title: ' Bài 7 – Mua sắm ',
  topic: '',
  format: 'hybrid',
  sources: ['mic', 'tab'],
  targetLangs: ['vi', 'zh', 'en'],
};

describe('newLessonSchema', () => {
  it('normalises text and defaults the display mode', () => {
    expect(newLessonSchema.parse(valid)).toMatchObject({
      title: 'Bài 7 – Mua sắm',
      topic: null,
      display: 'bilingual',
    });
  });

  it('matches the database limit on subtitle languages', () => {
    const six = ['vi', 'zh', 'en', 'uz', 'ne', 'mn'];
    expect(six.length).toBe(MAX_TARGET_LANGS_PER_LESSON + 1);
    expect(newLessonSchema.safeParse({ ...valid, targetLangs: six }).success).toBe(false);
  });

  it('rejects duplicates, unknown languages and missing sources', () => {
    expect(newLessonSchema.safeParse({ ...valid, targetLangs: ['vi', 'vi'] }).success).toBe(false);
    expect(newLessonSchema.safeParse({ ...valid, targetLangs: ['ko'] }).success).toBe(false);
    expect(newLessonSchema.safeParse({ ...valid, sources: [] }).success).toBe(false);
    expect(newLessonSchema.safeParse({ ...valid, sources: ['mic', 'mic'] }).success).toBe(false);
  });
});

describe('sourcesForFormat', () => {
  it('picks the audio sources for each lesson format', () => {
    expect(sourcesForFormat('room')).toEqual(['mic']);
    expect(sourcesForFormat('online')).toEqual(['tab']);
    expect(sourcesForFormat('hybrid')).toEqual(['mic', 'tab']);
  });
});
