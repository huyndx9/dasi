import {
  REALTIME_CLOSE,
  type AudioSource,
  type ClientMessage,
  type ServerMessage,
} from '@dasi/shared';

/** Close codes after which reconnecting cannot help (lesson over, access refused, replaced). */
const FINAL_CLOSE_CODES = new Set<number>(Object.values(REALTIME_CLOSE));
export const RECONNECT_DELAYS_MS = [1_000, 2_000, 4_000, 8_000];

export type ConnectionState =
  | { kind: 'connecting' }
  | { kind: 'ready' }
  /** Lost, retrying in `delayMs`. */
  | { kind: 'reconnecting'; delayMs: number }
  /** Closed for good: lesson ended, refused, or stopped by us. */
  | { kind: 'closed'; code: number };

/** The part of the browser WebSocket this class uses, so tests can pass a fake. */
export interface SocketLike {
  binaryType: string;
  readyState: number;
  send(data: string | ArrayBuffer): void;
  close(code?: number): void;
  onopen: (() => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onclose: ((event: { code: number }) => void) | null;
}

export interface ConnectionOptions {
  /** `${NEXT_PUBLIC_REALTIME_URL}/ws/lessons/<id>`. */
  url: string;
  role: 'teacher' | 'student';
  /** Teacher audio connections only. */
  source?: AudioSource;
  /** A fresh Supabase access token for each (re)connect; tokens expire after an hour. */
  getToken: () => Promise<string>;
  onMessage: (message: ServerMessage) => void;
  onState: (state: ConnectionState) => void;
  createSocket?: (url: string) => SocketLike;
  /** Test hook for timers. */
  schedule?: (fn: () => void, ms: number) => unknown;
}

const OPEN = 1;

/**
 * One WebSocket to apps/realtime (protocol: packages/shared/src/realtime.ts): sends `hello`,
 * forwards server messages, reconnects with backoff after a dropped connection.
 */
export class RealtimeConnection {
  private socket: SocketLike | null = null;
  private attempt = 0;
  private stopped = false;
  private ready = false;

  constructor(private readonly opts: ConnectionOptions) {}

  start(): void {
    this.stopped = false;
    void this.open();
  }

  /** Closes for good (no reconnect). */
  stop(): void {
    this.stopped = true;
    this.ready = false;
    this.socket?.close(1000);
    this.socket = null;
  }

  get isReady(): boolean {
    return this.ready;
  }

  send(message: ClientMessage): void {
    if (this.ready && this.socket?.readyState === OPEN) this.socket.send(JSON.stringify(message));
  }

  /** Audio frame; dropped while not ready (the gateway would refuse it before `ready`). */
  sendAudio(frame: ArrayBuffer): boolean {
    if (!this.ready || this.socket?.readyState !== OPEN) return false;
    this.socket.send(frame);
    return true;
  }

  private async open(): Promise<void> {
    this.opts.onState({ kind: 'connecting' });
    let token: string;
    try {
      token = await this.opts.getToken();
    } catch {
      return this.retry();
    }
    if (this.stopped) return;
    const socket = (this.opts.createSocket ?? ((url) => new WebSocket(url) as SocketLike))(
      this.opts.url,
    );
    socket.binaryType = 'arraybuffer';
    this.socket = socket;

    socket.onopen = () => {
      socket.send(
        JSON.stringify({
          type: 'hello',
          token,
          role: this.opts.role,
          ...(this.opts.source ? { source: this.opts.source } : {}),
        } satisfies ClientMessage),
      );
    };
    socket.onmessage = (event) => {
      if (typeof event.data !== 'string') return;
      let message: ServerMessage;
      try {
        message = JSON.parse(event.data) as ServerMessage;
      } catch {
        return;
      }
      if (message.type === 'ready') {
        this.ready = true;
        this.attempt = 0;
        this.opts.onState({ kind: 'ready' });
      }
      this.opts.onMessage(message);
    };
    socket.onclose = (event) => {
      if (this.socket !== socket) return;
      this.socket = null;
      this.ready = false;
      if (this.stopped) return;
      if (FINAL_CLOSE_CODES.has(event.code)) {
        this.stopped = true;
        this.opts.onState({ kind: 'closed', code: event.code });
        return;
      }
      this.retry();
    };
  }

  private retry(): void {
    if (this.stopped) return;
    const delayMs = RECONNECT_DELAYS_MS[Math.min(this.attempt, RECONNECT_DELAYS_MS.length - 1)]!;
    this.attempt++;
    this.opts.onState({ kind: 'reconnecting', delayMs });
    (this.opts.schedule ?? setTimeout)(() => {
      if (!this.stopped) void this.open();
    }, delayMs);
  }
}
