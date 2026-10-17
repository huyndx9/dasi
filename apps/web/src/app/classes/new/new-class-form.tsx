'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { createClass } from '@/app/actions/classes';
import { Alert, btn, cx } from '@/components/ui';
import { tr } from '@/lib/i18n';
import type { MessageKey } from '@dasi/i18n';

const fields: { name: string; label: MessageKey; placeholder: MessageKey; required?: boolean }[] = [
  { name: 'name', label: 'newClass.name', placeholder: 'newClass.namePlaceholder', required: true },
  { name: 'level', label: 'newClass.level', placeholder: 'newClass.levelPlaceholder' },
  { name: 'schedule', label: 'newClass.schedule', placeholder: 'newClass.schedulePlaceholder' },
  { name: 'textbook', label: 'newClass.textbook', placeholder: 'newClass.textbookPlaceholder' },
];

export function NewClassForm() {
  const [state, action, pending] = useActionState(createClass, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      {fields.map((f) => (
        <label key={f.name} className="flex flex-col gap-1.5 text-xs font-semibold text-muted">
          <span>
            {tr(f.label)}
            {!f.required && (
              <span className="font-normal text-faint"> · {tr('newClass.optional')}</span>
            )}
          </span>
          <input
            id={`class-${f.name}`}
            name={f.name}
            required={f.required}
            maxLength={120}
            placeholder={tr(f.placeholder)}
            className={cx(
              'h-10 rounded-sm border border-line bg-surface px-3 text-sm text-fg',
              f.name === 'textbook' && 'font-ko',
            )}
          />
        </label>
      ))}
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <div className="flex flex-wrap justify-end gap-2">
        <Link href="/classes" className={cx(btn.base, btn.secondary)}>
          {tr('newClass.cancel')}
        </Link>
        <button type="submit" disabled={pending} className={cx(btn.base, btn.primary)}>
          {tr('newClass.submit')}
        </button>
      </div>
    </form>
  );
}
