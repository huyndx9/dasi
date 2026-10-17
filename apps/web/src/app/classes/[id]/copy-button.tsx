'use client';

import { useState } from 'react';
import { btn, cx } from '@/components/ui';
import { tr } from '@/lib/i18n';

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={cx(btn.base, btn.secondary, 'h-8 px-3 text-xs')}
      onClick={() => {
        navigator.clipboard.writeText(value).then(
          () => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
          },
          () => setCopied(false),
        );
      }}
    >
      <span aria-live="polite">{copied ? tr('classDetail.copied') : tr('classDetail.copy')}</span>
    </button>
  );
}
