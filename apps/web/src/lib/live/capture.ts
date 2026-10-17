import type { AudioSource } from '@dasi/shared';
import { PcmEncoder } from './pcm';

/** AudioWorklet that hands raw input blocks to the page; loaded from a Blob URL. */
const WORKLET = `
class DasiTap extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (channel) this.port.postMessage(channel.slice(0));
    return true;
  }
}
registerProcessor('dasi-tap', DasiTap);
`;

export interface Capture {
  /** Device or tab label, for the screen. */
  label: string;
  stop(): void;
}

/**
 * Opens a source and streams PCM16 16 kHz frames to `onFrame` (the realtime gateway format).
 * `onEnded` fires when the browser ends the source (tab sharing stopped, mic unplugged).
 * Throws the browser's media error (NotAllowedError, …); the caller maps it to a message.
 */
export async function startCapture(
  source: AudioSource,
  opts: { micId?: string; onFrame: (frame: ArrayBuffer) => void; onEnded: () => void },
): Promise<Capture> {
  const stream =
    source === 'mic'
      ? await navigator.mediaDevices.getUserMedia({
          audio: {
            ...(opts.micId ? { deviceId: { exact: opts.micId } } : {}),
            echoCancellation: true,
            noiseSuppression: true,
          },
        })
      : await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
  stream.getVideoTracks().forEach((t) => t.stop());
  const track = stream.getAudioTracks()[0];
  if (!track) {
    stream.getTracks().forEach((t) => t.stop());
    throw Object.assign(new Error('No audio track'), { name: 'NoAudioTrack' });
  }

  const ctx = new AudioContext();
  const url = URL.createObjectURL(new Blob([WORKLET], { type: 'text/javascript' }));
  try {
    await ctx.audioWorklet.addModule(url);
  } finally {
    URL.revokeObjectURL(url);
  }
  const node = new AudioWorkletNode(ctx, 'dasi-tap');
  const encoder = new PcmEncoder(ctx.sampleRate);
  node.port.onmessage = (event: MessageEvent<Float32Array>) => {
    for (const frame of encoder.push(event.data)) opts.onFrame(frame);
  };
  ctx.createMediaStreamSource(stream).connect(node);

  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    node.port.onmessage = null;
    stream.getTracks().forEach((t) => t.stop());
    void ctx.close();
  };
  track.addEventListener('ended', () => {
    stop();
    opts.onEnded();
  });
  return { label: track.label, stop };
}
