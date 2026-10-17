import { MockLlmProvider, MockSttProvider, type TranslateInput } from '@dasi/providers';
import { REALTIME_CLOSE, type LiveSegment, type ServerMessage } from '@dasi/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { WebSocket } from 'ws';
import { buildApp } from './app';
import { loadEnv } from './env';
import type { FinalizeQueue, LessonAccess, LessonStore } from './store';

const LESSON = '20000000-0000-4000-8000-000000000001';
const OTHER_LESSON = '20000000-0000-4000-8000-000000000002';
const TEACHER = 'teacher-token';
const STUDENT = 'student-token';
const OUTSIDER = 'outsider-token';
const STUDENT_UZ = 'student-uz-token';

/** MockLlmProvider ("[vi] 안녕") that can also fail or stall, and counts calls. */
class TestLlm extends MockLlmProvider {
  mode: 'ok' | 'fail' | 'stall' = 'ok';
  calls: TranslateInput[] = [];
  override async translate(input: TranslateInput) {
    this.calls.push(input);
    if (this.mode === 'fail') throw new Error('LLM down');
    if (this.mode === 'stall') return new Promise<Record<string, string>>(() => undefined);
    return super.translate(input);
  }
}

/** In-memory LessonStore; `log` records the order of side effects. */
class FakeStore implements LessonStore {
  saved: LiveSegment[] = [];
  log: string[] = [];
  translations = new Map<string, Record<string, string>>();
  status: LessonAccess['status'] = 'live';
  targetLangs = ['vi', 'zh'];
  firstSeq = 0;

  async authenticate(token: string) {
    const users: Record<string, string> = {
      [TEACHER]: 'u-teacher',
      [STUDENT]: 'u-student',
      [STUDENT_UZ]: 'u-student-uz',
      [OUTSIDER]: 'u-outsider',
    };
    return users[token] ?? null;
  }
  async loadAccess(lessonId: string, userId: string): Promise<LessonAccess | null> {
    if (lessonId !== LESSON) return null;
    const members: Record<string, [LessonAccess['role'], string | null]> = {
      'u-teacher': ['teacher', null],
      'u-student': ['student', 'zh'],
      'u-student-uz': ['student', 'uz'],
    };
    const member = members[userId];
    if (!member) return null;
    return {
      lessonId,
      role: member[0],
      motherTongue: member[1],
      status: this.status,
      sources: ['mic', 'tab'],
      targetLangs: this.targetLangs,
      startedAt: new Date(Date.now() - 60_000),
    };
  }
  async nextSeq() {
    return this.firstSeq;
  }
  async saveFinal(_lessonId: string, segment: LiveSegment) {
    this.saved.push(segment);
    return `seg-${segment.seq}`;
  }
  async saveTranslations(segmentId: string, translations: Record<string, string>) {
    this.log.push(`saveTranslations:${segmentId}`);
    this.translations.set(segmentId, translations);
  }
  async markProcessing() {
    this.log.push('markProcessing');
    this.status = 'processing';
  }
}

class FakeQueue implements FinalizeQueue {
  constructor(private readonly store: FakeStore) {}
  jobs: string[] = [];
  async enqueue(lessonId: string) {
    this.store.log.push(`enqueue:${this.store.status}`);
    this.jobs.push(lessonId);
  }
}

/** A connected test client that records every server message and the close code. */
interface Client {
  ws: WebSocket;
  messages: ServerMessage[];
  closed: Promise<number>;
  next(type: ServerMessage['type'], count?: number): Promise<ServerMessage[]>;
}

let store: FakeStore;
let queue: FakeQueue;
let llm: TestLlm;
let app: ReturnType<typeof buildApp>;

beforeEach(async () => {
  store = new FakeStore();
  queue = new FakeQueue(store);
  llm = new TestLlm();
  app = buildApp(loadEnv({ LOG_LEVEL: 'silent' }), {
    store,
    queue,
    stt: new MockSttProvider(),
    llm,
    helloTimeoutMs: 200,
    translateTimeoutMs: 150,
  });
  await app.ready();
});
afterEach(() => app.close());

