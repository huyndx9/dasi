import { describe, expect, it } from 'vitest';
import { lessonHref, lessonMinutes, lessonStatusInfo } from './lessons';

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
