import { describe, expect, it } from 'vitest';
import { CHUNK_SAMPLES, PcmEncoder } from './pcm';

const samples = (buf: ArrayBuffer) => Array.from(new Int16Array(buf));

describe('PcmEncoder', () => {
  it('turns 48 kHz into 100 ms frames of 1 600 samples at 16 kHz', () => {
    const enc = new PcmEncoder(48_000);
    const frames = enc.push(new Float32Array(48_000 / 10).fill(0.5));
    expect(frames).toHaveLength(1);
    expect(frames[0]!.byteLength).toBe(CHUNK_SAMPLES * 2);
    expect(new Set(samples(frames[0]!))).toEqual(new Set([Math.round(0.5 * 0x7fff)]));
  });

  it('keeps its place across blocks of any size', () => {
    const ramp = Float32Array.from({ length: 9_600 }, (_, i) => (i % 480) / 480 - 0.5);
    const whole = new PcmEncoder(48_000).push(ramp).flatMap(samples);
    const split = new PcmEncoder(48_000);
    const parts = [128, 1000, 37, 4000, 4435].reduce<number[][]>((acc, n, k, all) => {
      const start = all.slice(0, k).reduce((a, b) => a + b, 0);
      acc.push(split.push(ramp.subarray(start, start + n)).flatMap(samples));
      return acc;
    }, []);
    expect(parts.flat()).toEqual(whole);
    expect(whole).toHaveLength(3_200);
  });

  // The encoder keeps the last input sample back to interpolate with the next block.
  it('handles 44.1 kHz and clips out-of-range samples', () => {
    const enc = new PcmEncoder(44_100);
    const frames = enc.push(new Float32Array(44_100).fill(2));
    expect(frames).toHaveLength(10); // one second
    expect(samples(frames[0]!)[0]).toBe(0x7fff);
    expect(samples(new PcmEncoder(16_000).push(new Float32Array(1_601).fill(-3))[0]!)[0]).toBe(
      -0x8000,
    );
  });

  it('refuses input below 16 kHz', () => {
    expect(() => new PcmEncoder(8_000)).toThrow();
  });
});
