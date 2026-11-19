import { describe, it, expect } from 'vitest';
import { getWorld } from '../../src/content';

const sizes = (id: 'hangul' | 'numbers' | 'abc') => getWorld(id).groups.map((g) => g.items.length);

describe('content', () => {
  it('hangul consonants and vowels', () => {
    const w = getWorld('hangul');
    const glyphs = (ids: string[]) =>
      w.groups.filter((g) => ids.includes(g.id)).flatMap((g) => g.items.map((i) => i.glyph)).join('');
    expect(glyphs(['c1', 'c2', 'c3', 'c4'])).toBe('ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ');
    expect(glyphs(['v1', 'v2', 'v3'])).toBe('ㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣ');
  });
  it('hangul group layout', () => {
    const w = getWorld('hangul');
    expect(w.groups.map((g) => g.id)).toEqual(['c1', 'c2', 'c3', 'c4', 'v1', 'v2', 'v3', 's1', 's2', 's3', 's4']);
    expect(sizes('hangul')).toEqual([4, 4, 3, 3, 4, 3, 3, 4, 4, 3, 3]);
  });
  it('hangul syllables 가~하 with picture words starting with the syllable', () => {
    const w = getWorld('hangul');
    const items = w.groups.filter((g) => g.id.startsWith('s')).flatMap((g) => g.items);
    expect(items.map((i) => i.glyph).join('')).toBe('가나다라마바사아자차카타파하');
    for (const i of items) {
      expect(i.name).toBe(i.glyph);
      expect(i.word.startsWith(i.glyph)).toBe(true);
      expect(i.lang).toBe('ko-KR');
    }
  });
  it('ids unique across worlds', () => {
    for (const id of ['hangul', 'numbers', 'abc'] as const) {
      const ids = getWorld(id).groups.flatMap((g) => g.items.map((i) => i.id));
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
  it('abc A-Z', () => {
    const w = getWorld('abc');
    const items = w.groups.flatMap((g) => g.items);
    expect(items.map((i) => i.glyph).join('')).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    for (const g of w.groups) {
      expect(g.items.length).toBeGreaterThanOrEqual(4);
      expect(g.items.length).toBeLessThanOrEqual(5);
    }
    expect(items.every((i) => i.lang === 'en-US')).toBe(true);
  });
  it('word and emoji non-empty', () => {
    for (const id of ['hangul', 'numbers', 'abc'] as const)
      for (const g of getWorld(id).groups)
        for (const i of g.items) {
          expect(i.word).not.toBe('');
          expect(i.emoji).not.toBe('');
        }
  });
  it('numbers', () => {
    const w = getWorld('numbers');
    expect(w.groups.map((g) => g.id)).toEqual(
      ['count5', 'count10', 'compare5', 'oneMore', 'sequence', 'add5', 'mix10', 'count20'],
    );
    expect(w.groups[0].items.map((i) => i.glyph)).toEqual(['1', '2', '3', '4', '5']);
    expect(w.groups[1].items.map((i) => i.glyph)).toEqual(['6', '7', '8', '9', '10']);
    expect(w.groups[0].items[0]).toEqual({
      id: 'num-1', glyph: '1', name: '하나', word: '사과 하나', emoji: '🍎', lang: 'ko-KR',
    });
    expect(w.groups[1].items.map((i) => i.name)).toEqual(['여섯', '일곱', '여덟', '아홉', '열']);
    expect(sizes('numbers')).toEqual([5, 5, 0, 0, 0, 0, 0, 0]);
  });
  it('titles', () => {
    expect(getWorld('hangul').title).toBe('한글');
    expect(getWorld('numbers').mascot).toBe('🐰');
    expect(getWorld('abc').mascot).toBe('🦊');
  });
});
