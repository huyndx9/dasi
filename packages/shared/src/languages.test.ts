import { describe, expect, it } from 'vitest';
import {
  FALLBACK_LANGUAGE,
  getLanguage,
  isLanguageCode,
  LANGUAGES,
  selectableLanguages,
} from './languages';

describe('language registry', () => {
  it('uses unique two-letter ISO 639-1 codes', () => {
    const codes = LANGUAGES.map((l) => l.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const code of codes) expect(code).toMatch(/^[a-z]{2}$/);
  });

  it('gives every GA and Beta language a light and dark colour', () => {
    for (const l of selectableLanguages()) {
      expect(l.color?.light).toMatch(/^#[0-9A-F]{6}$/);
      expect(l.color?.dark).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it('keeps wave 1 GA, wave 2 Beta and wave 3 planned', () => {
    const expected = { 1: 'ga', 2: 'beta', 3: 'planned' } as const;
    for (const l of LANGUAGES) expect(l.status).toBe(expected[l.wave]);
  });

  it('does not treat Korean as a subtitle target', () => {
    expect(isLanguageCode('ko')).toBe(false);
  });

  it('falls back to a GA language', () => {
    expect(getLanguage(FALLBACK_LANGUAGE).status).toBe('ga');
  });
});
