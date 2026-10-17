'use client';

import { getLanguage, isLanguageCode, type LiveSegment } from '@dasi/shared';
import type { MessageKey } from '@dasi/i18n';
import Link from 'next/link';
import { useEffect, useMemo, useReducer, useState } from 'react';
import { getRealtimeToken } from '@/app/actions/lessons';
import { Alert, btn, cx, LangDot } from '@/components/ui';
import { tr } from '@/lib/i18n';
import { RealtimeConnection, type ConnectionState } from '@/lib/live/connection';
import { applyMessage, initialFeed, visiblePartials } from '@/lib/live/feed';
import { lastLines, markWords } from '@/lib/live/words';

export interface KnownWord {
  ko: string;
  topikLevel: number | null;
  /** Meaning per language code. */
  meanings: Record<string, string>;
}

/**
 * The student's phone during a lesson (SPEC S2, S3, prototype sLive): the last three
 * sentences in large Korean with the translation in their language; tap an underlined
 * word for its meaning.
 */
export function StudentLive({
  lesson,
  motherTongue,
  words,
  realtimeUrl,
  getToken = getRealtimeToken,
}: {
  lesson: { id: string; title: string; className: string; live: boolean };
  motherTongue: string | null;
  words: KnownWord[];
  realtimeUrl: string | null;
  /** Access token for `hello`; the server action by default. */
  getToken?: () => Promise<string>;
}) {
  const [feed, dispatch] = useReducer(applyMessage, initialFeed());
  const [conn, setConn] = useState<ConnectionState>({ kind: 'connecting' });
  const [language, setLanguage] = useState<string | null>(null);
  const [open, setOpen] = useState<KnownWord | null>(null);
  const url = realtimeUrl ? `${realtimeUrl.replace(/\/$/, '')}/ws/lessons/${lesson.id}` : null;

  useEffect(() => {
    if (!url || !lesson.live) return;
    const c = new RealtimeConnection({
      url,
      role: 'student',
      getToken,
      onMessage: (m) => {
        // The one language this student's translations arrive in (subtitleLanguageFor).
        if (m.type === 'ready') setLanguage(m.language);
        dispatch(m);
      },
      onState: setConn,
    });
    c.start();
    return () => c.stop();
  }, [url, lesson.live, getToken]);

  // A student whose mother tongue is not in the lesson reads English, or Korean only.
  const fallback =
    conn.kind === 'ready' || feed.finals.length > 0 ? language !== motherTongue : false;
  const byWord = useMemo(() => new Map(words.map((w) => [w.ko, w])), [words]);
  const ended =
    !lesson.live || feed.status === 'processing' || (conn.kind === 'closed' && conn.code === 4000);
  const lines = lastLines(feed.finals);
  const partial = visiblePartials(feed).at(-1);

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-3.5 px-4 pt-4 pb-10">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <StatusChip ended={ended} paused={feed.status === 'paused'} />
          <p className="truncate font-semibold">
            {lesson.className} · {lesson.title}
          </p>
        </div>
        {language && isLanguageCode(language) && (
          <span className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-sunk px-2.5 text-xs font-semibold">
            <LangDot code={language} />
            {getLanguage(language).nativeName}
          </span>
        )}
      </header>

      {conn.kind === 'reconnecting' && !ended && (
        <p role="status" className="rounded-sm bg-warn-soft px-3.5 py-2.5 text-sm text-warn">
          {tr('studentLive.reconnecting')}
        </p>
      )}
      {!url && <Alert tone="error">{tr('live.error.not_configured')}</Alert>}
      {conn.kind === 'closed' && conn.code !== 4000 && !ended && (
        <Alert tone="error">{tr(closeMessage(conn.code))}</Alert>
      )}
      {fallback && !ended && (
        <p className="rounded-[10px] bg-sunk px-3.5 py-3 text-sm text-muted">
          {language
            ? tr('studentLive.fallbackEnglish', { language: motherTongueName(motherTongue) })
            : tr('studentLive.koreanOnly', { language: motherTongueName(motherTongue) })}{' '}
          <Link href="/settings" className="font-semibold text-fg underline underline-offset-2">
            {tr('student.changeLanguage')}
          </Link>
        </p>
      )}

      {ended ? (
        <section className="flex flex-col items-start gap-3 rounded border border-line bg-surface p-5">
          <h1 className="text-lg font-bold">{tr('studentLive.endedTitle')}</h1>
          <p className="text-sm text-muted">{tr('studentLive.endedBody')}</p>
          <Link href="/home" className={cx(btn.base, btn.primary)}>
            {tr('studentLive.backHome')}
          </Link>
        </section>
      ) : (
        <>
          {lines.length === 0 && !partial && (
            <p className="py-10 text-center text-muted">{tr('studentLive.waiting')}</p>
          )}
          {lines.map((s, i) => (
            <Line
              key={s.seq}
              segment={s}
              language={language}
              byWord={byWord}
              onWord={setOpen}
              faded={i < lines.length - 1}
            />
          ))}
          {partial && (
            <p lang="ko" className="px-1 font-ko text-[22px] leading-snug text-muted italic">
              {partial.text}
            </p>
          )}
          {feed.status === 'paused' && (
            <p className="rounded-[10px] bg-sunk px-3.5 py-3 text-sm text-muted">
              {tr('studentLive.paused')}
            </p>
          )}
          {words.length > 0 && (
            <p className="text-center text-xs text-faint">{tr('studentLive.tapHint')}</p>
          )}
        </>
      )}

      {open && <WordSheet word={open} language={language} onClose={() => setOpen(null)} />}
    </main>
  );
}

