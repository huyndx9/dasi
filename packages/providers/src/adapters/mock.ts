import type { CompleteInput, LlmProvider, TranslateInput } from '../llm';
import type { SttOpenOptions, SttProvider, SttResult, SttStream } from '../stt';

/** Bytes of audio that make up one recognised utterance (16 kHz mono PCM16, about 2 s). */
const BYTES_PER_UTTERANCE = 64_000;

const SCRIPT = [
  '안녕하세요, 여러분.',
  '오늘은 존댓말을 배워요.',
  '선생님께서 말씀하셨어요.',
  '질문이 있으면 손을 드세요.',
];

/**
 * Deterministic STT for development and tests: every BYTES_PER_UTTERANCE bytes written
 * produce a partial and then a final result from a fixed Korean script.
 */
export class MockSttProvider implements SttProvider {
  async openStream(opts: SttOpenOptions): Promise<SttStream> {
    return new MockSttStream(opts);
  }
}

class MockSttStream implements SttStream {
  private listeners = { partial: [], final: [], error: [] } as {
    partial: ((r: SttResult) => void)[];
    final: ((r: SttResult) => void)[];
    error: ((e: Error) => void)[];
  };
  private buffered = 0;
  private utterance = 0;
  private ended = false;

  constructor(private readonly opts: SttOpenOptions) {}

  on(event: 'partial' | 'final', cb: (r: SttResult) => void): void;
  on(event: 'error', cb: (e: Error) => void): void;
  on(event: 'partial' | 'final' | 'error', cb: never): void {
    this.listeners[event].push(cb);
  }

  write(chunk: ArrayBuffer): void {
    if (this.ended) {
      this.listeners.error.forEach((cb) => cb(new Error('Stream đã kết thúc')));
      return;
    }
    this.buffered += chunk.byteLength;
    if (
      this.buffered >= BYTES_PER_UTTERANCE / 2 &&
      this.buffered - chunk.byteLength < BYTES_PER_UTTERANCE / 2
    ) {
      this.emit('partial', this.current().slice(0, -3) + '…');
    }
    if (this.buffered >= BYTES_PER_UTTERANCE) {
      this.buffered -= BYTES_PER_UTTERANCE;
      this.emit('final', this.current());
      this.utterance++;
    }
  }

  async end(): Promise<void> {
    this.ended = true;
  }

  private current(): string {
    return SCRIPT[this.utterance % SCRIPT.length]!;
  }

  private emit(event: 'partial' | 'final', text: string) {
    const startMs = this.utterance * 2000;
    const result: SttResult = {
      text,
      lang: this.opts.languages[0] ?? 'ko',
      speaker: this.opts.diarize ? 'S1' : undefined,
      startMs,
      endMs: startMs + (event === 'final' ? 2000 : 1000),
    };
    this.listeners[event].forEach((cb) => cb(result));
  }
}

/** Echo translator: marks the text with the target code so the UI path can be exercised. */
export class MockLlmProvider implements LlmProvider {
  async translate({ text, to }: TranslateInput): Promise<Record<string, string>> {
    return Object.fromEntries(to.map((lang) => [lang, `[${lang}] ${text}`]));
  }

  async complete<T>({ schema }: CompleteInput<T>): Promise<T> {
    throw new Error(
      schema
        ? 'MockLlmProvider không tạo được dữ liệu theo schema; cấu hình LLM_PROVIDER thật.'
        : 'MockLlmProvider không hỗ trợ complete(); cấu hình LLM_PROVIDER thật.',
    );
  }
}
