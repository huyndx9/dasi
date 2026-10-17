import en from './en.json';
import vi from './vi.json';

/** Vietnamese is the source locale: every key must exist in vi.json. */
export type MessageKey = keyof typeof vi;
export type Messages = Record<MessageKey, string>;

export const SOURCE_LOCALE = 'vi';

const catalogs: Record<string, Partial<Messages>> = { vi, en };

export const locales = Object.keys(catalogs);

/**
 * Look up a UI string and fill `{name}` placeholders. Missing keys fall back to
 * English, then Vietnamese, so a Beta language with a partial catalogue still
 * renders (docs/LANGUAGES.md).
 */
export function t(locale: string, key: MessageKey, vars?: Record<string, string | number>): string {
  const template = catalogs[locale]?.[key] ?? en[key as keyof typeof en] ?? vi[key];
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

export function getMessages(locale: string): Messages {
  return { ...vi, ...en, ...catalogs[locale] } as Messages;
}
