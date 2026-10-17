import type {
  AudioSource,
  LiveSegment,
  RealtimeErrorCode,
  RoomStatus,
  ServerMessage,
} from '@dasi/shared';

/** Most finals kept on screen; older ones stay in the database and the lesson detail. */
export const MAX_FEED = 500;

/** What the live screen shows, built only from server messages (packages/shared realtime.ts). */
export interface FeedState {
  status: RoomStatus | 'connecting';
  targetLangs: string[];
  /** Final segments in seq order. */
  finals: LiveSegment[];
  /** At most one partial per source (protocol rule). */
  partials: Partial<Record<AudioSource, LiveSegment>>;
  /** Translations that arrived before their final (possible after a reconnect). */
  pending: Record<number, LiveSegment['translations']>;
  students: number;
  error: RealtimeErrorCode | null;
}

export function initialFeed(targetLangs: string[] = []): FeedState {
  return {
    status: 'connecting',
    targetLangs,
    finals: [],
    partials: {},
    pending: {},
    students: 0,
    error: null,
  };
}

/**
 * Applies one server message. Idempotent: the same message twice (several connections of
 * one teacher, or a replay in `ready` after a reconnect) leaves the same state.
 */
export function applyMessage(state: FeedState, msg: ServerMessage): FeedState {
  switch (msg.type) {
    case 'ready': {
      let next: FeedState = { ...state, status: msg.status, targetLangs: msg.targetLangs };
      for (const s of msg.recent) next = addFinal(next, s);
      return next;
    }
    case 'segment':
      if (msg.segment.state === 'final') return addFinal(state, msg.segment);
      return { ...state, partials: { ...state.partials, [msg.segment.source]: msg.segment } };
    case 'translation': {
      const i = state.finals.findIndex((s) => s.seq === msg.seq);
      if (i === -1) {
        return { ...state, pending: { ...state.pending, [msg.seq]: msg.translations } };
      }
      const finals = [...state.finals];
      const s = finals[i]!;
      finals[i] = { ...s, translations: { ...s.translations, ...msg.translations } };
      return { ...state, finals };
    }
    case 'status':
      return { ...state, status: msg.status };
    case 'presence':
      return { ...state, students: msg.students };
    case 'error':
      return { ...state, error: msg.code };
  }
}

function addFinal(state: FeedState, segment: LiveSegment): FeedState {
  const { [segment.seq]: early, ...pending } = state.pending;
  const existing = state.finals.find((s) => s.seq === segment.seq);
  const merged: LiveSegment = {
    ...segment,
    translations: { ...existing?.translations, ...segment.translations, ...early },
  };
  const finals = state.finals.filter((s) => s.seq !== segment.seq);
  // Finals arrive in seq order, so this is almost always an append.
  let at = finals.length;
  while (at > 0 && finals[at - 1]!.seq > segment.seq) at--;
  finals.splice(at, 0, merged);
  if (finals.length > MAX_FEED) finals.splice(0, finals.length - MAX_FEED);

  // Drop the partial this final replaces (same source, partial seq <= final seq).
  const partial = state.partials[segment.source];
  const partials =
    partial && partial.seq <= segment.seq
      ? Object.fromEntries(
          Object.entries(state.partials).filter(([source]) => source !== segment.source),
        )
      : state.partials;
  return { ...state, finals, partials, pending };
}

/** Partials to show after the finals, oldest first. */
export function visiblePartials(state: FeedState): LiveSegment[] {
  return Object.values(state.partials)
    .filter((p): p is LiveSegment => p !== undefined)
    .sort((a, b) => a.startMs - b.startMs);
}
