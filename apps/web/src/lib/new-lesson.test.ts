import { describe, expect, it } from 'vitest';
import {
  canStart,
  choiceOf,
  defaultLessonTitle,
  mediaErrorKey,
  parseSavedChoice,
  savedChoiceKey,
  sourcesOf,
  subtitleLanguages,
} from './new-lesson';

const members = (...codes: string[]) => codes.map((mother_tongue) => ({ mother_tongue }));

describe('subtitleLanguages', () => {
  it('uses every mother tongue of the class, largest group first', () => {
    expect(subtitleLanguages(members('zh', 'vi', 'vi', 'en'))).toEqual({
      langs: ['vi', 'en', 'zh'],
      uncovered: 0,
    });
  });

  it('caps at five languages and gives English the last slot when students are left out', () => {
    const roster = members(...['vi', 'vi', 'vi', 'zh', 'zh', 'uz', 'uz', 'ru', 'ne', 'mn', 'th']);
    const { langs, uncovered } = subtitleLanguages(roster);
    expect(langs).toHaveLength(5);
    expect(langs.slice(0, 3)).toEqual(['vi', 'uz', 'zh']);
    expect(langs.at(-1)).toBe('en');
    // 7 languages, 4 kept besides English → 3 languages with one student each left out
    expect(uncovered).toBe(3);
  });

  it('is empty for a class without students', () => {
    expect(subtitleLanguages([])).toEqual({ langs: [], uncovered: 0 });
  });
});

describe('defaultLessonTitle', () => {
  it('adds the day and month with slashes', () => {
    expect(defaultLessonTitle('Buổi', new Date(2026, 9, 7), 'vi')).toBe('Buổi 07/10');
  });
});

describe('sources', () => {
  it('converts between the picker value and the stored list', () => {
    expect(sourcesOf('both')).toEqual(['mic', 'tab']);
    expect(sourcesOf('tab')).toEqual(['tab']);
    expect(choiceOf(['mic', 'tab'])).toBe('both');
    expect(choiceOf(['mic'])).toBe('mic');
  });

  it('only allows starting when every selected source is ready', () => {
    const states = {
      mic: { kind: 'ready', label: 'Micro' },
      tab: { kind: 'error', message: 'newLesson.errorTabNoAudio' },
    } as const;
    expect(canStart(['mic'], states)).toBe(true);
    expect(canStart(['mic', 'tab'], states)).toBe(false);
  });
});

describe('mediaErrorKey', () => {
  const err = (name: string) => Object.assign(new Error(name), { name });

  it('explains microphone problems', () => {
    expect(mediaErrorKey('mic', err('NotAllowedError'))).toBe('newLesson.errorMicDenied');
    expect(mediaErrorKey('mic', err('NotFoundError'))).toBe('newLesson.errorMicMissing');
    expect(mediaErrorKey('mic', err('NotReadableError'))).toBe('newLesson.errorMicBusy');
    expect(mediaErrorKey('mic', 'weird')).toBe('newLesson.errorMicOther');
  });

  it('explains tab sharing problems, including a tab without audio', () => {
    expect(mediaErrorKey('tab', err('NotAllowedError'))).toBe('newLesson.errorTabCancelled');
    expect(mediaErrorKey('tab', { name: 'NoAudioTrack' })).toBe('newLesson.errorTabNoAudio');
    expect(mediaErrorKey('tab', err('TypeError'))).toBe('newLesson.errorTabUnsupported');
  });
});

describe('parseSavedChoice', () => {
  it('reads a valid saved choice per class', () => {
    const saved = { format: 'online', sources: ['tab'], display: 'hidden', textbook: '세종 2' };
    expect(parseSavedChoice(JSON.stringify(saved))).toEqual(saved);
    expect(savedChoiceKey('abc')).toBe('dasi.newLesson.abc');
  });

  it('ignores missing, broken or outdated data', () => {
    expect(parseSavedChoice(null)).toBeNull();
    expect(parseSavedChoice('{not json')).toBeNull();
    expect(parseSavedChoice('{"format":"zoom","sources":[],"display":"x"}')).toBeNull();
  });
});
