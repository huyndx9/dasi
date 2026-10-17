import { isLanguageCode } from '@dasi/shared';
import { Alert } from '@/components/ui';
import { tr } from '@/lib/i18n';
import type { Supabase } from '@/lib/supabase/server';
import { VocabItemForm } from './vocab-item-form';

/** Lesson vocabulary written by lesson.finalize; the teacher corrects it before sending (SPEC D3). */
export async function VocabTab({
  supabase,
  lessonId,
  targetLangs,
}: {
  supabase: Supabase;
  lessonId: string;
  targetLangs: string[];
}) {
  const { data: items, error } = await supabase
    .from('vocab_items')
    .select('id, ko, pos, topik_level, example_ko, edited, vocab_translations(lang, meaning)')
    .eq('lesson_id', lessonId)
    .order('position');
  if (error) return <Alert tone="error">{tr('lessonDetail.loadError')}</Alert>;
  if (items.length === 0) return <p className="text-muted">{tr('lessonDetail.noVocab')}</p>;

  const langs = targetLangs.filter(isLanguageCode);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">{tr('lessonDetail.vocabHint', { n: items.length })}</p>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.id}>
            <VocabItemForm
              lessonId={lessonId}
              langs={langs}
              item={{
                id: item.id,
                ko: item.ko,
                pos: item.pos,
                topikLevel: item.topik_level,
                exampleKo: item.example_ko,
                edited: item.edited,
                meanings: Object.fromEntries(
                  item.vocab_translations.map((t) => [t.lang, t.meaning]),
                ),
              }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
