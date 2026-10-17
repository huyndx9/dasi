'use client';

import {
  sourcesForFormat,
  type AudioSource,
  type LanguageCode,
  type LessonFormat,
  type SubtitleDisplay,
} from '@dasi/shared';
import Link from 'next/link';
import { useEffect, useRef, useState, useTransition, type ReactNode } from 'react';
import { createLesson } from '@/app/actions/lessons';
import { Alert, btn, cx, Eyebrow, LangChip } from '@/components/ui';
import { locale, tr } from '@/lib/i18n';
import {
  canStart,
  choiceOf,
  defaultLessonTitle,
  displayOptions,
  formatOptions,
  mediaErrorKey,
  parseSavedChoice,
  savedChoiceKey,
  sourcesOf,
  type SavedChoice,
  type SourceChoice,
  type SourceState,
} from '@/lib/new-lesson';

export interface WizardClass {
  id: string;
  name: string;
  textbook: string | null;
  students: number;
  langs: LanguageCode[];
  uncovered: number;
}

const stepNames = ['newLesson.step1', 'newLesson.step2', 'newLesson.step3'] as const;
const sourceChoices: { key: SourceChoice; label: Parameters<typeof tr>[0] }[] = [
  { key: 'mic', label: 'newLesson.sourceMic' },
  { key: 'tab', label: 'newLesson.sourceTab' },
  { key: 'both', label: 'newLesson.sourceBoth' },
];
const idle: SourceState = { kind: 'idle' };
const inputClass = 'h-10 rounded-sm border border-line bg-surface px-3 text-sm text-fg';
const labelClass = 'flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-muted';

function readSaved(classId: string): SavedChoice | null {
  try {
    return parseSavedChoice(localStorage.getItem(savedChoiceKey(classId)));
  } catch {
    return null;
  }
}

