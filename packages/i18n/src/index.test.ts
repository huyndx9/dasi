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
    expect(t('vi', 'home.signIn')).toBe('Đăng nhập');
    expect(t('en', 'home.signIn')).toBe('Sign in');
  });

  it('fills placeholders and leaves unknown ones', () => {
    expect(t('vi', 'classes.studentCount', { n: 12 })).toBe('12 học sinh');
    expect(t('en', 'classDetail.noStudents', {})).toContain('{code}');
  });

  it('keeps the same placeholders in every locale', () => {
    const names = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const key of Object.keys(vi) as (keyof typeof vi)[]) {
      expect(names(en[key]), key).toEqual(names(vi[key]));
    }
  });

  it('falls back to English for unknown locales', () => {
    expect(t('uz', 'home.signIn')).toBe('Sign in');
    expect(getMessages('uz')['nav.join']).toBe('Join a class');
  });
});
