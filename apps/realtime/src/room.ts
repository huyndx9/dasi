import type { LlmProvider, SttProvider, SttResult, SttStream } from '@dasi/providers';
import {
  isLanguageCode,
  RECENT_SEGMENTS,
  REALTIME_CLOSE,
  subtitleLanguageFor,
  type AudioSource,
  type LanguageCode,
  type LiveSegment,
  type RoomStatus,
  type ServerMessage,
} from '@dasi/shared';
import type { FinalizeQueue, LessonStore } from './store';

/** One connected browser tab, as the room sees it. */
export interface Peer {
  send(message: ServerMessage): void;
  close(code: number): void;
}

export interface Logger {
  info(obj: object, msg?: string): void;
  warn(obj: object, msg?: string): void;
  error(obj: object, msg?: string): void;
}

export interface RoomDeps {
  store: LessonStore;
  queue: FinalizeQueue | null;
  stt: SttProvider;
  llm: LlmProvider;
  log: Logger;
  /** A translation slower than this is dropped; students keep the Korean line. */
  translateTimeoutMs: number;
}

type Translations = Partial<Record<LanguageCode, string>>;

interface SourceStream {
  peer: Peer;
  stream: SttStream;
}

/**
 * A live lesson: teacher audio in (one STT stream per source), segments out to everyone.
 * Partials are broadcast as they come; finals are numbered, saved, then broadcast, one at
 * a time so seq order matches the order students see (CLAUDE.md rule 6). Each saved final
 * is then translated once into every target language (issue #8): cost follows the number
 * of languages, not of students, and each student receives only their own language.
 */
export class Room {
  private readonly sources = new Map<AudioSource, SourceStream>();
  private readonly teachers = new Set<Peer>();
  /** Students and the one subtitle language each receives (null: Korean only). */
  private readonly students = new Map<Peer, string | null>();
  private readonly translating = new Set<Promise<void>>();
  private readonly recent: LiveSegment[] = [];
  private status: RoomStatus = 'live';
  private finals: Promise<void> = Promise.resolve();
  /** Finals received from STT but not yet saved; partials count them when guessing their seq. */
  private pendingFinals = 0;
  private ending: Promise<void> | null = null;

  constructor(
    readonly lessonId: string,
    private seq: number,
    private readonly startedAt: Date,
    readonly targetLangs: string[],
    private readonly deps: RoomDeps,
    private readonly onEmpty: (room: Room) => void,
  ) {}

  get peerCount(): number {
    return this.teachers.size + this.students.size;
  }

  get isEnding(): boolean {
    return this.ending !== null;
  }

  join(peer: Peer, role: 'teacher' | 'student', motherTongue: string | null = null): void {
    const language =
      role === 'student' ? subtitleLanguageFor(motherTongue, this.targetLangs) : null;
    if (role === 'teacher') this.teachers.add(peer);
    else this.students.set(peer, language);
    peer.send({
      type: 'ready',
      lessonId: this.lessonId,
      role,
      status: this.status,
      targetLangs: this.targetLangs,
      language,
      recent: this.recent.map((s) =>
        role === 'teacher' ? s : { ...s, translations: pick(s.translations, language) },
      ),
    });
    if (role === 'teacher') peer.send({ type: 'presence', students: this.students.size });
    else this.sendPresence();
  }

  /** Opens an STT stream for a teacher audio connection; replaces an older one for the same source. */
  async attachSource(peer: Peer, source: AudioSource): Promise<void> {
    const previous = this.sources.get(source);
    if (previous) {
      this.sources.delete(source);
      previous.peer.close(REALTIME_CLOSE.replaced);
      void previous.stream.end();
    }

    const stream = await this.deps.stt.openStream({ languages: ['ko'], diarize: false });
    // STT timestamps start at 0 per stream; shift them onto the lesson's timeline.
    const offsetMs = Math.max(0, Date.now() - this.startedAt.getTime());
    stream.on('partial', (r) => {
      if (this.ending) return;
      const seq = this.seq + this.pendingFinals;
      this.broadcast({
        type: 'segment',
        segment: this.toSegment(r, source, offsetMs, 'partial', seq),
      });
    });
    stream.on('final', (r) => this.queueFinal(r, source, offsetMs));
    stream.on('error', (error) => {
      this.deps.log.warn({ err: error, lessonId: this.lessonId, source }, 'STT stream error');
      peer.send({ type: 'error', code: 'stt_failed' });
    });
    this.sources.set(source, { peer, stream });
  }

  audio(source: AudioSource, chunk: ArrayBuffer): void {
    if (this.status !== 'live' || this.ending) return;
    this.sources.get(source)?.stream.write(chunk);
  }

  setPaused(paused: boolean): void {
    if (this.ending) return;
    const next: RoomStatus = paused ? 'paused' : 'live';
    if (next === this.status) return;
    this.status = next;
    this.broadcast({ type: 'status', status: next });
  }

  leave(peer: Peer): void {
    this.teachers.delete(peer);
    if (this.students.delete(peer)) this.sendPresence();
    for (const [source, s] of this.sources) {
      if (s.peer !== peer) continue;
      this.sources.delete(source);
      // Flush what the teacher already said; its finals still get saved.
      void s.stream.end();
    }
    if (this.peerCount === 0 && !this.ending) void this.finals.then(() => this.onEmpty(this));
  }