/** New-lesson wizard (SPEC §3): class & format → audio & subtitles → device check → start. */
export function NewLessonWizard({
  classes,
  initialClassId,
}: {
  classes: WizardClass[];
  initialClassId: string;
}) {
  const [step, setStep] = useState(1);
  const [classId, setClassId] = useState(initialClassId);
  const cls = classes.find((c) => c.id === classId) ?? classes[0]!;
  const [title, setTitle] = useState(() =>
    defaultLessonTitle(tr('newLesson.titlePrefix'), new Date(), locale),
  );
  const [textbook, setTextbook] = useState(cls.textbook ?? '');
  const [topic, setTopic] = useState('');
  const [format, setFormat] = useState<LessonFormat>('hybrid');
  const [sources, setSources] = useState<AudioSource[]>(sourcesForFormat('hybrid'));
  const [display, setDisplay] = useState<SubtitleDisplay>('bilingual');
  const [micId, setMicId] = useState('');
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [states, setStates] = useState<Record<AudioSource, SourceState>>({ mic: idle, tab: idle });
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const streams = useRef<Partial<Record<AudioSource, MediaStream>>>({});
  const [micStream, setMicStream] = useState<MediaStream>();

  // Restore the last choices made for this class (SPEC §3).
  useEffect(() => {
    const saved = readSaved(classId);
    const c = classes.find((k) => k.id === classId);
    /* eslint-disable react-hooks/set-state-in-effect -- syncing from browser storage */
    setTextbook(saved?.textbook ?? c?.textbook ?? '');
    if (saved) {
      setFormat(saved.format);
      setSources(saved.sources);
      setDisplay(saved.display);
      setMicId(saved.micId ?? '');
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [classId, classes]);

  useEffect(() => () => stopAll(streams.current), []);

  const setState = (source: AudioSource, state: SourceState) =>
    setStates((s) => ({ ...s, [source]: state }));

  function release(source: AudioSource) {
    streams.current[source]?.getTracks().forEach((t) => t.stop());
    delete streams.current[source];
    if (source === 'mic') setMicStream(undefined);
    setState(source, idle);
  }

  async function openMic(deviceId = micId) {
    release('mic');
    setState('mic', { kind: 'pending' });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      });
      streams.current.mic = stream;
      setMicStream(stream);
      const track = stream.getAudioTracks()[0]!;
      setState('mic', { kind: 'ready', label: track.label || tr('newLesson.micDefault') });
      // Device names are only visible after permission is granted.
      const devices = await navigator.mediaDevices.enumerateDevices();
      setMics(devices.filter((d) => d.kind === 'audioinput' && d.deviceId));
    } catch (e) {
      setState('mic', { kind: 'error', message: mediaErrorKey('mic', e) });
    }
  }

  async function pickTab() {
    release('tab');
    setState('tab', { kind: 'pending' });
    try {
      // Chrome only offers "share tab audio" when video is requested too.
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      stream.getVideoTracks().forEach((t) => t.stop());
      const audio = stream.getAudioTracks()[0];
      if (!audio) {
        stream.getTracks().forEach((t) => t.stop());
        throw { name: 'NoAudioTrack' };
      }
      streams.current.tab = stream;
      audio.addEventListener('ended', () => release('tab'));
      setState('tab', { kind: 'ready', label: audio.label || tr('newLesson.tabShared') });
    } catch (e) {
      setState('tab', { kind: 'error', message: mediaErrorKey('tab', e) });
    }
  }

  function goTo(next: number) {
    setError(undefined);
    if (next === 2 && !title.trim()) {
      setError(tr('newLesson.errorTitle'));
      return;
    }
    if (next === 3) {
      // Release sources the teacher no longer wants; ask for the microphone right away.
      (['mic', 'tab'] as const).filter((s) => !sources.includes(s)).forEach(release);
      if (sources.includes('mic') && states.mic.kind !== 'ready') void openMic();
    }
    setStep(next);
  }

  function chooseFormat(f: LessonFormat) {
    setFormat(f);
    setSources(sourcesForFormat(f));
  }

  function start() {
    setError(undefined);
    const choice: SavedChoice = { format, sources, display, textbook, micId: micId || undefined };
    try {
      localStorage.setItem(savedChoiceKey(classId), JSON.stringify(choice));
    } catch {
      // Private mode or blocked storage: the wizard still works, it just forgets.
    }
    startTransition(async () => {
      const res = await createLesson({
        classId,
        title,
        topic,
        textbook,
        format,
        sources,
        targetLangs: cls.langs,
        display,
      });
      if (res?.error) setError(res.error);
      else stopAll(streams.current);
    });
  }

  const ready = canStart(sources, states);

  return (
    <div className="flex flex-col">
      <header className="flex flex-col gap-3.5 border-b border-line p-5">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-bold">{tr('newLesson.title')}</h1>
          <span className="text-sm text-muted">
            {tr('newLesson.stepOf', { n: step, name: tr(stepNames[step - 1]!) })}
          </span>
        </div>
        <ol className="flex gap-1.5">
          {stepNames.map((n, i) => (
            <li
              key={n}
              aria-current={i + 1 === step ? 'step' : undefined}
              className={cx(
                'flex flex-1 flex-col gap-1.5 text-xs font-medium text-faint before:h-[3px] before:rounded-full before:bg-line',
                i + 1 <= step && 'before:bg-primary',
                i + 1 === step && 'font-semibold text-fg',
              )}
            >
              <span className="hidden sm:inline">{tr(n)}</span>
            </li>
          ))}
        </ol>
      </header>

      <div className="flex flex-col gap-5 p-5">
        {step === 1 && (
          <>
            <label className={labelClass}>
              {tr('newLesson.class')}
              <select
                className={inputClass}
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={labelClass}>
                {tr('newLesson.lessonTitle')}
                <input
                  className={inputClass}
                  value={title}
                  maxLength={200}
                  required
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
              <label className={labelClass}>
                <span>
                  {tr('newLesson.textbook')}
                  <span className="font-normal text-faint"> · {tr('newClass.optional')}</span>
                </span>
                <input
                  className={cx(inputClass, 'font-ko')}
                  value={textbook}
                  maxLength={200}
                  onChange={(e) => setTextbook(e.target.value)}
                />
              </label>
            </div>
            <label className={labelClass}>
              <span>
                {tr('newLesson.topic')}
                <span className="font-normal text-faint"> · {tr('newClass.optional')}</span>
              </span>
              <input
                className={cx(inputClass, 'font-ko')}
                value={topic}
                maxLength={200}
                placeholder="-아/어서, -고 싶다"
                onChange={(e) => setTopic(e.target.value)}
              />
            </label>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2">
                <Eyebrow>{tr('newLesson.format')}</Eyebrow>
              </legend>
              {formatOptions.map((o) => (
                <label
                  key={o.key}
                  className={cx(
                    'flex cursor-pointer gap-3 rounded border p-3.5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-lang-en',
                    format === o.key ? 'border-primary bg-sunk' : 'border-line hover:bg-sunk',
                  )}
                >
                  <input
                    type="radio"
                    name="format"
                    className="mt-1 accent-[var(--primary)]"
                    checked={format === o.key}
                    onChange={() => chooseFormat(o.key)}
                  />
                  <span className="flex flex-col gap-0.5">
                    <span className="flex flex-wrap items-center gap-2 font-semibold">
                      {tr(o.label)}
                      {o.recommended && (
                        <span className="rounded-[5px] bg-learn-soft px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-learn">
                          {tr('newLesson.recommended')}
                        </span>
                      )}
                    </span>
                    <span className="text-sm text-muted">{tr(o.hint)}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          </>
        )}

        {step === 2 && (
          <>
            <div className="flex flex-col gap-2">
              <Eyebrow>{tr('newLesson.sources')}</Eyebrow>
              <Segmented
                label={tr('newLesson.sources')}
                options={sourceChoices.map((c) => ({ key: c.key, label: tr(c.label) }))}
                value={choiceOf(sources)}
                onChange={(c) => setSources(sourcesOf(c))}
              />
              {sources.includes('mic') && (
                <label className={labelClass}>
                  {tr('newLesson.micDevice')}
                  <select
                    className={inputClass}
                    value={micId}
                    onChange={(e) => {
                      setMicId(e.target.value);
                      release('mic');
                    }}
                  >
                    <option value="">{tr('newLesson.micDefault')}</option>
                    {mics.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || d.deviceId.slice(0, 8)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {sources.includes('tab') && (
                <p className="rounded-sm bg-warn-soft px-3.5 py-3 text-sm text-warn">
                  {tr('newLesson.tabHint')}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Eyebrow>{tr('newLesson.subtitles')}</Eyebrow>
              {cls.langs.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {cls.langs.map((code) => (
                    <LangChip key={code} code={code} />
                  ))}
                </div>
              ) : null}
              <p className="text-sm text-muted">
                {tr(cls.langs.length ? 'newLesson.subtitlesHint' : 'newLesson.subtitlesNone')}
              </p>
              {cls.uncovered > 0 && (
                <p className="text-sm text-warn">
                  {tr('newLesson.subtitlesCapped', { n: cls.uncovered })}
                </p>
              )}
              <Segmented
                label={tr('newLesson.subtitles')}
                options={displayOptions.map((o) => ({ key: o.key, label: tr(o.label) }))}
                value={display}
                onChange={setDisplay}
              />
              <p className="text-xs text-faint">
                {tr(displayOptions.find((o) => o.key === display)!.hint)}
              </p>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="flex flex-col gap-2.5">
              {sources.includes('mic') && (
                <CheckRow
                  name={tr('newLesson.checkMic')}
                  state={states.mic}
                  action={
                    states.mic.kind === 'error' ? (
                      <button
                        className={cx(btn.base, btn.secondary, 'h-8 px-3')}
                        onClick={() => void openMic()}
                      >
                        {tr('newLesson.retry')}
                      </button>
                    ) : null
                  }
                  extra={states.mic.kind === 'ready' ? <Meter stream={micStream} /> : null}
                />
              )}
              {sources.includes('tab') && (
                <CheckRow
                  name={tr('newLesson.checkTab')}
                  state={states.tab}
                  hint={states.tab.kind === 'idle' ? tr('newLesson.tabPickHint') : undefined}
                  action={
                    states.tab.kind !== 'pending' ? (
                      <button
                        className={cx(btn.base, btn.secondary, 'h-8 px-3')}
                        onClick={() => void pickTab()}
                      >
                        {tr(
                          states.tab.kind === 'ready' ? 'newLesson.changeTab' : 'newLesson.pickTab',
                        )}
                      </button>
                    ) : null
                  }
                />
              )}
            </div>

            <dl className="flex flex-col gap-1.5 rounded bg-sunk p-4 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">{tr('newLesson.class')}</dt>
                <dd className="text-right font-semibold">{cls.name}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">{tr('newLesson.lessonTitle')}</dt>
                <dd className="text-right">{title}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">{tr('newLesson.summarySubtitles')}</dt>
                <dd className="text-right font-mono text-xs">
                  {display === 'korean_only' || cls.langs.length === 0
                    ? tr('newLesson.displayKorean')
                    : cls.langs.map((l) => l.toUpperCase()).join(' · ')}
                </dd>
              </div>
            </dl>
            <p className="text-xs text-faint">{tr('newLesson.consent')}</p>
          </>
        )}

        {error && <Alert tone="error">{error}</Alert>}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-line p-4">
        {step === 1 ? (
          <Link href={`/classes/${classId}?tab=lessons`} className={cx(btn.base, btn.secondary)}>
            {tr('newLesson.cancel')}
          </Link>
        ) : (
          <button className={cx(btn.base, btn.secondary)} onClick={() => goTo(step - 1)}>
            {tr('newLesson.back')}
          </button>
        )}
        <div className="flex flex-wrap items-center justify-end gap-2">
          {step === 3 && !ready && (
            <span className="text-xs text-faint">{tr('newLesson.waitingSources')}</span>
          )}
          {step < 3 ? (
            <button className={cx(btn.base, btn.primary, btn.lg)} onClick={() => goTo(step + 1)}>
              {tr('newLesson.next')}
            </button>
          ) : (
            <button
              className={cx(btn.base, btn.live, btn.lg)}
              disabled={!ready || pending}
              onClick={start}
            >
              {tr(pending ? 'newLesson.starting' : 'newLesson.start')}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

function stopAll(streams: Partial<Record<AudioSource, MediaStream>>) {
  Object.values(streams).forEach((s) => s?.getTracks().forEach((t) => t.stop()));
}

/** Single-choice pill group ("seg" in the prototype), keyboard-accessible as radios. */
function Segmented<K extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { key: K; label: string }[];
  value: K;
  onChange: (key: K) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex flex-wrap gap-[3px] rounded-[10px] bg-sunk p-[3px]"
    >
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={value === o.key}
          onClick={() => onChange(o.key)}
          className={cx(
            'h-[34px] flex-1 rounded-lg px-2.5 text-[13px] font-semibold whitespace-nowrap',
            value === o.key ? 'bg-surface text-fg shadow-card' : 'text-muted',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function CheckRow({
  name,
  state,
  action,
  extra,
  hint,
}: {
  name: string;
  state: SourceState;
  action?: ReactNode;
  extra?: ReactNode;
  hint?: string;
}) {
  const status =
    state.kind === 'ready'
      ? { text: state.label, cls: 'text-learn' }
      : state.kind === 'pending'
        ? { text: tr('newLesson.checkWaiting'), cls: 'text-muted' }
        : state.kind === 'error'
          ? { text: tr(state.message), cls: 'text-live' }
          : { text: hint ?? '', cls: 'text-warn' };
  return (
    <div className="flex flex-col gap-2 rounded-[10px] bg-sunk px-3.5 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-semibold">{name}</span>
        {extra}
        <span className="ml-auto">{action}</span>
      </div>
      {status.text && (
        <p role={state.kind === 'error' ? 'alert' : 'status'} className={cx('text-sm', status.cls)}>
          {status.text}
        </p>
      )}
    </div>
  );
}

/** Live input level of the microphone as 12 bars. */
function Meter({ stream }: { stream?: MediaStream }) {
  const bars = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!stream) return;
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    let frame = 0;
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let peak = 0;
      for (const v of data) peak = Math.max(peak, Math.abs(v - 128) / 128);
      bars.current?.querySelectorAll('i').forEach((b, i) => {
        const shape = 1 - Math.abs(i - 5.5) / 8;
        b.style.height = `${Math.round(15 + Math.min(1, peak * 3) * 85 * shape)}%`;
      });
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(frame);
      void ctx.close();
    };
  }, [stream]);
  return (
    <span ref={bars} aria-hidden className="flex h-[22px] items-end gap-[3px]">
      {Array.from({ length: 12 }, (_, i) => (
        <i
          key={i}
          className="block h-[15%] w-1 rounded-sm bg-learn transition-[height] duration-100"
        />
      ))}
    </span>
  );
}
