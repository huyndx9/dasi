import { describe, expect, it } from 'vitest';
import en from './en.json';
import { getMessages, t } from './index';
import vi from './vi.json';

describe('i18n', () => {
  it('has every Vietnamese key in English', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(vi).sort());
  });

  it('has no empty strings', () => {
    for (const catalog of [vi, en]) {
      for (const value of Object.values(catalog)) expect(value.trim()).not.toBe('');
    }
  });

  it('returns the requested locale', () => {
    expect(t('vi', 'home.teacherCta')).toBe('Tôi là giáo viên');
    expect(t('en', 'home.teacherCta')).toBe("I'm a teacher");
  });

  it('falls back to English for unknown locales', () => {
    expect(t('uz', 'home.teacherCta')).toBe("I'm a teacher");
    expect(getMessages('uz')['home.studentCta']).toBe("I'm a student");
  });
});
