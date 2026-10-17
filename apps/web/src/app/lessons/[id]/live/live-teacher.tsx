'use client';

import type { AudioSource, ServerMessage } from '@dasi/shared';
import type { MessageKey } from '@dasi/i18n';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { getRealtimeToken } from '@/app/actions/lessons';
import { Alert, btn, cx } from '@/components/ui';
import { tr } from '@/lib/i18n';
import { formatOffset } from '@/lib/lessons';
import { startCapture, type Capture } from '@/lib/live/capture';
import { RealtimeConnection, type ConnectionState } from '@/lib/live/connection';
import { applyMessage, initialFeed, visiblePartials } from '@/lib/live/feed';
import { mediaErrorKey, parseSavedChoice, savedChoiceKey } from '@/lib/new-lesson';
import { SegmentCard } from './segment-card';

export interface LiveLesson {
  id: string;
  classId: string;
  className: string;
  title: string;
  sources: AudioSource[];
  targetLangs: string[];
  startedAt: string;
}

type SourceState =
  | { kind: 'idle' }
  | { kind: 'starting' }
  | { kind: 'live'; label: string }
  | { kind: 'error'; message: MessageKey };

interface ActiveSource {
  conn: RealtimeConnection;
  capture?: Capture;
}

const errorKey = (code: string) => `live.error.${code}` as MessageKey;

function savedMicId(classId: string): string | undefined {
  try {
    return parseSavedChoice(localStorage.getItem(savedChoiceKey(classId)))?.micId;
  } catch {
    return undefined;
  }
}

/**
 * The teacher's screen while teaching (SPEC L1–L5, prototype liveView). One control
 * connection receives the room; each audio source has its own connection (protocol in
 * packages/shared/src/realtime.ts).
 */
