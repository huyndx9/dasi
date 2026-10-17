import { describe, expect, it } from 'vitest';
import { lessonFinalizeJobOptions } from './jobs';
import { clientMessageSchema, liveSegmentSchema, subtitleLanguageFor } from './realtime';

describe('clientMessageSchema', () => {
  it('accepts hello for teachers (with source) and students', () => {
    expect(
      clientMessageSchema.parse({ type: 'hello', token: 't', role: 'teacher', source: 'tab' }),
    ).toMatchObject({ source: 'tab' });
    expect(
      clientMessageSchema.safeParse({ type: 'hello', token: 't', role: 'student' }).success,
    ).toBe(true);
  });

  it('rejects unknown types, empty tokens and unknown sources', () => {
    expect(clientMessageSchema.safeParse({ type: 'shout' }).success).toBe(false);
    expect(
      clientMessageSchema.safeParse({ type: 'hello', token: '', role: 'student' }).success,
    ).toBe(false);
    expect(
      clientMessageSchema.safeParse({ type: 'hello', token: 't', role: 'teacher', source: 'usb' })
        .success,
    ).toBe(false);
  });
});

describe('liveSegmentSchema', () => {
  it('does not need a lesson id', () => {
    const s = liveSegmentSchema.parse({
      seq: 3,
      state: 'final',
      source: 'mic',
      text: '안녕하세요',
      startMs: 0,
      endMs: 900,
    });
    expect(s.translations).toEqual({});
  });
});

describe('lessonFinalizeJobOptions', () => {
  it('uses one job id per lesson without colons', () => {
    const opts = lessonFinalizeJobOptions('20000000-0000-4000-8000-000000000001');
    expect(opts.jobId).toBe('lesson.finalize-20000000-0000-4000-8000-000000000001');
    expect(opts.jobId).not.toContain(':');
    expect(opts.attempts).toBe(3);
  });
});

describe('subtitleLanguageFor', () => {
  it('uses the mother tongue when the lesson translates into it', () => {
    expect(subtitleLanguageFor('zh', ['vi', 'zh', 'en'])).toBe('zh');
  });

  it('falls back to English, then to Korean only', () => {
    expect(subtitleLanguageFor('uz', ['vi', 'en'])).toBe('en');
    expect(subtitleLanguageFor(null, ['vi', 'en'])).toBe('en');
    expect(subtitleLanguageFor('uz', ['vi', 'zh'])).toBeNull();
  });
});