function motherTongueName(code: string | null): string {
  return code && isLanguageCode(code)
    ? getLanguage(code).nativeName
    : tr('studentLive.yourLanguage');
}

function closeMessage(code: number): MessageKey {
  if (code === 4401) return 'live.error.unauthorized';
  if (code === 4403) return 'studentLive.notMember';
  if (code === 4409) return 'live.error.not_live';
  return 'live.error.not_configured';
}

function StatusChip({ ended, paused }: { ended: boolean; paused: boolean }) {
  return (
    <span
      className={cx(
        'inline-flex h-[26px] shrink-0 items-center gap-1.5 rounded-full px-2.5 font-mono text-xs font-semibold',
        ended || paused ? 'bg-sunk text-muted' : 'bg-live-soft text-live',
      )}
    >
      {!ended && (
        <span
          aria-hidden
          className={cx(
            'size-2 rounded-full',
            paused ? 'bg-faint' : 'animate-pulse bg-live motion-reduce:animate-none',
          )}
        />
      )}
      {tr(ended ? 'studentLive.ended' : paused ? 'live.paused' : 'live.rec')}
    </span>
  );
}

function Line({
  segment,
  language,
  byWord,
  onWord,
  faded,
}: {
  segment: LiveSegment;
  language: string | null;
  byWord: Map<string, KnownWord>;
  onWord: (w: KnownWord) => void;
  faded: boolean;
}) {
  const parts = markWords(segment.text, [...byWord.keys()]);
  const translation =
    language && isLanguageCode(language) ? segment.translations[language] : undefined;
  return (
    <article
      className={cx(
        'flex flex-col gap-1.5 rounded border border-line bg-surface p-4 transition-opacity',
        faded && 'opacity-60',
      )}
    >
      <p lang="ko" className="font-ko text-[24px] leading-snug font-medium">
        {parts.map((p, i) =>
          p.word ? (
            <button
              key={i}
              type="button"
              onClick={() => onWord(byWord.get(p.word!)!)}
              className="underline decoration-learn decoration-2 underline-offset-4"
            >
              {p.text}
            </button>
          ) : (
            <span key={i}>{p.text}</span>
          ),
        )}
      </p>
      {translation && (
        <p lang={language ?? undefined} className="text-base text-muted">
          {translation}
        </p>
      )}
    </article>
  );
}

function WordSheet({
  word,
  language,
  onClose,
}: {
  word: KnownWord;
  language: string | null;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const meaning = (language && word.meanings[language]) ?? word.meanings.en;
  return (
    <div className="fixed inset-0 z-20 flex items-end bg-black/40" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="word-title"
        onClick={(e) => e.stopPropagation()}
        className="mx-auto flex w-full max-w-xl flex-col gap-2 rounded-t-2xl bg-surface p-5 pb-[max(20px,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-center gap-2">
          <h2 id="word-title" lang="ko" className="font-ko text-[28px] font-bold">
            {word.ko}
          </h2>
          {word.topikLevel && (
            <span className="rounded-full bg-sunk px-2.5 py-0.5 text-xs font-semibold">
              TOPIK {word.topikLevel}
            </span>
          )}
        </div>
        <p className="text-lg">{meaning ?? tr('studentLive.noMeaning')}</p>
        <button
          type="button"
          autoFocus
          onClick={onClose}
          className={cx(btn.base, btn.secondary, 'mt-2 self-end')}
        >
          {tr('studentLive.close')}
        </button>
      </div>
    </div>
  );
}