async function connect(lessonId = LESSON): Promise<Client> {
  const ws = await app.injectWS(`/ws/lessons/${lessonId}`);
  const messages: ServerMessage[] = [];
  const waiters: (() => void)[] = [];
  ws.on('message', (data) => {
    messages.push(JSON.parse(data.toString()) as ServerMessage);
    waiters.splice(0).forEach((w) => w());
  });
  const closed = new Promise<number>((resolve) => ws.on('close', (code) => resolve(code)));
  return {
    ws,
    messages,
    closed,
    async next(type, count = 1) {
      const deadline = Date.now() + 2000;
      for (;;) {
        const found = messages.filter((m) => m.type === type);
        if (found.length >= count) return found;
        if (Date.now() > deadline) throw new Error(`Timed out waiting for ${count} × ${type}`);
        await new Promise<void>((r) => {
          waiters.push(r);
          setTimeout(r, 50);
        });
      }
    },
  };
}

async function join(token: string, role: 'teacher' | 'student', source?: 'mic' | 'tab') {
  const c = await connect();
  c.ws.send(JSON.stringify({ type: 'hello', token, role, source }));
  await c.next('ready');
  return c;
}

/** 64 000 bytes = one utterance of MockSttProvider: a partial halfway, then a final. */
function speak(c: Client, utterances = 1) {
  for (let i = 0; i < utterances * 10; i++) c.ws.send(Buffer.alloc(6_400));
}

const segments = (c: Client) =>
  c.messages.flatMap((m) => (m.type === 'segment' ? [m.segment] : []));

describe('joining a lesson', () => {
  it('closes connections that never say hello', async () => {
    const c = await connect();
    expect(await c.closed).toBe(REALTIME_CLOSE.unauthorized);
    expect(c.messages).toEqual([{ type: 'error', code: 'unauthorized' }]);
  });

  it('refuses invalid tokens, outsiders, wrong roles and other lessons', async () => {
    const cases: [string, object, number][] = [
      [LESSON, { token: 'nope', role: 'student' }, REALTIME_CLOSE.unauthorized],
      [LESSON, { token: OUTSIDER, role: 'student' }, REALTIME_CLOSE.forbidden],
      [LESSON, { token: STUDENT, role: 'teacher' }, REALTIME_CLOSE.forbidden],
      [LESSON, { token: STUDENT, role: 'student', source: 'mic' }, REALTIME_CLOSE.forbidden],
      [OTHER_LESSON, { token: TEACHER, role: 'teacher' }, REALTIME_CLOSE.forbidden],
      ['not-a-uuid', { token: TEACHER, role: 'teacher' }, REALTIME_CLOSE.badMessage],
    ];
    for (const [lesson, hello, code] of cases) {
      const c = await connect(lesson);
      c.ws.send(JSON.stringify({ type: 'hello', ...hello }));
      expect(await c.closed, JSON.stringify(hello)).toBe(code);
    }
  });

  it('refuses lessons that are no longer live', async () => {
    store.status = 'review';
    const c = await connect();
    c.ws.send(JSON.stringify({ type: 'hello', token: STUDENT, role: 'student' }));
    expect(await c.closed).toBe(REALTIME_CLOSE.notLive);
    expect(c.messages).toEqual([{ type: 'error', code: 'not_live' }]);
  });

  it('tells the teacher how many students are watching', async () => {
    const teacher = await join(TEACHER, 'teacher', 'mic');
    expect(teacher.messages).toContainEqual({ type: 'presence', students: 0 });
    const student = await join(STUDENT, 'student');
    await teacher.next('presence', 2);
    expect(teacher.messages.at(-1)).toEqual({ type: 'presence', students: 1 });
    student.ws.terminate(); // injectWS only reports a dropped connection, not a clean close
    await teacher.next('presence', 3);
    expect(teacher.messages.at(-1)).toEqual({ type: 'presence', students: 0 });
  });
});

