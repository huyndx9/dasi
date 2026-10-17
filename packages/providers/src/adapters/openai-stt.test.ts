import type {
  RealtimeClientEvent,
  RealtimeServerEvent,
  RealtimeTranscriptionSessionCreateRequest,
  SessionUpdateEvent,
} from 'openai/resources/realtime/realtime';
import { describe, expect, it } from 'vitest';
import { createSttProvider, type SttResult } from '../index';
import {
  OpenAiSttProvider,
  Resampler,
  sessionUpdate,
  toBase64,
  type TranscriptionSocket,
} from './openai-stt';

/** In-memory socket: records what the adapter sends and lets the test play server events. */
function fakeSocket() {
  const sent: RealtimeClientEvent[] = [];
  const handlers = {
    event: [] as ((e: RealtimeServerEvent) => void)[],
    error: [] as ((e: Error) => void)[],
    close: [] as (() => void)[],
  };
  let closed = false;
  const socket: TranscriptionSocket = {
    send: (event) => sent.push(event),
    close: () => {
      closed = true;
      handlers.close.forEach((cb) => cb());
    },
    onEvent: (cb) => handlers.event.push(cb),
    onError: (cb) => handlers.error.push(cb),
    onClose: (cb) => handlers.close.push(cb),
  };
  return {
    socket,
    sent,
    isClosed: () => closed,
    server(event: Record<string, unknown>) {
      handlers.event.forEach((cb) => cb({ event_id: 'e', ...event } as RealtimeServerEvent));
    },
    drop() {
      handlers.close.forEach((cb) => cb());
    },
  };
}

async function open(opts = { languages: ['ko'], context: ['할인', '계산'] }) {
  const fake = fakeSocket();
  const stt = new OpenAiSttProvider({
    apiKey: 'test',
    model: 'stt-model',
    connect: async () => fake.socket,
    endTimeoutMs: 50,
  });
  const stream = await stt.openStream(opts);
  const events: [string, SttResult][] = [];
  const errors: Error[] = [];
  stream.on('partial', (r) => events.push(['partial', r]));
  stream.on('final', (r) => events.push(['final', r]));
  stream.on('error', (e) => errors.push(e));
  return { ...fake, stream, events, errors };
}

/** Plays one utterance: speech start/stop, commit and optional transcript events. */
function utterance(
  fake: ReturnType<typeof fakeSocket>,
  id: string,
  startMs: number,
  endMs: number,
  transcript?: string,
) {
  fake.server({ type: 'input_audio_buffer.speech_started', item_id: id, audio_start_ms: startMs });
  fake.server({ type: 'input_audio_buffer.speech_stopped', item_id: id, audio_end_ms: endMs });
  fake.server({ type: 'input_audio_buffer.committed', item_id: id });
  if (transcript !== undefined) completed(fake, id, transcript);
}

function completed(fake: ReturnType<typeof fakeSocket>, id: string, transcript: string) {
  fake.server({
    type: 'conversation.item.input_audio_transcription.completed',
    item_id: id,
    content_index: 0,
    transcript,
  });
}

function transcription(event: SessionUpdateEvent) {
  return (event.session as RealtimeTranscriptionSessionCreateRequest).audio?.input?.transcription;
}

describe('sessionUpdate', () => {
  it('configures 24 kHz PCM, server VAD, the model, language and vocabulary', () => {
    const event = sessionUpdate('stt-model', { languages: ['ko'], context: ['할인', '계산'] });
    expect(event).toMatchObject({
      type: 'session.update',
      session: {
        type: 'transcription',
        audio: {
          input: {
            format: { type: 'audio/pcm', rate: 24000 },
            transcription: { model: 'stt-model', language: 'ko' },
            turn_detection: { type: 'server_vad' },
          },
        },
      },
    });
    expect(transcription(event)?.prompt).toContain('할인, 계산');
  });

  it('lets the model detect the language when several are possible, and skips an empty prompt', () => {
    expect(transcription(sessionUpdate('m', { languages: ['ko', 'en'] }))).toEqual({ model: 'm' });
  });
});

