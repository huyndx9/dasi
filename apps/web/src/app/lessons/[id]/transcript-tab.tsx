import { getLanguage, isLanguageCode } from '@dasi/shared';
import Link from 'next/link';
import { Alert, cx, LangDot } from '@/components/ui';
import type { Supabase } from '@/lib/supabase/server';
import { tr } from '@/lib/i18n';
import { formatOffset } from '@/lib/lessons';

/** Bilingual transcript (SPEC D2): Korean lines with the chosen lesson language under each. */
export async function TranscriptTab({
  supabase,
  lessonId,
  targetLangs,
  lang,
}: {
  supabase: Supabase;
  lessonId: string;
  targetLangs: string[];
  lang: string | null;
}) {
  const { data: segments, error } = await supabase
    .from('segments')
    .select('id, seq, start_ms, source, text, segment_translations(lang, text)')
    .eq('lesson_id', lessonId)
    .order('seq');
  if (error) return <Alert tone="error">{tr('lessonDetail.loadError')}</Alert>;
  if (segments.length === 0) return <p className="text-muted">{tr('lessonDetail.noSegments')}</p>;

  const langs = targetLangs.filter(isLanguageCode);
  return (
    <div className="flex flex-col gap-3">
      {langs.length > 1 && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={tr('lessonDetail.showIn')}>
          {langs.map((code) => (
            <Link
              key={code}
              href={`/lessons/${lessonId}?lang=${code}`}
              aria-current={code === lang ? 'true' : undefined}
              className={cx(
                'inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-semibold',
                code === lang ? 'bg-primary text-on-primary' : 'bg-sunk text-muted hover:text-fg',
              )}
            >
              <LangDot code={code} />
              {getLanguage(code).nativeName}
            </Link>
          ))}
        </div>
      )}
      <ol className="flex flex-col">
        {segments.map((s) => {
          const translation = s.segment_translations.find((t) => t.lang === lang)?.text;
          return (
            <li
              key={s.id}
              className="grid grid-cols-[52px_minmax(0,1fr)] gap-3 border-b border-line px-1 py-2.5 last:border-0"
            >
              <span className="pt-0.5 font-mono text-xs text-faint tabular-nums">
                {formatOffset(s.start_ms)}
              </span>
              <span className="flex min-w-0 flex-col gap-1">
                <span lang="ko" className="font-ko text-[15px] leading-relaxed">
                  {s.text}
                </span>
                {translation ? (
                  <span lang={lang ?? undefined} className="text-sm text-muted">
                    {translation}
                  </span>
                ) : (
                  lang && (
                    <span className="text-xs text-faint italic">
                      {tr('lessonDetail.noTranslation')}
                    </span>
                  )
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