describe('subtitles', () => {
  it('broadcasts partials live and saves finals in order before broadcasting them', async () => {
    store.firstSeq = 7; // continues after segments saved before a reconnect
    const teacher = await join(TEACHER, 'teacher', 'mic');
    const student = await join(STUDENT, 'student');
    speak(teacher, 2);
    await student.next('segment', 4);

    const seen = segments(student);
    const finals = seen.filter((s) => s.state === 'final');
    const partials = seen.filter((s) => s.state === 'partial');
    expect(finals.map((s) => s.seq)).toEqual([7, 8]);
    // Each partial announces the seq its final gets, even while the previous final is saving.
    expect(partials.map((s) => s.seq)).toEqual([7, 8]);
    for (const f of finals) {
      expect(seen.indexOf(f)).toBeGreaterThan(seen.findIndex((s) => s.seq === f.seq));
    }
    expect(store.saved.map((s) => [s.seq, s.text])).toEqual([
      [7, '안녕하세요, 여러분.'],
      [8, '오늘은 존댓말을 배워요.'],
    ]);
    // Timestamps are on the lesson timeline (it started a minute ago), not the stream's.
    expect(store.saved[0]!.startMs).toBeGreaterThanOrEqual(60_000);
    expect(store.saved.every((s) => s.state === 'final' && s.source === 'mic')).toBe(true);
  });

  it('replays recent finals to students who join late', async () => {
    const teacher = await join(TEACHER, 'teacher', 'mic');
    speak(teacher);
    await teacher.next('segment', 2);
    const late = await join(STUDENT, 'student');
    const ready = late.messages.find((m) => m.type === 'ready');
    expect(ready).toMatchObject({ role: 'student', status: 'live', targetLangs: ['vi', 'zh'] });
    expect(ready?.type === 'ready' && ready.recent.map((s) => s.seq)).toEqual([0]);
  });

  it('drops audio while paused and resumes', async () => {
    const teacher = await join(TEACHER, 'teacher', 'tab');
    const student = await join(STUDENT, 'student');
    teacher.ws.send(JSON.stringify({ type: 'pause' }));
    await student.next('status');
    speak(teacher);
    teacher.ws.send(JSON.stringify({ type: 'resume' }));
    await student.next('status', 2);
    speak(teacher);
    await student.next('segment', 2);
    expect(store.saved).toHaveLength(1);
    expect(student.messages.filter((m) => m.type === 'status')).toEqual([
      { type: 'status', status: 'paused' },
      { type: 'status', status: 'live' },
    ]);
  });

  it('refuses audio and control messages from students', async () => {
    const student = await join(STUDENT, 'student');
    student.ws.send(Buffer.alloc(100));
    expect(await student.closed).toBe(REALTIME_CLOSE.badMessage);

    const other = await join(STUDENT, 'student');
    other.ws.send(JSON.stringify({ type: 'end' }));
    expect(await other.closed).toBe(REALTIME_CLOSE.forbidden);
    expect(queue.jobs).toEqual([]);
  });

  it('replaces an older connection for the same source', async () => {
    const first = await join(TEACHER, 'teacher', 'mic');
    await join(TEACHER, 'teacher', 'mic');
    expect(await first.closed).toBe(REALTIME_CLOSE.replaced);
  });
});

describe('ending the lesson', () => {
  it('saves the last finals, marks the lesson processing, then queues lesson.finalize once', async () => {
    const teacher = await join(TEACHER, 'teacher', 'mic');
    const student = await join(STUDENT, 'student');
    speak(teacher);
    await student.next('segment', 2);

    teacher.ws.send(JSON.stringify({ type: 'end' }));
    teacher.ws.send(JSON.stringify({ type: 'end' }));
    expect(await student.closed).toBe(REALTIME_CLOSE.ended);
    expect(await teacher.closed).toBe(REALTIME_CLOSE.ended);

    expect(store.saved).toHaveLength(1);
    expect(store.log).toEqual(['saveTranslations:seg-0', 'markProcessing', 'enqueue:processing']);
    expect(queue.jobs).toEqual([LESSON]);
    expect(student.messages.at(-1)).toEqual({ type: 'status', status: 'processing' });

    // The lesson is no longer live, so nobody can rejoin it.
    const again = await connect();
    again.ws.send(
      JSON.stringify({ type: 'hello', token: TEACHER, role: 'teacher', source: 'mic' }),
    );
    expect(await again.closed).toBe(REALTIME_CLOSE.notLive);
  });
});

