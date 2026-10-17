import type { LiveSegment, ServerMessage } from '@dasi/shared';
import { describe, expect, it } from 'vitest';
import { applyMessage, initialFeed, MAX_FEED, visiblePartials, type FeedState } from './feed';

const seg = (seq: number, state: 'partial' | 'final', over: Partial<LiveSegment> = {}) =>
  ({
    seq,
    state,
    source: 'mic',
    text: `câu ${seq}`,
    startMs: seq * 1000,
    endMs: seq * 1000 + 900,
    translations: {},
    ...over,
  }) as LiveSegment;

const run = (...msgs: ServerMessage[]) => msgs.reduce(applyMessage, initialFeed());

describe('applyMessage', () => {
  it('starts from ready with recent finals and the room status', () => {
    const s = run({
      type: 'ready',
      lessonId: 'l',
      role: 'teacher',
      status: 'paused',
      targetLangs: ['vi', 'zh'],
      language: null,
      recent: [seg(0, 'final'), seg(1, 'final')],
    });
    expect(s.status).toBe('paused');
    expect(s.targetLangs).toEqual(['vi', 'zh']);
    expect(s.finals.map((f) => f.seq)).toEqual([0, 1]);
  });

  it('keeps one partial per source and drops it when its final arrives', () => {
    let s = run(
      { type: 'segment', segment: seg(3, 'partial', { text: '안녕' }) },
      { type: 'segment', segment: seg(3, 'partial', { text: '안녕하세요' }) },
      { type: 'segment', segment: seg(0, 'partial', { source: 'tab' }) },
    );
    expect(visiblePartials(s).map((p) => p.text)).toEqual(['câu 0', '안녕하세요']);

    // A final with a lower seq from the same source keeps the newer partial (protocol rule).
    s = applyMessage(s, { type: 'segment', segment: seg(2, 'final') });
    expect(s.partials.mic?.seq).toBe(3);
    s = applyMessage(s, { type: 'segment', segment: seg(3, 'final') });
    expect(s.partials.mic).toBeUndefined();
    expect(s.partials.tab).toBeDefined();
  });

  it('merges translations sent after the final, even before it arrives', () => {
    const early = run(
      { type: 'translation', seq: 5, translations: { vi: 'Xin chào' } },
      { type: 'segment', segment: seg(5, 'final') },
      { type: 'translation', seq: 5, translations: { zh: '你好' } },
    );
    expect(early.finals[0]!.translations).toEqual({ vi: 'Xin chào', zh: '你好' });
    expect(early.pending).toEqual({});
  });

  it('is idempotent and keeps seq order when messages repeat or arrive late', () => {
    const msgs: ServerMessage[] = [
      { type: 'segment', segment: seg(1, 'final') },
      { type: 'translation', seq: 1, translations: { vi: 'một' } },
      { type: 'segment', segment: seg(0, 'final') },
    ];
    const once = run(...msgs);
    const twice = run(...msgs, ...msgs);
    expect(twice).toEqual(once);
    expect(once.finals.map((f) => f.seq)).toEqual([0, 1]);
    // A replay without translations (ready after reconnect) keeps what we already have.
    const replay = applyMessage(once, {
      type: 'ready',
      lessonId: 'l',
      role: 'teacher',
      status: 'live',
      targetLangs: ['vi'],
      language: null,
      recent: [seg(1, 'final')],
    });
    expect(replay.finals[1]!.translations).toEqual({ vi: 'một' });
  });

  it('tracks status, presence and errors, and caps the feed', () => {
    let s: FeedState = run(
      { type: 'status', status: 'processing' },
      { type: 'presence', students: 21 },
      { type: 'error', code: 'stt_failed' },
    );
    expect([s.status, s.students, s.error]).toEqual(['processing', 21, 'stt_failed']);
    for (let i = 0; i < MAX_FEED + 10; i++) {
      s = applyMessage(s, { type: 'segment', segment: seg(i, 'final') });
    }
    expect(s.finals).toHaveLength(MAX_FEED);
    expect(s.finals[0]!.seq).toBe(10);
  });
});
