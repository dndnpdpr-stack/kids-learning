import { describe, expect, it } from 'vitest';
import { getWorld } from '../../src/content';
import type { Progress } from '../../src/core/progress';
import { seededRng } from '../../src/core/rng';
import { canFetch, dragTarget, hideSpots, nextHide, throwTarget, toyFor } from '../../src/pets/play';

const prog = (correct: Record<string, number>): Progress => ({ stars: 0, correct, volume: 1 });
const seeds = Array.from({ length: 100 }, (_, i) => i + 1);
const FALLBACK = ['🌳', '🏠', '🚗', '📦', '🌷'];

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

describe('hideSpots', () => {
  it('uses the fallback objects when nothing is learned', () => {
    const s = hideSpots(prog({}), seededRng(3));
    expect(s.length).toBe(3);
    expect(s.every((x) => FALLBACK.includes(x.emoji))).toBe(true);
    expect(new Set(s.map((x) => x.name)).size).toBe(3);
  });

  it('uses learned hangul picture words', () => {
    const c1 = getWorld('hangul').groups[0].items.map((i) => `${i.emoji}|${i.word}`);
    for (const seed of seeds.slice(0, 50)) {
      const s = hideSpots(prog({ 'hangul/c1': 1 }), seededRng(seed));
      expect(s.length).toBe(3);
      expect(s.every((x) => c1.includes(`${x.emoji}|${x.name}`))).toBe(true);
      expect(new Set(s.map((x) => x.name)).size).toBe(3);
    }
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
