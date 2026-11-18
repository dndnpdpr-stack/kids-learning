import { describe, expect, it } from 'vitest';
import { getWorld } from '../../src/content';
import {
  STORAGE_KEY,
  isGroupUnlocked,
  loadProgress,
  recordCorrect,
  resetProgress,
  saveProgress,
  type Progress,
} from '../../src/core/progress';

function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() { return m.size; },
    clear: () => m.clear(),
    getItem: (k: string) => m.get(k) ?? null,
    key: (i: number) => [...m.keys()][i] ?? null,
    removeItem: (k: string) => { m.delete(k); },
    setItem: (k: string, v: string) => { m.set(k, v); },
  };
}

const defaults: Progress = { stars: 0, correct: {}, volume: 1 };

describe('progress', () => {
  it('returns defaults for empty storage', () => {
    expect(loadProgress(memoryStorage())).toEqual(defaults);
  });

  it('round-trips save and load', () => {
    const s = memoryStorage();
    const p: Progress = { stars: 5, correct: { 'hangul/g1': 2 }, volume: 0.5 };
    saveProgress(p, s);
    expect(loadProgress(s)).toEqual(p);
  });

  it('returns defaults for broken JSON', () => {
    const s = memoryStorage();
    s.setItem(STORAGE_KEY, '{oops');
    expect(loadProgress(s)).toEqual(defaults);
  });

  it('returns defaults for invalid shapes', () => {
    const s = memoryStorage();
    s.setItem(STORAGE_KEY, JSON.stringify({ stars: 'x', correct: {}, volume: 1 }));
    expect(loadProgress(s)).toEqual(defaults);
    s.setItem(STORAGE_KEY, JSON.stringify({ stars: 1, correct: { a: 'b' }, volume: 1 }));
    expect(loadProgress(s)).toEqual(defaults);
    s.setItem(STORAGE_KEY, JSON.stringify({ stars: 1, correct: {}, volume: 2 }));
    expect(loadProgress(s)).toEqual(defaults);
  });

  it('survives throwing storage', () => {
    const bad = {
      getItem: () => { throw new Error('no'); },
      setItem: () => { throw new Error('no'); },
      removeItem: () => { throw new Error('no'); },
    } as unknown as Storage;
    expect(loadProgress(bad)).toEqual(defaults);
    expect(() => saveProgress(defaults, bad)).not.toThrow();
    expect(() => resetProgress(bad)).not.toThrow();
  });

  it('returns defaults for null storage', () => {
    expect(loadProgress(null)).toEqual(defaults);
    expect(() => saveProgress(defaults, null)).not.toThrow();
  });

  it('unlocks next group after 3 correct', () => {
    const world = getWorld('hangul');
    const key = `hangul/${world.groups[0].id}`;
    const two: Progress = { ...defaults, correct: { [key]: 2 } };
    const three: Progress = { ...defaults, correct: { [key]: 3 } };
    expect(isGroupUnlocked(defaults, world, 0)).toBe(true);
    expect(isGroupUnlocked(two, world, 1)).toBe(false);
    expect(isGroupUnlocked(three, world, 1)).toBe(true);
  });

  it('recordCorrect is immutable and adds a star', () => {
    const p: Progress = { stars: 1, correct: { 'abc/x': 1 }, volume: 1 };
    const n = recordCorrect(p, 'abc', 'x');
    expect(p).toEqual({ stars: 1, correct: { 'abc/x': 1 }, volume: 1 });
    expect(n.stars).toBe(2);
    expect(n.correct['abc/x']).toBe(2);
  });

  it('resetProgress clears and returns defaults', () => {
    const s = memoryStorage();
    saveProgress({ stars: 3, correct: {}, volume: 1 }, s);
    expect(resetProgress(s)).toEqual(defaults);
    expect(loadProgress(s)).toEqual(defaults);
  });
});
