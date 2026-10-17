import {
  clientMessageSchema,
  HELLO_TIMEOUT_MS,
  MAX_AUDIO_FRAME_BYTES,
  REALTIME_CLOSE,
  type AudioSource,
  type RealtimeErrorCode,
  type ServerMessage,
} from '@dasi/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { WebSocket } from 'ws';
import type { Peer, Room, RoomRegistry } from './room';
import type { LessonStore } from './store';

export interface GatewayOptions {
  /** Both null when Supabase is not configured: every join is refused with not_configured. */
  store: LessonStore | null;
  rooms: RoomRegistry | null;
  helloTimeoutMs?: number;
}

interface Session {
  room: Room;
  role: 'teacher' | 'student';
  source?: AudioSource;
}

const lessonIdSchema = z.uuid();

function toPeer(socket: WebSocket): Peer {
  return {
    send(message: ServerMessage) {
      if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
    },
    close(code: number) {
      if (socket.readyState === socket.OPEN || socket.readyState === socket.CONNECTING) {
        socket.close(code);
      }
    },
  };
}

function toArrayBuffer(data: Buffer | ArrayBuffer | Buffer[]): ArrayBuffer {
  const buf = Array.isArray(data) ? Buffer.concat(data) : Buffer.from(data as ArrayBuffer);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

/** `GET /ws/lessons/:lessonId`: the realtime protocol in packages/shared/src/realtime.ts. */
export function registerGateway(app: FastifyInstance, opts: GatewayOptions): void {
  const helloTimeoutMs = opts.helloTimeoutMs ?? HELLO_TIMEOUT_MS;

  app.get<{ Params: { lessonId: string } }>(
    '/ws/lessons/:lessonId',
    { websocket: true },
    (socket, req) => {
      const peer = toPeer(socket);
      const log = req.log;
      let session: Session | null = null;
      let helloStarted = false;

      const fail = (code: RealtimeErrorCode, closeCode: number) => {
        peer.send({ type: 'error', code });
        peer.close(closeCode);
      };

      const lessonId = lessonIdSchema.safeParse(req.params.lessonId);
      if (!lessonId.success) return fail('bad_message', REALTIME_CLOSE.badMessage);

      const helloTimer = setTimeout(() => {
        if (!session) fail('unauthorized', REALTIME_CLOSE.unauthorized);
      }, helloTimeoutMs);

      const hello = async (raw: unknown) => {
        const msg = clientMessageSchema.safeParse(raw);
        if (!msg.success || msg.data.type !== 'hello') {
          return fail('bad_message', REALTIME_CLOSE.badMessage);
        }
        const { token, role, source } = msg.data;
        if (!opts.store || !opts.rooms) return fail('not_configured', REALTIME_CLOSE.notConfigured);

        const userId = await opts.store.authenticate(token);
        if (!userId) return fail('unauthorized', REALTIME_CLOSE.unauthorized);
        const access = await opts.store.loadAccess(lessonId.data, userId);
        if (!access || access.role !== role) return fail('forbidden', REALTIME_CLOSE.forbidden);
        if (source && (role !== 'teacher' || !access.sources.includes(source))) {
          return fail('forbidden', REALTIME_CLOSE.forbidden);
        }
        if (access.status !== 'live') return fail('not_live', REALTIME_CLOSE.notLive);

        const room = await opts.rooms.get(lessonId.data, access.startedAt, access.targetLangs);
        if (room.isEnding) return fail('not_live', REALTIME_CLOSE.notLive);
        if (socket.readyState !== socket.OPEN) return;
        room.join(peer, role, access.motherTongue);
        if (source) {
          try {
            await room.attachSource(peer, source);
          } catch (error) {
            log.error(
              { err: error, lessonId: lessonId.data, source },
              'Opening the STT stream failed',
            );
            room.leave(peer);
            return fail('stt_failed', REALTIME_CLOSE.notConfigured);
          }
        }
        session = { room, role, source };
        clearTimeout(helloTimer);
        log.info({ lessonId: lessonId.data, role, source }, 'Joined lesson');
      };

      socket.on('message', (data, isBinary) => {
        if (isBinary) {
          if (session?.role === 'teacher' && session.source) {
            const chunk = toArrayBuffer(data);
            if (chunk.byteLength > MAX_AUDIO_FRAME_BYTES) {
              return fail('bad_message', REALTIME_CLOSE.badMessage);
            }
            session.room.audio(session.source, chunk);
          } else if (!helloStarted || session) {
            // Audio before hello, or from a student / control connection.
            fail('bad_message', REALTIME_CLOSE.badMessage);
          }
          return;
        }

        let raw: unknown;
        try {
          raw = JSON.parse(data.toString());
        } catch {
          return fail('bad_message', REALTIME_CLOSE.badMessage);
        }

        if (!session) {
          if (helloStarted) return;
          helloStarted = true;
          hello(raw).catch((error: unknown) => {
            log.error({ err: error }, 'Joining a lesson failed');
            fail('not_configured', REALTIME_CLOSE.notConfigured);
          });
          return;
        }

        const msg = clientMessageSchema.safeParse(raw);
        if (!msg.success || msg.data.type === 'hello') {
          return fail('bad_message', REALTIME_CLOSE.badMessage);
        }
        if (session.role !== 'teacher') return fail('forbidden', REALTIME_CLOSE.forbidden);
        if (msg.data.type === 'pause') session.room.setPaused(true);
        if (msg.data.type === 'resume') session.room.setPaused(false);
        if (msg.data.type === 'end') session.room.end().catch(() => undefined);
      });

      socket.on('close', () => {
        clearTimeout(helloTimer);
        session?.room.leave(peer);
      });
    },
  );
}
