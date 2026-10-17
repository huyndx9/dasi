'use client';

import { useActionState, type ReactNode } from 'react';
import { joinClass } from '@/app/actions/classes';
import { Alert, btn, cx } from '@/components/ui';
import { tr } from '@/lib/i18n';

export function JoinForm({ code, languageLine }: { code: string; languageLine: ReactNode }) {
  const [state, action, pending] = useActionState(joinClass, {});
  return (
    <form action={action} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted">
        {tr('join.code')}
        <input
          id="join-code"
          name="code"
          defaultValue={code}
          required
          maxLength={6}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          className="h-12 rounded-sm border border-line bg-surface px-3 font-mono text-xl tracking-[.2em] text-fg uppercase"
        />
        <span className="font-normal text-faint">{tr('join.codeHint')}</span>
      </label>
      {languageLine}
      <label className="flex items-start gap-3 rounded-sm bg-sunk p-3.5 text-sm">
        <input
          id="join-consent"
          type="checkbox"
          name="consent"
          className="mt-0.5 size-4 accent-[var(--primary)]"
        />
        <span>{tr('join.consent')}</span>
      </label>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <button type="submit" disabled={pending} className={cx(btn.base, btn.primary, btn.lg)}>
        {tr('join.submit')}
      </button>
    </form>
  );
}
