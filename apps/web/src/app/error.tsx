'use client';

import { btn, cx } from '@/components/ui';
import { tr } from '@/lib/i18n';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="flex max-w-sm flex-col items-center gap-3 text-center" role="alert">
        <h1 className="text-xl font-bold">{tr('state.errorTitle')}</h1>
        <p className="text-muted">{tr('state.errorBody')}</p>
        <button type="button" onClick={reset} className={cx(btn.base, btn.primary)}>
          {tr('state.retry')}
        </button>
      </div>
    </main>
  );
}
