/**
 * Registry of subtitle languages. Every language code used anywhere in the app
 * must exist here (CLAUDE.md rule 5). Rollout waves and sources: docs/LANGUAGES.md.
 */

export type LanguageStatus = 'ga' | 'beta' | 'planned';

export interface Language {
  /** ISO 639-1 code. */
  code: string;
  /** Name in the language itself, shown to students. */
  nativeName: string;
  /** Vietnamese name, shown in the teacher UI. */
  viName: string;
  wave: 1 | 2 | 3;
  status: LanguageStatus;
  dir: 'ltr' | 'rtl';
  /** Font family needed for the script, if the UI font does not cover it. */
  font?: string;
  /** Fixed colour per language (docs/UI-UX.md). Planned languages have none yet. */
  color?: { light: string; dark: string };
}

export const LANGUAGES = [
  {
    code: 'vi',
    nativeName: 'Tiếng Việt',
    viName: 'Tiếng Việt',
    wave: 1,
    status: 'ga',
    dir: 'ltr',
    font: 'Be Vietnam Pro',
    color: { light: '#D9443A', dark: '#FF7A70' },
  },
  {
    code: 'zh',
    nativeName: '中文简体',
    viName: 'Tiếng Trung',
    wave: 1,
    status: 'ga',
    dir: 'ltr',
    color: { light: '#C98A0B', dark: '#F1B841' },
  },
  {
    code: 'en',
    nativeName: 'English',
    viName: 'Tiếng Anh',
    wave: 1,
    status: 'ga',
    dir: 'ltr',
    color: { light: '#2F6FD6', dark: '#6FA3FF' },
  },
  {
    code: 'uz',
    nativeName: 'Oʻzbekcha',
    viName: 'Tiếng Uzbek',
    wave: 2,
    status: 'beta',
    dir: 'ltr',
    color: { light: '#169C8C', dark: '#45CDBB' },
  },
  {
    code: 'ru',
    nativeName: 'Русский',
    viName: 'Tiếng Nga',
    wave: 2,
    status: 'beta',
    dir: 'ltr',
    color: { light: '#5A6C8F', dark: '#9AABCC' },
  },
  {
    code: 'ne',
    nativeName: 'नेपाली',
    viName: 'Tiếng Nepal',
    wave: 2,
    status: 'beta',
    dir: 'ltr',
    font: 'Noto Sans Devanagari',
    color: { light: '#8A4FD0', dark: '#B98AF5' },
  },
  {
    code: 'mn',
    nativeName: 'Монгол',
    viName: 'Tiếng Mông Cổ',
    wave: 2,
    status: 'beta',
    dir: 'ltr',
    color: { light: '#C2417F', dark: '#F07AB5' },
  },
  {
    code: 'th',
    nativeName: 'ไทย',
    viName: 'Tiếng Thái',
    wave: 2,
    status: 'beta',
    dir: 'ltr',
    font: 'Noto Sans Thai',
    color: { light: '#3B8F3E', dark: '#71C46F' },
  },
  {
    code: 'id',
    nativeName: 'Bahasa Indonesia',
    viName: 'Tiếng Indonesia',
    wave: 3,
    status: 'planned',
    dir: 'ltr',
  },
  {
    code: 'tl',
    nativeName: 'Tagalog',
    viName: 'Tiếng Tagalog',
    wave: 3,
    status: 'planned',
    dir: 'ltr',
  },
  {
    code: 'km',
    nativeName: 'ខ្មែរ',
    viName: 'Tiếng Khmer',
    wave: 3,
    status: 'planned',
    dir: 'ltr',
    font: 'Noto Sans Khmer',
  },
  {
    code: 'my',
    nativeName: 'မြန်မာ',
    viName: 'Tiếng Myanmar',
    wave: 3,
    status: 'planned',
    dir: 'ltr',
    font: 'Noto Sans Myanmar',
  },
  {
    code: 'ja',
    nativeName: '日本語',
    viName: 'Tiếng Nhật',
    wave: 3,
    status: 'planned',
    dir: 'ltr',
  },
] as const satisfies readonly Language[];

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

/** Korean is the teaching language, not a subtitle target, so it is kept out of LANGUAGES. */
export const SOURCE_LANGUAGE = 'ko';

/** Shown to a student whose mother tongue is not enabled in the class (SPEC §7). */
export const FALLBACK_LANGUAGE: LanguageCode = 'en';

/** A registry entry, with its code narrowed to the registered codes. */
export type RegisteredLanguage = Language & { code: LanguageCode };

const byCode = new Map<string, RegisteredLanguage>(LANGUAGES.map((l) => [l.code, l]));

export function isLanguageCode(code: string): code is LanguageCode {
  return byCode.has(code);
}

export function getLanguage(code: LanguageCode): RegisteredLanguage {
  return byCode.get(code)!;
}

/** Languages a class can pick as subtitle targets (GA and Beta). */
export function selectableLanguages(): RegisteredLanguage[] {
  return [...byCode.values()].filter((l) => l.status !== 'planned');
}