describe('without Supabase settings', () => {
  it('refuses to join and says why', async () => {
    const bare = buildApp(loadEnv({ LOG_LEVEL: 'silent' }), { store: null, queue: null });
    await bare.ready();
    const ws = await bare.injectWS(`/ws/lessons/${LESSON}`);
    const closed = new Promise<number>((r) => ws.on('close', (code) => r(code)));
    ws.send(JSON.stringify({ type: 'hello', token: TEACHER, role: 'teacher' }));
    expect(await closed).toBe(REALTIME_CLOSE.notConfigured);
    await bare.close();
  });
});

describe('translation (issue #8)', () => {
  const translationsOf = (c: Client) =>
    c.messages.flatMap((m) => (m.type === 'translation' ? [m] : []));

  it('translates each final once into every target language and stores it', async () => {
    const teacher = await join(TEACHER, 'teacher', 'mic');
    await join(STUDENT, 'student');
    await join(STUDENT_UZ, 'student');
    speak(teacher, 2);
    await teacher.next('translation', 2);

    // One call per sentence, whatever the number of students.
    expect(llm.calls.map((c) => [c.from, c.to])).toEqual([
      ['ko', ['vi', 'zh']],
      ['ko', ['vi', 'zh']],
    ]);
    expect(store.translations.get('seg-0')).toEqual({
      vi: '[vi] 안녕하세요, 여러분.',
      zh: '[zh] 안녕하세요, 여러분.',
    });
    expect(translationsOf(teacher).map((t) => [t.seq, Object.keys(t.translations)])).toEqual([
      [0, ['vi', 'zh']],
      [1, ['vi', 'zh']],
    ]);
  });

  it('sends each student only their own language, or English, or nothing', async () => {
    store.targetLangs = ['zh', 'en'];
    const teacher = await join(TEACHER, 'teacher', 'mic');
    const zh = await join(STUDENT, 'student');
    const uz = await join(STUDENT_UZ, 'student');
    expect(zh.messages[0]).toMatchObject({ type: 'ready', language: 'zh' });
    expect(uz.messages[0]).toMatchObject({ type: 'ready', language: 'en' }); // SPEC §7 fallback
    speak(teacher);
    await zh.next('translation');
    await uz.next('translation');
    expect(translationsOf(zh)[0]!.translations).toEqual({ zh: '[zh] 안녕하세요, 여러분.' });
    expect(translationsOf(uz)[0]!.translations).toEqual({ en: '[en] 안녕하세요, 여러분.' });

    // A late joiner gets recent finals with only their language.
    const late = await join(STUDENT, 'student');
    const ready = late.messages[0];
    expect(ready?.type === 'ready' && ready.recent[0]!.translations).toEqual({
      zh: '[zh] 안녕하세요, 여러분.',
    });
  });

  it('gives Korean only when the lesson has neither the mother tongue nor English', async () => {
    const teacher = await join(TEACHER, 'teacher', 'mic');
    const uz = await join(STUDENT_UZ, 'student'); // lesson: vi, zh
    expect(uz.messages[0]).toMatchObject({ language: null });
    speak(teacher);
    await teacher.next('translation');
    expect(translationsOf(uz)).toEqual([]);
    expect(segments(uz).some((s) => s.state === 'final')).toBe(true);
  });

  it('keeps the Korean line when translation fails or is too slow', async () => {
    for (const mode of ['fail', 'stall'] as const) {
      llm.mode = mode;
      const teacher = await join(TEACHER, 'teacher', 'mic');
      const student = await join(STUDENT, 'student');
      speak(teacher);
      await student.next('segment', 2);
      await new Promise((r) => setTimeout(r, 250)); // past translateTimeoutMs
      expect(translationsOf(student), mode).toEqual([]);
      expect(segments(student).filter((s) => s.state === 'final')).toHaveLength(1);
      teacher.ws.send(JSON.stringify({ type: 'end' }));
      expect(await student.closed, mode).toBe(REALTIME_CLOSE.ended); // ending does not hang
      store.status = 'live';
    }
  });
});
