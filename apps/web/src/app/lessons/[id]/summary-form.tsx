'use client';

import { getLanguage, isLanguageCode } from '@dasi/shared';
import { useActionState } from 'react';
import { saveSummary, type SaveState } from '@/app/actions/lessons';
import { Alert, btn, cx, LangDot } from '@/components/ui';
import { tr } from '@/lib/i18n';

export function SummaryForm({
  lessonId,
  lang,
  text,
  edited,
}: {
  lessonId: string;
  lang: string;
  text: string;
  edited: boolean;
}) {
  const [state, action, pending] = useActionState<SaveState, FormData>(saveSummary, {});
  const id = `summary-${lang}`;
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="lessonId" value={lessonId} />
      <input type="hidden" name="lang" value={lang} />
      <label htmlFor={id} className="flex items-center gap-1.5 text-xs font-semibold text-muted">
        {isLanguageCode(lang) ? (
          <>
            <LangDot code={lang} />
            {getLanguage(lang).nativeName}
          </>
        ) : (
          tr('lessonDetail.summaryKorean')
        )}
        {edited && <span className="font-normal text-faint">· {tr('lessonDetail.edited')}</span>}
      </label>
      <textarea
        id={id}
        name="text"
        lang={lang}
        defaultValue={text}
        required
        maxLength={4000}
        rows={4}
        className={cx(
          'rounded-sm border border-line bg-surface p-3 text-sm leading-relaxed text-fg',
          lang === 'ko' && 'font-ko',
        )}
      />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className={cx(btn.base, btn.secondary, 'h-8 px-3')}
        >
          {tr(pending ? 'lessonDetail.saving' : 'lessonDetail.save')}
        </button>
        {state.saved && !pending && (
          <span role="status" className="text-xs text-learn">
            {tr('lessonDetail.saved')}
          </span>
        )}
      </div>
      {state.error && <Alert tone="error">{state.error}</Alert>}
    </form>
  );
}
