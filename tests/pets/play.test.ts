import { describe, expect, it } from 'vitest';
import { seededRng } from '../../src/core/rng';
import { PARK_SPOTS, canFetch, dragTarget, nextHide, throwTarget, toyFor } from '../../src/pets/play';

const seeds = Array.from({ length: 100 }, (_, i) => i + 1);

describe('canFetch', () => {
  it('walking friends fetch; trees and unhatched eggs do not', () => {
    expect(canFetch({ kind: 'dog', stage: 0, care: 0 })).toBe(true);
    expect(canFetch({ kind: 'chick', stage: 0, care: 0 })).toBe(false);
    expect(canFetch({ kind: 'chick', stage: 1, care: 0 })).toBe(true);
    expect(canFetch({ kind: 'tree', stage: 2, care: 0 })).toBe(false);
  });
});

describe('toyFor', () => {
  it('each friend throws its own toy', () => {
    expect(toyFor('dog')).toBe('⚽');
    expect(toyFor('cat')).toBe('🧶');
    expect(toyFor('chick')).toBe('🐛');
  });
});

describe('PARK_SPOTS', () => {
  it('has five places, each asked with a place word', () => {
    expect(PARK_SPOTS.map((x) => x.id)).toEqual(['tree', 'slide', 'bench', 'bush', 'flowers']);
    expect(PARK_SPOTS.map((x) => x.ask)).toEqual(['나무 뒤일까?', '미끄럼틀 뒤일까?', '벤치 밑일까?', '덤불 속일까?', '꽃밭 속일까?']);
  });
});

describe('nextHide', () => {
  it('never repeats the last spot', () => {
    for (const seed of seeds) {
      const n = nextHide(seededRng(seed), 3, 1);
      expect(n).not.toBe(1);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(3);
      const m = nextHide(seededRng(seed), 3, null);
      expect(m).toBeGreaterThanOrEqual(0);
      expect(m).toBeLessThan(3);
    }
  });
});

describe('throw targets', () => {
  it('clamps into the field', () => {
    expect(throwTarget({ x: 0, y: 0 }, { x: -50, y: 900 }, { w: 400, h: 300 }, 32)).toEqual({ x: 32, y: 268 });
    expect(throwTarget({ x: 0, y: 0 }, { x: 100, y: 120 }, { w: 400, h: 300 }, 32)).toEqual({ x: 100, y: 120 });
  });

  it('a drag throws along its direction, scaled', () => {
    expect(dragTarget({ x: 200, y: 250 }, { x: 200, y: 250 }, { x: 260, y: 200 }, 3)).toEqual({ x: 380, y: 100 });
  });
});
