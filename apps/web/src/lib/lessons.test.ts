import { describe, expect, it } from 'vitest';
import {
  formatOffset,
  lessonHref,
  lessonMinutes,
  lessonStatusInfo,
  parseLessonTab,
  processingSteps,
  transcriptLanguage,
} from './lessons';

describe('lessonStatusInfo', () => {
  it('maps every status to a label and the UI-UX colour', () => {
    expect(lessonStatusInfo('live')).toEqual({ label: 'lessonStatus.live', tone: 'live' });
    expect(lessonStatusInfo('processing').tone).toBe('muted');
    expect(lessonStatusInfo('review').tone).toBe('warn');
    expect(lessonStatusInfo('published').tone).toBe('learn');
  });
});

describe('lessonMinutes', () => {
  it('rounds the length of a finished lesson to minutes', () => {
    expect(lessonMinutes('2026-10-14T09:00:00Z', '2026-10-14T09:42:20Z')).toBe(42);
  });

  it('counts a live lesson up to now and never goes negative', () => {
    const now = new Date('2026-10-14T09:10:00Z');
    expect(lessonMinutes('2026-10-14T09:00:00Z', null, now)).toBe(10);
    expect(lessonMinutes('2026-10-14T09:20:00Z', null, now)).toBe(0);
  });
});

describe('lessonHref', () => {
  it('opens the live screen while teaching, otherwise the detail page', () => {
    expect(lessonHref({ id: 'a', status: 'live' })).toBe('/lessons/a/live');
    expect(lessonHref({ id: 'a', status: 'review' })).toBe('/lessons/a');
  });
});

describe('formatOffset', () => {
  it('shows minutes and seconds, adding hours past one hour', () => {
    expect(formatOffset(0)).toBe('00:00');
    expect(formatOffset(245_900)).toBe('04:05');
    expect(formatOffset(3_723_000)).toBe('1:02:03');
    expect(formatOffset(-5)).toBe('00:00');
  });
});

describe('lesson tabs and languages', () => {
  it('falls back to the transcript tab and to the first lesson language', () => {
    expect(parseLessonTab('vocab')).toBe('vocab');
    expect(parseLessonTab('nope')).toBe('transcript');
    expect(parseLessonTab(undefined)).toBe('transcript');
    expect(transcriptLanguage('zh', ['vi', 'zh'])).toBe('zh');
    expect(transcriptLanguage('uz', ['vi', 'zh'])).toBe('vi');
    expect(transcriptLanguage(undefined, [])).toBeNull();
  });
});

describe('processingSteps', () => {
  it('runs the AI step while processing, fails it on error, and finishes it in review', () => {
    expect(processingSteps('processing', null).map((s) => s.state)).toEqual([
      'done',
      'done',
      'running',
    ]);
    expect(processingSteps('processing', 'rate limited').at(-1)!.state).toBe('failed');
    expect(processingSteps('review', null).every((s) => s.state === 'done')).toBe(true);
  });
});