export function LiveTeacher({
  lesson,
  teacherName,
  realtimeUrl,
  getToken = getRealtimeToken,
}: {
  lesson: LiveLesson;
  teacherName: string;
  realtimeUrl: string | null;
  /** Access token for `hello`; the server action by default. */
  getToken?: () => Promise<string>;
}) {
  const router = useRouter();
  const [feed, dispatch] = useReducer(applyMessage, initialFeed(lesson.targetLangs));
  const [control, setControl] = useState<ConnectionState>({ kind: 'connecting' });
  const [sources, setSources] = useState<Record<AudioSource, SourceState>>({
    mic: { kind: 'idle' },
    tab: { kind: 'idle' },
  });
  const [filter, setFilter] = useState<string>('all');
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [ending, setEnding] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const controlRef = useRef<RealtimeConnection | null>(null);
  const active = useRef<Partial<Record<AudioSource, ActiveSource>>>({});
  const feedRef = useRef<HTMLDivElement>(null);
  const url = realtimeUrl ? `${realtimeUrl.replace(/\/$/, '')}/ws/lessons/${lesson.id}` : null;

  const setSource = (source: AudioSource, state: SourceState) =>
    setSources((s) => ({ ...s, [source]: state }));

  const stopSource = useCallback((source: AudioSource) => {
    const a = active.current[source];
    a?.capture?.stop();
    a?.conn.stop();
    delete active.current[source];
  }, []);

  const startSource = useCallback(
    async (source: AudioSource) => {
      if (!url) return;
      stopSource(source);
      setSource(source, { kind: 'starting' });
      const conn = new RealtimeConnection({
        url,
        role: 'teacher',
        source,
        getToken,
        // The control connection shows the room; here only this source's errors matter.
        onMessage: (m: ServerMessage) => {
          if (m.type === 'error') setSource(source, { kind: 'error', message: errorKey(m.code) });
        },
        onState: (s) => {
          if (s.kind !== 'closed') return;
          active.current[source]?.capture?.stop();
          // 4000: the lesson ended normally; 1000: we closed it ourselves.
          if (s.code !== 4000 && s.code !== 1000) {
            setSource(source, { kind: 'error', message: 'live.error.sourceClosed' });
          }
        },
      });
      active.current[source] = { conn };
      conn.start();
      try {
        const capture = await startCapture(source, {
          micId: source === 'mic' ? savedMicId(lesson.classId) : undefined,
          onFrame: (frame) => conn.sendAudio(frame),
          onEnded: () => {
            conn.stop();
            setSource(source, { kind: 'idle' });
          },
        });
        if (active.current[source]?.conn !== conn) return capture.stop();
        active.current[source] = { conn, capture };
        setSource(source, { kind: 'live', label: capture.label });
      } catch (e) {
        conn.stop();
        delete active.current[source];
        setSource(source, { kind: 'error', message: mediaErrorKey(source, e) });
      }
    },
    [url, lesson.classId, stopSource, getToken],
  );

  // Control connection + microphone on arrival; everything closes when leaving the page.
  useEffect(() => {
    if (!url) return;
    const conn = new RealtimeConnection({
      url,
      role: 'teacher',
      getToken,
      onMessage: dispatch,
      onState: setControl,
    });
    controlRef.current = conn;
    conn.start();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- starts browser audio capture
    if (lesson.sources.includes('mic')) void startSource('mic');
    const sourcesNow = active.current;
    return () => {
      conn.stop();
      for (const source of Object.keys(sourcesNow) as AudioSource[]) stopSource(source);
    };
  }, [url, lesson.sources, startSource, stopSource, getToken]);

  // The lesson is over: the gateway closed with 4000 or announced processing.
  const over = feed.status === 'processing' || (control.kind === 'closed' && control.code === 4000);
  useEffect(() => {
    if (over) router.replace(`/lessons/${lesson.id}`);
  }, [over, router, lesson.id]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Follow new sentences unless the teacher scrolled up to read.
  const count = feed.finals.length;
  useEffect(() => {
    const el = feedRef.current;
    if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 160)
      el.scrollTop = el.scrollHeight;
  }, [count, feed.partials]);

  const paused = feed.status === 'paused';
  const togglePause = useCallback(() => {
    controlRef.current?.send({ type: paused ? 'resume' : 'pause' });
  }, [paused]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key === 'Escape') setConfirmEnd(false);
      if (e.key === ' ' && !target.closest('input, textarea, select, button, a, [role="dialog"]')) {
        e.preventDefault();
        togglePause();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePause]);

  // The gateway ignores audio once ending and closes every connection (4000) when done,
  // which stops capture; if ending fails (end_failed) teaching simply continues.
  const end = () => {
    setEnding(true);
    controlRef.current?.send({ type: 'end' });
  };
  const endingNow = ending && feed.error !== 'end_failed';

  const elapsed = formatOffset(now - new Date(lesson.startedAt).getTime());
  const langs = filter === 'all' ? feed.targetLangs : [filter];
  const speaker = (source: AudioSource) => (source === 'mic' ? teacherName : tr('live.tabSpeaker'));
  const controlReady = control.kind === 'ready';

  return (
    <div className="flex h-dvh flex-col bg-bg">
      <header className="flex flex-wrap items-center gap-2.5 border-b border-line bg-surface px-4 py-2.5">
        <button
          type="button"
          onClick={() => setConfirmEnd(true)}
          aria-label={tr('live.backAria')}
          className="grid size-9 place-items-center rounded-full border border-line hover:bg-sunk"
        >
          ←
        </button>
        <span
          role="timer"
          className={cx(
            'inline-flex h-[26px] items-center gap-1.5 rounded-full px-2.5 font-mono text-xs font-semibold',
            paused ? 'bg-sunk text-muted' : 'bg-live-soft text-live',
          )}
        >
          <span
            aria-hidden
            className={cx(
              'size-2 rounded-full',
              paused ? 'bg-faint' : 'animate-pulse bg-live motion-reduce:animate-none',
            )}
          />
          {tr(paused ? 'live.paused' : 'live.rec')} {elapsed}
        </span>
        <div className="min-w-[45%] flex-1 sm:min-w-0">
          <p className="truncate font-semibold">
            {lesson.className} · {lesson.title}
          </p>
          <p className="truncate text-xs text-faint">
            {tr('live.watching', { n: feed.students })}
            {feed.targetLangs.length > 0 &&
              ` · ${feed.targetLangs.map((l) => l.toUpperCase()).join(' · ')}`}
          </p>
        </div>
        {feed.targetLangs.length > 1 && (
          <div
            role="radiogroup"
            aria-label={tr('live.filter')}
            className="flex gap-[3px] rounded-[10px] bg-sunk p-[3px]"
          >
            {['all', ...feed.targetLangs].map((f) => (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={filter === f}
                onClick={() => setFilter(f)}
                className={cx(
                  'h-[30px] rounded-lg px-2.5 text-xs font-semibold',
                  filter === f ? 'bg-surface text-fg shadow-card' : 'text-muted',
                )}
              >
                {f === 'all' ? tr('live.filterAll') : f.toUpperCase()}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={togglePause}
          disabled={!controlReady || endingNow}
          className={cx(btn.base, btn.secondary)}
        >
          {tr(paused ? 'live.resume' : 'live.pause')}
        </button>
        <button
          type="button"
          onClick={() => setConfirmEnd(true)}
          disabled={!controlReady || endingNow}
          className={cx(btn.base, btn.live)}
        >
          {tr('live.end')}
        </button>
      </header>

      {lesson.sources.map((source) => (
        <SourceBar
          key={source}
          source={source}
          state={sources[source]}
          onStart={() => void startSource(source)}
        />
      ))}

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_220px] min-[1100px]:grid-cols-[minmax(0,1fr)_340px] min-[1100px]:grid-rows-1">
        <div ref={feedRef} className="flex min-h-0 flex-col gap-2.5 overflow-auto p-4 pb-10">
          {!url && <Alert tone="error">{tr('live.error.not_configured')}</Alert>}
          {control.kind === 'reconnecting' && (
            <p role="status" className="rounded-sm bg-warn-soft px-3.5 py-2.5 text-sm text-warn">
              {tr('live.reconnecting')}
            </p>
          )}
          {control.kind === 'closed' && control.code !== 4000 && (
            <Alert tone="error">{tr('live.error.sourceClosed')}</Alert>
          )}
          {feed.error && <Alert tone="error">{tr(errorKey(feed.error))}</Alert>}
          {count === 0 && visiblePartials(feed).length === 0 && (
            <p className="py-10 text-center text-muted">{tr('live.empty')}</p>
          )}
          {feed.finals.map((s) => (
            <SegmentCard key={s.seq} segment={s} speaker={speaker(s.source)} langs={langs} />
          ))}
          {visiblePartials(feed).map((s) => (
            <SegmentCard key={`p-${s.source}`} segment={s} speaker={speaker(s.source)} langs={[]} />
          ))}
          {paused && (
            <p className="rounded-[10px] bg-sunk px-3.5 py-3 text-sm text-muted">
              {tr('live.pausedNote')}
            </p>
          )}
        </div>
        <aside className="flex min-h-0 flex-col border-t border-line bg-surface min-[1100px]:border-t-0 min-[1100px]:border-l">
          <h2 className="border-b border-line px-4 py-2.5 text-sm font-semibold">
            {tr('live.questions')}
          </h2>
          <p className="p-4 text-sm text-muted">{tr('live.noQuestions')}</p>
        </aside>
      </div>

      {confirmEnd && (
        <div className="fixed inset-0 z-20 grid place-items-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="end-title"
            className="flex w-full max-w-[420px] flex-col gap-4 rounded-lg bg-surface p-5 shadow-card"
          >
            <h2 id="end-title" className="text-lg font-bold">
              {tr('live.endTitle')}
            </h2>
            <p className="text-sm text-muted">{tr('live.endBody', { time: elapsed })}</p>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                autoFocus
                onClick={() => setConfirmEnd(false)}
                className={cx(btn.base, btn.secondary)}
              >
                {tr('live.keepTeaching')}
              </button>
              <button
                type="button"
                onClick={end}
                disabled={endingNow || !controlReady}
                className={cx(btn.base, btn.live)}
              >
                {tr(endingNow ? 'live.ending' : 'live.endConfirm')}
              </button>
            </div>
            <Link
              href={`/classes/${lesson.classId}?tab=lessons`}
              className="text-center text-xs text-faint hover:text-fg"
            >
              {tr('live.leaveWithoutEnding')}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function SourceBar({
  source,
  state,
  onStart,
}: {
  source: AudioSource;
  state: SourceState;
  onStart: () => void;
}) {
  if (state.kind === 'live') return null;
  const tone = state.kind === 'error' ? 'bg-live-soft text-live' : 'bg-warn-soft text-warn';
  return (
    <div
      role={state.kind === 'error' ? 'alert' : 'status'}
      className={cx('flex flex-wrap items-center gap-3 px-4 py-2 text-sm', tone)}
    >
      <span className="font-semibold">{tr(source === 'mic' ? 'live.mic' : 'live.tab')}</span>
      <span className="min-w-0 flex-1">
        {state.kind === 'error'
          ? tr(state.message)
          : state.kind === 'starting'
            ? tr('live.sourceStarting')
            : tr(source === 'tab' ? 'live.tabIdle' : 'live.micIdle')}
      </span>
      {state.kind !== 'starting' && (
        <button type="button" onClick={onStart} className={cx(btn.base, btn.secondary, 'h-8 px-3')}>
          {tr(source === 'tab' ? 'newLesson.pickTab' : 'newLesson.retry')}
        </button>
      )}
    </div>
  );
}
