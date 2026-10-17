'use client';

import { getLanguage, type LanguageCode } from '@dasi/shared';
import { useActionState } from 'react';
import { deleteVocab, saveVocab, type SaveState } from '@/app/actions/lessons';
import { Alert, btn, cx, LangDot } from '@/components/ui';
import { tr } from '@/lib/i18n';
import type { Database } from '@/lib/supabase/database.types';

export interface VocabItem {
  id: string;
  ko: string;
  pos: Database['public']['Enums']['part_of_speech'];
  topikLevel: number | null;
  exampleKo: string | null;
  edited: boolean;
  meanings: Record<string, string>;
}

const inputClass = 'h-9 min-w-0 rounded-sm border border-line bg-surface px-2.5 text-sm text-fg';

/** One editable vocabulary item: word, TOPIK level and a meaning per lesson language. */
export function VocabItemForm({
  lessonId,
  langs,
  item,
}: {
  lessonId: string;
  langs: LanguageCode[];
  item: VocabItem;
}) {
  const [state, action, pending] = useActionState<SaveState, FormData>(saveVocab, {});
  const field = (name: string) => `vocab-${item.id}-${name}`;

  return (
    <form action={action} className="flex flex-col gap-3 rounded border border-line p-3.5">
      <input type="hidden" name="id" value={item.id} />
      <input type="hidden" name="lessonId" value={lessonId} />
      <div className="flex flex-wrap items-end gap-3">
        <label
          htmlFor={field('ko')}
          className="flex flex-col gap-1 text-xs font-semibold text-muted"
        >
          {tr('lessonDetail.vocabWord')}
          <input
            id={field('ko')}
            name="ko"
            lang="ko"
            defaultValue={item.ko}
            required
            maxLength={60}
            className={cx(inputClass, 'w-40 font-ko text-base font-semibold')}
          />
        </label>
        <label
          htmlFor={field('topik')}
          className="flex flex-col gap-1 text-xs font-semibold text-muted"
        >
          TOPIK
          <select
            id={field('topik')}
            name="topikLevel"
            defaultValue={item.topikLevel ?? ''}
            className={cx(inputClass, 'w-20')}
          >
            <option value="">–</option>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <span className="pb-2 text-xs text-faint">
          {tr(`lessonDetail.pos.${item.pos}`)}
          {item.edited && ` · ${tr('lessonDetail.edited')}`}
        </span>
      </div>
      {langs.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {langs.map((code) => (
            <label
              key={code}
              htmlFor={field(code)}
              className="flex min-w-0 items-center gap-2 text-xs font-semibold text-muted"
            >
              <span className="flex w-9 shrink-0 items-center gap-1 font-mono">
                <LangDot code={code} />
                {code.toUpperCase()}
              </span>
              <input
                id={field(code)}
                name={`meaning.${code}`}
                lang={code}
                aria-label={getLanguage(code).nativeName}
                defaultValue={item.meanings[code] ?? ''}
                maxLength={200}
                className={cx(inputClass, 'flex-1 font-normal')}
              />
            </label>
          ))}
        </div>
      )}
      {item.exampleKo && (
        <p lang="ko" className="font-ko text-sm text-muted">
          {item.exampleKo}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
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
        <button
          type="submit"
          formAction={deleteVocab}
          className="ml-auto h-8 rounded-full px-3 text-xs font-semibold text-muted hover:bg-live-soft hover:text-live"
        >
          {tr('lessonDetail.delete')}
        </button>
      </div>
      {state.error && <Alert tone="error">{state.error}</Alert>}
    </form>
  );
}