  /**
   * Ends the lesson: stop audio, save the last finals, mark the lesson `processing`
   * BEFORE queueing lesson.finalize (the worker skips lessons in any other state),
   * then close every connection. Calling it twice returns the same promise.
   */
  end(): Promise<void> {
    this.ending ??= this.finish().catch((error: unknown) => {
      this.ending = null;
      this.deps.log.error({ err: error, lessonId: this.lessonId }, 'Ending the lesson failed');
      for (const t of this.teachers) t.send({ type: 'error', code: 'end_failed' });
      throw error;
    });
    return this.ending;
  }

  private async finish(): Promise<void> {
    const streams = [...this.sources.values()].map((s) => s.stream);
    this.sources.clear();
    await Promise.all(streams.map((s) => s.end()));
    await this.finals;
    // Post-class processing reads segment_translations too.
    await Promise.allSettled([...this.translating]);
    await this.deps.store.markProcessing(this.lessonId, new Date());
    if (this.deps.queue) {
      await this.deps.queue.enqueue(this.lessonId);
    } else {
      this.deps.log.warn(
        { lessonId: this.lessonId },
        'REDIS_URL not set: lesson.finalize not queued',
      );
    }
    this.status = 'processing';
    this.broadcast({ type: 'status', status: 'processing' });
    for (const peer of [...this.teachers, ...this.students.keys()])
      peer.close(REALTIME_CLOSE.ended);
    this.teachers.clear();
    this.students.clear();
    this.onEmpty(this);
  }

  private queueFinal(r: SttResult, source: AudioSource, offsetMs: number): void {
    this.pendingFinals++;
    this.finals = this.finals.then(async () => {
      const segment = this.toSegment(r, source, offsetMs, 'final', this.seq);
      let segmentId: string;
      try {
        segmentId = await this.deps.store.saveFinal(this.lessonId, segment);
      } catch (error) {
        this.pendingFinals--;
        this.deps.log.error(
          { err: error, lessonId: this.lessonId, seq: segment.seq },
          'Saving a segment failed',
        );
        for (const t of this.teachers) t.send({ type: 'error', code: 'save_failed' });
        return;
      }
      this.seq++;
      this.pendingFinals--;
      this.recent.push(segment);
      if (this.recent.length > RECENT_SEGMENTS) this.recent.shift();
      this.broadcast({ type: 'segment', segment });
      this.track(this.translate(segment, segmentId));
    });
  }

  private track(task: Promise<void>): void {
    this.translating.add(task);
    void task.finally(() => this.translating.delete(task));
  }

  /** Translates a saved final into every target language, stores it, then sends it out. */
  private async translate(segment: LiveSegment, segmentId: string): Promise<void> {
    if (this.targetLangs.length === 0) return;
    let translations: Translations;
    try {
      const result = await withTimeout(
        this.deps.llm.translate({ text: segment.text, from: 'ko', to: this.targetLangs }),
        this.deps.translateTimeoutMs,
      );
      translations = Object.fromEntries(
        Object.entries(result).filter(([lang, text]) => isLanguageCode(lang) && text.trim() !== ''),
      ) as Translations;
    } catch (error) {
      this.deps.log.warn(
        { err: error, lessonId: this.lessonId, seq: segment.seq },
        'Translation failed; students keep the Korean line',
      );
      return;
    }

    try {
      await this.deps.store.saveTranslations(segmentId, translations);
    } catch (error) {
      // Students still get the translation live; the review page will show it missing.
      this.deps.log.error(
        { err: error, lessonId: this.lessonId, seq: segment.seq },
        'Saving translations failed',
      );
    }

    segment.translations = translations;
    for (const t of this.teachers) t.send({ type: 'translation', seq: segment.seq, translations });
    for (const [peer, language] of this.students) {
      const own = pick(translations, language);
      if (Object.keys(own).length > 0)
        peer.send({ type: 'translation', seq: segment.seq, translations: own });
    }
  }

  private toSegment(
    r: SttResult,
    source: AudioSource,
    offsetMs: number,
    state: LiveSegment['state'],
    seq: number,
  ): LiveSegment {
    return {
      seq,
      state,
      source,
      speaker: r.speaker,
      text: r.text,
      startMs: offsetMs + r.startMs,
      endMs: offsetMs + Math.max(r.endMs, r.startMs),
      translations: {},
    };
  }

  private sendPresence(): void {
    for (const t of this.teachers) t.send({ type: 'presence', students: this.students.size });
  }

  private broadcast(message: ServerMessage): void {
    for (const peer of this.teachers) peer.send(message);
    for (const peer of this.students.keys()) peer.send(message);
  }
}

function pick(translations: Translations, language: string | null): Translations {
  if (!language || !isLanguageCode(language)) return {};
  const text = translations[language];
  return text === undefined ? {} : { [language]: text };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out after ${ms} ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

/** Live rooms by lesson id. Creating one reads the next seq, so concurrent joins share a promise. */
export class RoomRegistry {
  private readonly rooms = new Map<string, Promise<Room>>();

  constructor(private readonly deps: RoomDeps) {}

  get size(): number {
    return this.rooms.size;
  }

  get(lessonId: string, startedAt: Date, targetLangs: string[]): Promise<Room> {
    let room = this.rooms.get(lessonId);
    if (!room) {
      room = this.deps.store.nextSeq(lessonId).then(
        (seq) =>
          new Room(lessonId, seq, startedAt, targetLangs, this.deps, (r) => {
            if (r.peerCount === 0 || r.isEnding) this.rooms.delete(lessonId);
          }),
      );
      room.catch(() => this.rooms.delete(lessonId));
      this.rooms.set(lessonId, room);
    }
    return room;
  }
}
