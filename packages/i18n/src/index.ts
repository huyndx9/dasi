import en from './en.json';
import vi from './vi.json';

/** Vietnamese is the source locale: every key must exist in vi.json. */
export type MessageKey = keyof typeof vi;
export type Messages = Record<MessageKey, string>;

export const SOURCE_LOCALE = 'vi';

const catalogs: Record<string, Partial<Messages>> = { vi, en };

export const locales = Object.keys(catalogs);

/**
 * Look up a UI string. Missing keys fall back to English, then Vietnamese, so a
 * Beta language with a partial catalogue still renders (docs/LANGUAGES.md).
 */
export function t(locale: string, key: MessageKey): string {
  return catalogs[locale]?.[key] ?? en[key as keyof typeof en] ?? vi[key];
}

export function getMessages(locale: string): Messages {
  return { ...vi, ...en, ...catalogs[locale] } as Messages;
}
