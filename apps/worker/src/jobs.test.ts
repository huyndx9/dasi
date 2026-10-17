import { describe, expect, it, vi } from 'vitest';
import { dispatch, type JobHandlers } from './jobs';

const lessonId = '6f1c1f7e-3a0b-4c55-9d43-1f0a0f3f2b10';

function handlers(): JobHandlers {
  return { 'lesson.finalize': vi.fn(async () => 'done') };
}

describe('dispatch', () => {
  it('routes a valid job to its handler', async () => {
    const h = handlers();
    await expect(dispatch(h, 'lesson.finalize', { lessonId })).resolves.toBe('done');
    expect(h['lesson.finalize']).toHaveBeenCalledWith({ lessonId });
  });

  it('rejects an invalid payload without calling the handler', async () => {
    const h = handlers();
    await expect(dispatch(h, 'lesson.finalize', { lessonId: 'x' })).rejects.toThrow();
    expect(h['lesson.finalize']).not.toHaveBeenCalled();
  });

  it('rejects unknown job names', async () => {
    await expect(dispatch(handlers(), 'toString', {})).rejects.toThrow(/Job không xác định/);
  });
});
