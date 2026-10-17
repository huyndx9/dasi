import { describe, expect, it } from 'vitest';
import { lastLines, markWords } from './words';

describe('markWords', () => {
  it('underlines known words inside eojeol, longest first, without overlaps', () => {
    expect(markWords('이 가방 할인을 해 주세요.', ['할인', '가방', '가'])).toEqual([
      { text: '이 ' },
      { text: '가방', word: '가방' },
      { text: ' ' },
      { text: '할인', word: '할인' },
      { text: '을 해 주세요.' },
    ]);
    expect(markWords('할인가격', ['할인', '할인가격'])).toEqual([
      { text: '할인가격', word: '할인가격' },
    ]);
  });

  it('skips grammar patterns and empty words, and keeps lines without matches whole', () => {
    expect(markWords('먹고 싶어요', ['-고 싶다', ' ', ''])).toEqual([{ text: '먹고 싶어요' }]);
    expect(markWords('', ['할인'])).toEqual([]);
  });
});

describe('lastLines', () => {
  it('keeps the newest three in order', () => {
    expect(lastLines([1, 2, 3, 4, 5])).toEqual([3, 4, 5]);
    expect(lastLines([1])).toEqual([1]);
  });
});
