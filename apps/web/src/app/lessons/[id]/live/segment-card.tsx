import { isLanguageCode, type LiveSegment } from '@dasi/shared';
import { cx } from '@/components/ui';
import { tr } from '@/lib/i18n';
import { formatOffset } from '@/lib/lessons';

/** One sentence in the live feed (prototype .seg-card). Partials are grey italic (CLAUDE.md rule 6). */
export function SegmentCard({
  segment,
  speaker,
  langs,
}: {
  segment: LiveSegment;
  speaker: string;
  /** Translations to show, in order; empty for Korean only. */
  langs: string[];
}) {
  const partial = segment.state === 'partial';
  return (
    <article
      className={cx(
        'flex flex-col gap-2 rounded border border-line bg-surface px-4 py-3.5',
        partial && 'border-dashed',
      )}
      aria-live={partial ? 'off' : undefined}
    >
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <b>{speaker}</b>
        <span className="font-mono text-faint tabular-nums">{formatOffset(segment.startMs)}</span>
        <span
          className={cx(
            'inline-flex h-5 items-center rounded-[5px] px-1.5 font-mono text-[10.5px] font-semibold tracking-[.04em]',
            segment.source === 'tab' ? 'bg-learn-soft text-learn' : 'bg-sunk text-muted',
          )}
        >
          {segment.source.toUpperCase()}
        </span>
        {partial && <span className="text-faint">{tr('live.listening')}</span>}
      </div>
      <p
        lang="ko"
        className={cx(
          'font-ko text-lg leading-relaxed font-medium',
          partial && 'text-muted italic',
        )}
      >
        {segment.text}
      </p>
      {!partial &&
        langs.map((lang) => {
          // A translation that failed or timed out never comes; the Korean line stands alone.
          const text = isLanguageCode(lang) ? segment.translations[lang] : undefined;
          if (!text) return null;
          return (
            <p key={lang} className="flex items-baseline gap-2.5 text-sm">
              <span
                className="w-6 shrink-0 font-mono text-[10.5px] font-semibold"
                style={{ color: `var(--l-${lang}, var(--faint))` }}
              >
                {lang.toUpperCase()}
              </span>
              <span lang={lang}>{text}</span>
            </p>
          );
        })}
    </article>
  );
}
