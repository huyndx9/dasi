export interface SttResult {
  text: string;
  /** ISO 639-1, e.g. "ko". */
  lang: string;
  /** Label from diarization. */
  speaker?: string;
  startMs: number;
  endMs: number;
}

export interface SttStream {
  write(chunk: ArrayBuffer): void;
  end(): Promise<void>;
  on(event: 'partial' | 'final', cb: (r: SttResult) => void): void;
  on(event: 'error', cb: (e: Error) => void): void;
}

export interface SttOpenOptions {
  languages: string[];
  /** Lesson vocabulary, passed to the provider to improve recognition. */
  context?: string[];
  diarize?: boolean;
}

export interface SttProvider {
  openStream(opts: SttOpenOptions): Promise<SttStream>;
}
