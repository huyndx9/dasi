import OpenAI from 'openai';
import { OpenAIRealtimeWebSocket } from 'openai/realtime/websocket';
import type {
  RealtimeClientEvent,
  RealtimeServerEvent,
  SessionUpdateEvent,
} from 'openai/resources/realtime/realtime';
import type { SttOpenOptions, SttProvider, SttResult, SttStream } from '../stt';

/** The part of a Realtime transcription connection this adapter uses, so tests can pass a fake. */
export interface TranscriptionSocket {
  send(event: RealtimeClientEvent): void;
  close(): void;
  onEvent(cb: (event: RealtimeServerEvent) => void): void;
  onError(cb: (error: Error) => void): void;
  onClose(cb: () => void): void;
}

export interface OpenAiSttOptions {
  apiKey: string;
  /** Transcription model, e.g. `gpt-4o-transcribe`. */
  model: string;
  /** Opens an open socket; defaults to OpenAI's Realtime API with `intent=transcription`. */
  connect?: () => Promise<TranscriptionSocket>;
  /** How long `end()` waits for the last transcripts before closing. */
  endTimeoutMs?: number;
}

/** Input from the browser: 16 kHz mono PCM16. OpenAI only accepts 24 kHz. */
const INPUT_RATE = 16_000;
const OUTPUT_RATE = 24_000;
/** Longest vocabulary list sent as a recognition hint. */
const MAX_CONTEXT_TERMS = 100;

/**
 * Korean speech-to-text through OpenAI realtime transcription. Server VAD splits the audio
 * into utterances; transcript deltas become `partial` results and each completed utterance
 * becomes one `final`, in the order the utterances were spoken. No speaker labels.
 */
export class OpenAiSttProvider implements SttProvider {
  constructor(private readonly opts: OpenAiSttOptions) {}

  async openStream(opts: SttOpenOptions): Promise<SttStream> {
    const socket = await (this.opts.connect ?? (() => connectOpenAi(this.opts.apiKey)))();
    const stream = new OpenAiSttStream(socket, opts, this.opts.endTimeoutMs ?? 5_000);
    socket.send(sessionUpdate(this.opts.model, opts));
    return stream;
  }
}

export function sessionUpdate(model: string, opts: SttOpenOptions): SessionUpdateEvent {
  const terms = (opts.context ?? []).slice(0, MAX_CONTEXT_TERMS);
  return {
    type: 'session.update',
    session: {
      type: 'transcription',
      audio: {
        input: {
          format: { type: 'audio/pcm', rate: OUTPUT_RATE },
          transcription: {
            model,
            // One language is a hint; several means the model detects it.
            ...(opts.languages.length === 1 ? { language: opts.languages[0] } : {}),
            ...(terms.length
              ? { prompt: `Korean language class. Vocabulary that may appear: ${terms.join(', ')}` }
              : {}),
          },
          turn_detection: { type: 'server_vad', prefix_padding_ms: 300, silence_duration_ms: 500 },
        },
      },
    },
  };
}

interface Utterance {
  startMs: number;
  endMs?: number;
  text: string;
  done: boolean;
}

class OpenAiSttStream implements SttStream {
  private listeners = { partial: [], final: [], error: [] } as {
    partial: ((r: SttResult) => void)[];
    final: ((r: SttResult) => void)[];
    error: ((e: Error) => void)[];
  };
  private readonly resampler = new Resampler();
  private readonly utterances = new Map<string, Utterance>();
  /** Committed utterances not yet emitted as final, in speaking order. */
  private readonly order: string[] = [];
  private samplesWritten = 0;
  private speaking = false;
  private ended = false;
  private closed = false;
  private drained?: () => void;

  constructor(
    private readonly socket: TranscriptionSocket,
    private readonly opts: SttOpenOptions,
    private readonly endTimeoutMs: number,
  ) {
    socket.onEvent((event) => this.handle(event));
    socket.onError((error) => this.fail(error));
    socket.onClose(() => {
      this.closed = true;
      if (!this.ended) this.fail(new Error('Mất kết nối tới OpenAI STT'));
      this.drained?.();
    });
  }

  on(event: 'partial' | 'final', cb: (r: SttResult) => void): void;
  on(event: 'error', cb: (e: Error) => void): void;
  on(event: 'partial' | 'final' | 'error', cb: never): void {
    this.listeners[event].push(cb);
  }

  write(chunk: ArrayBuffer): void {
    if (this.ended) {
      this.fail(new Error('Stream đã kết thúc'));
      return;
    }
    if (this.closed) return;
    const pcm = this.resampler.push(chunk);
    this.samplesWritten += chunk.byteLength / 2;
    if (pcm.byteLength === 0) return;
    this.socket.send({ type: 'input_audio_buffer.append', audio: toBase64(pcm) });
  }

