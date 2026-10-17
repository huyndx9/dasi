import { describe, expect, it } from 'vitest';
import {
  INVITE_CODE_ALPHABET,
  inviteCodeSchema,
  languageCodeSchema,
  segmentSchema,
} from './schemas';

describe('inviteCodeSchema', () => {
  it('normalises case and whitespace', () => {
    expect(inviteCodeSchema.parse(' ab3k9z ')).toBe('AB3K9Z');
  });

  it('rejects ambiguous characters and wrong length', () => {
    expect(inviteCodeSchema.safeParse('AB0K9Z').success).toBe(false);
    expect(inviteCodeSchema.safeParse('ABIK9Z').success).toBe(false);
    expect(inviteCodeSchema.safeParse('AB3K9').success).toBe(false);
  });

  it('accepts every character of the generator alphabet', () => {
    for (let i = 0; i < INVITE_CODE_ALPHABET.length; i += 6) {
      const code = INVITE_CODE_ALPHABET.slice(i, i + 6).padEnd(6, 'A');
      expect(inviteCodeSchema.safeParse(code).success).toBe(true);
    }
  });
});

describe('segmentSchema', () => {
  const base = {
    lessonId: '6f1c1f7e-3a0b-4c55-9d43-1f0a0f3f2b10',
    seq: 0,
    state: 'final',
    source: 'mic',
    text: '오늘은 존댓말을 배워요.',
    startMs: 0,
    endMs: 1800,
  };

  it('accepts translations keyed by supported languages', () => {
    const s = segmentSchema.parse({ ...base, translations: { vi: 'Hôm nay học kính ngữ.' } });
    expect(s.translations.vi).toBe('Hôm nay học kính ngữ.');
  });

  it('rejects unsupported translation languages', () => {
    expect(segmentSchema.safeParse({ ...base, translations: { xx: '?' } }).success).toBe(false);
  });

  it('defaults translations to empty', () => {
    expect(segmentSchema.parse(base).translations).toEqual({});
  });
});

describe('languageCodeSchema', () => {
  it('accepts registry codes only', () => {
    expect(languageCodeSchema.parse('vi')).toBe('vi');
    expect(languageCodeSchema.safeParse('ko').success).toBe(false);
  });
});
