import { t, type MessageKey } from '@dasi/i18n';

/** UI language. Fixed to Vietnamese until per-user UI language (SPEC A5) lands. */
export const locale = 'vi';

export function tr(key: MessageKey, vars?: Record<string, string | number>): string {
  return t(locale, key, vars);
}
