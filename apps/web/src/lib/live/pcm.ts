import { AUDIO_FORMAT } from '@dasi/shared';

/** 100 ms per WebSocket frame (docs/ARCHITECTURE.md: 100–200 ms chunks). */
export const CHUNK_SAMPLES = AUDIO_FORMAT.sampleRate / 10;

/**
 * Browser audio (Float32, usually 44.1 or 48 kHz) to PCM16 16 kHz mono frames for the
 * realtime gateway. Linear interpolation; keeps its position between blocks so consecutive
 * blocks join without clicks.
 */
export class PcmEncoder {
  private readonly step: number;
  /**
   * Position of the next output sample, counted from the sample before the current block
   * (`last`, position 0); the first block starts at its own first sample (position 1).
   */
  private pos = 1;
  /** Last input sample of the previous block (index -1 for the next block). */
  private last = 0;
  private buffer = new Int16Array(CHUNK_SAMPLES);
  private filled = 0;

  constructor(inputRate: number) {
    if (inputRate < AUDIO_FORMAT.sampleRate) {
      throw new Error(`Tần số ${inputRate} Hz thấp hơn ${AUDIO_FORMAT.sampleRate} Hz`);
    }
    this.step = inputRate / AUDIO_FORMAT.sampleRate;
  }

  /** Adds one block of samples; returns the complete 100 ms frames it produced. */
  push(input: Float32Array): ArrayBuffer[] {
    const frames: ArrayBuffer[] = [];
    const at = (i: number) => (i < 0 ? this.last : input[i]!);
    // `pos` counts from the sample before this block (index -1).
    while (this.pos <= input.length - 1) {
      const i = Math.floor(this.pos) - 1;
      const frac = this.pos - Math.floor(this.pos);
      const sample = at(i) + (at(i + 1) - at(i)) * frac;
      this.buffer[this.filled++] = toInt16(sample);
      if (this.filled === CHUNK_SAMPLES) {
        frames.push(this.buffer.buffer.slice(0));
        this.filled = 0;
      }
      this.pos += this.step;
    }
    if (input.length) {
      this.pos -= input.length;
      this.last = input[input.length - 1]!;
    }
    return frames;
  }
}

function toInt16(sample: number): number {
  const s = Math.max(-1, Math.min(1, sample));
  return Math.round(s < 0 ? s * 0x8000 : s * 0x7fff);
}
