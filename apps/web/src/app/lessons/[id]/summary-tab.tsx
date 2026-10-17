import { isLanguageCode } from '@dasi/shared';
import { Alert } from '@/components/ui';
import { tr } from '@/lib/i18n';
import type { Supabase } from '@/lib/supabase/server';
import { SummaryForm } from './summary-form';

/** Summary in Korean and in each lesson language; each student receives their own (SPEC D2). */
export async function SummaryTab({
  supabase,
  lessonId,
  targetLangs,
}: {
  supabase: Supabase;
  lessonId: string;
  targetLangs: string[];
}) {
  const { data: rows, error } = await supabase
    .from('lesson_summaries')
    .select('lang, text, edited')
    .eq('lesson_id', lessonId);
  if (error) return <Alert tone="error">{tr('lessonDetail.loadError')}</Alert>;
  if (rows.length === 0) return <p className="text-muted">{tr('lessonDetail.noSummary')}</p>;

  const byLang = new Map(rows.map((r) => [r.lang, r]));
  const langs = ['ko', ...targetLangs.filter(isLanguageCode)];
  return (
    <div className="flex max-w-[70ch] flex-col gap-4">
      <p className="text-sm text-muted">{tr('lessonDetail.summaryHint')}</p>
      {langs.map((lang) => (
        <SummaryForm
          key={lang}
          lessonId={lessonId}
          lang={lang}
          text={byLang.get(lang)?.text ?? ''}
          edited={byLang.get(lang)?.edited ?? false}
        />
      ))}
    </div>
  );
}