describe('OpenAiSttProvider stream', () => {
  it('sends the session config first, then audio resampled to 24 kHz as base64', async () => {
    const { sent, stream } = await open();
    expect(sent[0]).toMatchObject({ type: 'session.update' });

    stream.write(new ArrayBuffer(3_200)); // 100 ms at 16 kHz
    const append = sent[1] as { type: string; audio: string };
    expect(append.type).toBe('input_audio_buffer.append');
    // ~150 ms at 24 kHz = ~2 400 samples = ~4 800 bytes ≈ 6 400 base64 chars
    expect(Math.abs(append.audio.length - 6_400)).toBeLessThan(16);
  });

  it('emits growing partials from deltas, then one final with VAD timestamps', async () => {
    const fake = await open();
    fake.server({ type: 'input_audio_buffer.speech_started', item_id: 'a', audio_start_ms: 1200 });
    fake.server({ type: 'input_audio_buffer.speech_stopped', item_id: 'a', audio_end_ms: 3400 });
    fake.server({ type: 'input_audio_buffer.committed', item_id: 'a' });
    for (const delta of ['안녕', '하세요', ', 여러분.']) {
      fake.server({
        type: 'conversation.item.input_audio_transcription.delta',
        item_id: 'a',
        delta,
      });
    }
    completed(fake, 'a', '안녕하세요, 여러분.');

    expect(fake.events.map(([kind, r]) => [kind, r.text])).toEqual([
      ['partial', '안녕'],
      ['partial', '안녕하세요'],
      ['partial', '안녕하세요, 여러분.'],
      ['final', '안녕하세요, 여러분.'],
    ]);
    expect(fake.events[3]![1]).toEqual({
      text: '안녕하세요, 여러분.',
      lang: 'ko',
      startMs: 1200,
      endMs: 3400,
    });
  });

  it('keeps finals in speaking order when transcripts complete out of order', async () => {
    const fake = await open();
    utterance(fake, 'a', 0, 1000);
    utterance(fake, 'b', 1500, 2500, '두 번째');
    expect(fake.events).toEqual([]);
    completed(fake, 'a', '첫 번째');
    expect(fake.events.map(([, r]) => r.text)).toEqual(['첫 번째', '두 번째']);
  });

  it('reports a failed utterance without blocking the next ones, and skips empty transcripts', async () => {
    const fake = await open();
    utterance(fake, 'a', 0, 1000);
    utterance(fake, 'b', 1000, 2000, '');
    utterance(fake, 'c', 2000, 3000, '세 번째');
    fake.server({
      type: 'conversation.item.input_audio_transcription.failed',
      item_id: 'a',
      content_index: 0,
      error: { message: 'audio too short' },
    });
    expect(fake.errors[0]!.message).toMatch(/audio too short/);
    expect(fake.events.map(([kind, r]) => [kind, r.text])).toEqual([['final', '세 번째']]);
  });

  it('on end, commits speech in progress, waits for its transcript and closes', async () => {
    const fake = await open();
    fake.server({ type: 'input_audio_buffer.speech_started', item_id: 'a', audio_start_ms: 0 });
    const ending = fake.stream.end();
    expect(fake.sent.at(-1)).toEqual({ type: 'input_audio_buffer.commit' });
    expect(fake.isClosed()).toBe(false);

    fake.server({ type: 'input_audio_buffer.committed', item_id: 'a' });
    completed(fake, 'a', '마지막');
    await ending;
    expect(fake.events.map(([, r]) => r.text)).toEqual(['마지막']);
    expect(fake.isClosed()).toBe(true);
    expect(fake.errors).toEqual([]);
  });

  it('closes without committing when nobody is speaking, and gives up after the timeout', async () => {
    const quiet = await open();
    await quiet.stream.end();
    expect(quiet.sent.map((e) => e.type)).toEqual(['session.update']);
    expect(quiet.isClosed()).toBe(true);

    const stuck = await open();
    utterance(stuck, 'a', 0, 1000); // transcript never arrives
    await stuck.stream.end();
    expect(stuck.isClosed()).toBe(true);
  });

  it('reports writes after end and a dropped connection', async () => {
    const fake = await open();
    fake.drop();
    expect(fake.errors[0]!.message).toMatch(/Mất kết nối/);
    fake.stream.write(new ArrayBuffer(10)); // ignored: already reported
    expect(fake.errors).toHaveLength(1);

    const other = await open();
    await other.stream.end();
    other.stream.write(new ArrayBuffer(10));
    expect(other.errors.map((e) => e.message)).toEqual(['Stream đã kết thúc']);
  });
});

describe('Resampler', () => {
  function pcm(...samples: number[]): ArrayBuffer {
    const view = new DataView(new ArrayBuffer(samples.length * 2));
    samples.forEach((s, i) => view.setInt16(i * 2, s, true));
    return view.buffer;
  }
  function samples(buffer: ArrayBuffer): number[] {
    const view = new DataView(buffer);
    return Array.from({ length: buffer.byteLength / 2 }, (_, i) => view.getInt16(i * 2, true));
  }

  it('produces 3 output samples for every 2 input samples, interpolating between them', () => {
    const out = samples(new Resampler().push(pcm(0, 300, 600, 900, 1200)));
    expect(out).toEqual([0, 200, 400, 600, 800, 1000]);
  });

  it('joins chunks seamlessly, including a chunk split inside a sample', () => {
    const whole = samples(new Resampler().push(pcm(0, 300, 600, 900, 1200, 1500, 1800)));
    const r = new Resampler();
    const bytes = new Uint8Array(pcm(0, 300, 600, 900, 1200, 1500, 1800));
    const parts = [bytes.slice(0, 3), bytes.slice(3, 8), bytes.slice(8)].map((p) =>
      samples(r.push(p.buffer)),
    );
    expect(parts.flat()).toEqual(whole);
  });
});

describe('toBase64', () => {
  it('matches the standard encoding with padding', () => {
    const enc = (s: string) => toBase64(new TextEncoder().encode(s).buffer as ArrayBuffer);
    expect([enc(''), enc('f'), enc('fo'), enc('foo'), enc('foob')]).toEqual([
      '',
      'Zg==',
      'Zm8=',
      'Zm9v',
      'Zm9vYg==',
    ]);
  });
});

describe('createSttProvider("openai")', () => {
  it('names every missing setting', () => {
    expect(() => createSttProvider({ STT_PROVIDER: 'openai' })).toThrow(
      /OPENAI_API_KEY, STT_MODEL/,
    );
  });

  it('builds the adapter when configured', () => {
    const stt = createSttProvider({ STT_PROVIDER: 'openai', OPENAI_API_KEY: 'k', STT_MODEL: 'm' });
    expect(stt).toBeInstanceOf(OpenAiSttProvider);
  });
});
