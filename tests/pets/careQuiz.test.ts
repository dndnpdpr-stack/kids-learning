import { describe, expect, it } from 'vitest';
import { getWorld } from '../../src/content';
import type { Progress } from '../../src/core/progress';
import { seededRng } from '../../src/core/rng';
import { makeCareQuiz, quizSources } from '../../src/pets/careQuiz';

const prog = (correct: Record<string, number>): Progress => ({ stars: 0, correct, volume: 1 });
const seeds = Array.from({ length: 100 }, (_, i) => i + 1);

describe('quizSources', () => {
  it('falls back to counting 1–5 when nothing was played yet', () => {
    expect(quizSources(prog({}))).toEqual([{ world: 'numbers', group: 'count5' }]);
  });

  it('uses only groups that are unlocked and answered at least once', () => {
    const p = prog({ 'hangul/c1': 3, 'hangul/c2': 1, 'abc/abc1': 0, 'numbers/count5': 2 });
    const s = quizSources(p);
    expect(s).toContainEqual({ world: 'hangul', group: 'c1' });
    expect(s).toContainEqual({ world: 'hangul', group: 'c2' });
    expect(s).toContainEqual({ world: 'numbers', group: 'count5' });
    expect(s.some((x) => x.world === 'abc')).toBe(false);
  });

  it('skips a group whose record exists but is still locked', () => {
    // c3 needs 3 correct in c2 to unlock; c2 has only 1.
    const s = quizSources(prog({ 'hangul/c1': 3, 'hangul/c2': 1, 'hangul/c3': 2 }));
    expect(s).not.toContainEqual({ world: 'hangul', group: 'c3' });
  });
});

describe('makeCareQuiz', () => {
  it('letter worlds give a 3-choice find question from that group', () => {
    const p = prog({ 'hangul/c1': 1 });
    const c1 = getWorld('hangul').groups[0].items.map((i) => i.id);
    // only hangul played → but fallback is not used, so every quiz is hangul c1
    for (const seed of seeds) {
      const q = makeCareQuiz(p, seededRng(seed), null);
      expect(q.type).toBe('letter');
      if (q.type !== 'letter') continue;
      expect(q.world).toBe('hangul');
      expect(q.q.choices.length).toBe(3);
      expect(q.q.choices.every((c) => c1.includes(c.id))).toBe(true);
    }
  });

  it('number groups give an easy number question of that kind', () => {
    for (const seed of seeds) {
      const q = makeCareQuiz(prog({}), seededRng(seed), null);
      expect(q.type).toBe('number');
      if (q.type !== 'number') continue;
      expect(q.q.kind).toBe('count');
      expect(q.q.answer).toBeGreaterThanOrEqual(1);
      expect(q.q.answer).toBeLessThanOrEqual(5);
    }
  });

  it('moves to a different world than last time when it can', () => {
    const p = prog({ 'hangul/c1': 1, 'numbers/count5': 1, 'abc/abc1': 1 });
    for (const seed of seeds) {
      expect(makeCareQuiz(p, seededRng(seed), 'hangul').world).not.toBe('hangul');
    }
    // only one world available → it repeats rather than failing
    expect(makeCareQuiz(prog({}), seededRng(1), 'numbers').world).toBe('numbers');
  });
});
