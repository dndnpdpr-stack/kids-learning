import { describe, expect, it } from 'vitest';
import { koreanCount, splitTen } from '../../src/core/koreanNumber';

describe('koreanCount', () => {
  it('reads 1..20 in native Korean', () => {
    expect(koreanCount(1)).toBe('하나');
    expect(koreanCount(5)).toBe('다섯');
    expect(koreanCount(10)).toBe('열');
    expect(koreanCount(11)).toBe('열하나');
    expect(koreanCount(13)).toBe('열셋');
    expect(koreanCount(19)).toBe('열아홉');
    expect(koreanCount(20)).toBe('스물');
  });
  it('rejects numbers out of 1..20', () => {
    for (const n of [0, 21, 1.5, -1]) expect(() => koreanCount(n)).toThrow();
  });
});

describe('splitTen', () => {
  it('says the number then ten and the rest', () => {
    expect(splitTen(13)).toBe('열셋! 열하고 셋!');
    expect(splitTen(11)).toBe('열하나! 열하고 하나!');
    expect(splitTen(20)).toBe('스물! 열하고 열!');
  });
});
