import type { MessageKey } from '@dasi/i18n';

/** Maps join_class() errors (supabase/migrations) to a message the student can act on. */
export function joinErrorKey(code: string | undefined): MessageKey {
  switch (code) {
    case 'P0002':
      return 'join.errorNotFound';
    case '42501':
      return 'join.errorRole';
    default:
      return 'join.errorSave';
  }
}