  /** Commits speech still in progress, waits for the remaining transcripts, then closes. */
  async end(): Promise<void> {
    if (this.ended) return;
    this.ended = true;
    if (!this.closed) {
      if (this.speaking) this.socket.send({ type: 'input_audio_buffer.commit' });
      if (!this.idle()) {
        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, this.endTimeoutMs);
          this.drained = () => {
            clearTimeout(timer);
            resolve();
          };
        });
      }
      this.socket.close();
    }
  }

  private handle(event: RealtimeServerEvent) {
    switch (event.type) {
      case 'input_audio_buffer.speech_started':
        this.speaking = true;
        this.utterance(event.item_id).startMs = event.audio_start_ms;
        break;
      case 'input_audio_buffer.speech_stopped':
        this.utterance(event.item_id).endMs = event.audio_end_ms;
        break;
      case 'input_audio_buffer.committed':
        this.speaking = false;
        this.queue(event.item_id);
        break;
      case 'conversation.item.input_audio_transcription.delta': {
        const u = this.utterance(event.item_id);
        u.text += event.delta ?? '';
        if (u.text.trim()) this.emit('partial', u, u.endMs ?? this.writtenMs());
        break;
      }
      case 'conversation.item.input_audio_transcription.completed': {
        const u = this.utterance(event.item_id);
        u.text = event.transcript;
        u.done = true;
        this.queue(event.item_id);
        break;
      }
      case 'conversation.item.input_audio_transcription.failed': {
        const u = this.utterance(event.item_id);
        u.text = '';
        u.done = true;
        this.fail(new Error(`OpenAI không nhận dạng được câu: ${event.error.message ?? 'lỗi'}`));
        this.queue(event.item_id);
        break;
      }
    }
  }

  private utterance(id: string): Utterance {
    let u = this.utterances.get(id);
    if (!u) {
      u = { startMs: this.writtenMs(), text: '', done: false };
      this.utterances.set(id, u);
    }
    return u;
  }

  /** Adds an utterance to the speaking order (once) and emits every final now ready. */
  private queue(id: string) {
    if (!this.order.includes(id)) this.order.push(id);
    while (this.order.length) {
      const head = this.order[0]!;
      const u = this.utterances.get(head)!;
      if (!u.done) break;
      this.order.shift();
      this.utterances.delete(head);
      if (u.text.trim()) this.emit('final', u, u.endMs ?? this.writtenMs());
    }
    if (this.ended && this.idle()) this.drained?.();
  }

  private idle(): boolean {
    return !this.speaking && this.order.length === 0;
  }

  private emit(event: 'partial' | 'final', u: Utterance, endMs: number) {
    const result: SttResult = {
      text: u.text.trim(),
      lang: this.opts.languages[0] ?? 'ko',
      startMs: u.startMs,
      endMs: Math.max(endMs, u.startMs),
    };
    this.listeners[event].forEach((cb) => cb(result));
  }

  private fail(error: Error) {
    this.listeners.error.forEach((cb) => cb(error));
  }

  private writtenMs(): number {
    return Math.round((this.samplesWritten / INPUT_RATE) * 1000);
  }
}

/**
 * Streaming 16 kHz → 24 kHz PCM16 resampler (linear interpolation). Keeps the tail of each
 * chunk so consecutive chunks join without clicks; tolerates chunks with an odd byte count.
 */
export class Resampler {
  private pending = new Int16Array(0);
  private oddByte?: number;
  /** Read position in the pending samples, in thirds of an input sample. */
  private pos = 0;

  push(chunk: ArrayBuffer): ArrayBuffer {
    let bytes = new Uint8Array(chunk);
    if (this.oddByte !== undefined) {
      bytes = Uint8Array.of(this.oddByte, ...bytes);
      this.oddByte = undefined;
    }
    if (bytes.length % 2) {
      this.oddByte = bytes[bytes.length - 1];
      bytes = bytes.subarray(0, -1);
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const input = new Int16Array(this.pending.length + bytes.length / 2);
    input.set(this.pending);
    for (let i = 0; i < bytes.length / 2; i++) {
      input[this.pending.length + i] = view.getInt16(i * 2, true);
    }

    // Each output sample advances 2/3 of an input sample (16 000 / 24 000).
    const out: number[] = [];
    while (Math.floor(this.pos / 3) + 1 < input.length) {
      const i = Math.floor(this.pos / 3);
      const frac = (this.pos % 3) / 3;
      out.push(Math.round(input[i]! + (input[i + 1]! - input[i]!) * frac));
      this.pos += 2;
    }
    const consumed = Math.floor(this.pos / 3);
    this.pending = input.slice(consumed);
    this.pos -= consumed * 3;

    const result = new DataView(new ArrayBuffer(out.length * 2));
    out.forEach((sample, i) => result.setInt16(i * 2, sample, true));
    return result.buffer;
  }
}

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i]! << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += BASE64[(n >> 18) & 63]! + BASE64[(n >> 12) & 63]!;
    out += i + 1 < bytes.length ? BASE64[(n >> 6) & 63]! : '=';
    out += i + 2 < bytes.length ? BASE64[n & 63]! : '=';
  }
  return out;
}

/** Opens OpenAI's Realtime API for transcription with the runtime's native WebSocket. */
async function connectOpenAi(apiKey: string): Promise<TranscriptionSocket> {
  const rt = new OpenAIRealtimeWebSocket({ intent: 'transcription' }, new OpenAI({ apiKey }));
  // Listen before the socket opens: the SDK throws errors that have no listener.
  const errorHandlers: ((error: Error) => void)[] = [];
  rt.on('error', (error) => errorHandlers.forEach((cb) => cb(error)));
  await new Promise<void>((resolve, reject) => {
    const failed = (cause?: Error) =>
      reject(new Error('Không mở được kết nối tới OpenAI STT', { cause }));
    errorHandlers.push(failed);
    rt.socket.addEventListener('close', () => failed(), { once: true });
    rt.socket.addEventListener('open', () => resolve(), { once: true });
  });
  errorHandlers.length = 0;
  return {
    send: (event) => rt.send(event),
    close: () => rt.close(),
    onEvent: (cb) => rt.on('event', cb),
    onError: (cb) => errorHandlers.push(cb),
    onClose: (cb) => rt.socket.addEventListener('close', () => cb()),
  };
}
