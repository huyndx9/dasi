import { REALTIME_CLOSE, type ServerMessage } from '@dasi/shared';
import { describe, expect, it } from 'vitest';
import { RealtimeConnection, type ConnectionState, type SocketLike } from './connection';

class FakeSocket implements SocketLike {
  binaryType = 'blob';
  readyState = 0;
  sent: (string | ArrayBuffer)[] = [];
  closedWith: number | undefined;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  send(data: string | ArrayBuffer) {
    this.sent.push(data);
  }
  close(code?: number) {
    this.closedWith = code;
  }
  open() {
    this.readyState = 1;
    this.onopen?.();
  }
  receive(message: ServerMessage) {
    this.onmessage?.({ data: JSON.stringify(message) });
  }
  drop(code = 1006) {
    this.readyState = 3;
    this.onclose?.({ code });
  }
}

const ready: ServerMessage = {
  type: 'ready',
  lessonId: 'l',
  role: 'teacher',
  status: 'live',
  targetLangs: [],
  language: null,
  recent: [],
};

function setup(source?: 'mic' | 'tab') {
  const sockets: FakeSocket[] = [];
  const states: ConnectionState[] = [];
  const messages: ServerMessage[] = [];
  const timers: (() => void)[] = [];
  let n = 0;
  const conn = new RealtimeConnection({
    url: 'ws://rt/ws/lessons/l',
    role: 'teacher',
    source,
    getToken: async () => `token-${++n}`,
    onMessage: (m) => messages.push(m),
    onState: (s) => states.push(s),
    createSocket: () => {
      const s = new FakeSocket();
      sockets.push(s);
      return s;
    },
    schedule: (fn) => timers.push(fn),
  });
  return { conn, sockets, states, messages, timers };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('RealtimeConnection', () => {
  it('says hello with a fresh token and source, then reports ready', async () => {
    const { conn, sockets, states, messages } = setup('mic');
    conn.start();
    await flush();
    sockets[0]!.open();
    expect(JSON.parse(sockets[0]!.sent[0] as string)).toEqual({
      type: 'hello',
      token: 'token-1',
      role: 'teacher',
      source: 'mic',
    });
    expect(conn.sendAudio(new ArrayBuffer(4))).toBe(false); // not ready yet
    sockets[0]!.receive(ready);
    expect(conn.isReady).toBe(true);
    expect(states.at(-1)).toEqual({ kind: 'ready' });
    expect(messages).toEqual([ready]);
    expect(conn.sendAudio(new ArrayBuffer(4))).toBe(true);
    conn.send({ type: 'pause' });
    expect(sockets[0]!.sent.at(-1)).toBe('{"type":"pause"}');
  });

  it('reconnects with backoff and a new token after a dropped connection', async () => {
    const { conn, sockets, states, timers } = setup();
    conn.start();
    await flush();
    sockets[0]!.open();
    sockets[0]!.receive(ready);
    sockets[0]!.drop();
    expect(states.at(-1)).toEqual({ kind: 'reconnecting', delayMs: 1_000 });
    expect(conn.sendAudio(new ArrayBuffer(4))).toBe(false);

    timers.shift()!();
    await flush();
    sockets[1]!.open();
    expect(JSON.parse(sockets[1]!.sent[0] as string).token).toBe('token-2');
    sockets[1]!.drop(); // never got ready: backoff grows
    expect(states.at(-1)).toEqual({ kind: 'reconnecting', delayMs: 2_000 });
  });

  it('stops for good when the lesson ends or access is refused, and on stop()', async () => {
    for (const code of [REALTIME_CLOSE.ended, REALTIME_CLOSE.forbidden, REALTIME_CLOSE.replaced]) {
      const { conn, sockets, states, timers } = setup();
      conn.start();
      await flush();
      sockets[0]!.open();
      sockets[0]!.drop(code);
      expect(states.at(-1)).toEqual({ kind: 'closed', code });
      expect(timers).toHaveLength(0);
    }

    const { conn, sockets, timers } = setup();
    conn.start();
    await flush();
    conn.stop();
    expect(sockets[0]!.closedWith).toBe(1000);
    sockets[0]!.drop(1000);
    expect(timers).toHaveLength(0);
  });

  it('ignores binary and malformed frames', async () => {
    const { conn, sockets, messages } = setup();
    conn.start();
    await flush();
    sockets[0]!.onmessage?.({ data: new ArrayBuffer(2) });
    sockets[0]!.onmessage?.({ data: '{oops' });
    expect(messages).toEqual([]);
  });
});
