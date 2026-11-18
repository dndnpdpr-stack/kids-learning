import { describe, expect, it } from 'vitest';
import { seededRng } from '../../src/core/rng';
import { makeFindQuestion, makeNumberQuestion } from '../../src/core/quiz';
import { getWorld } from '../../src/content';
import type { LearnItem } from '../../src/content';

const pool: LearnItem[] = getWorld('hangul').groups.flatMap((g) => g.items).slice(0, 14);
const seeds = Array.from({ length: 200 }, (_, i) => i + 1);

describe('seededRng', () => {
  it('is deterministic and in [0,1)', () => {
    const a = seededRng(7);
    const b = seededRng(7);
    for (let i = 0; i < 50; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('makeFindQuestion', () => {
  it('has distinct choices including target (default 3)', () => {
    for (const s of seeds) {
      const q = makeFindQuestion(pool, seededRng(s));
      expect(q.choices).toHaveLength(3);
      expect(q.choices.map((c) => c.id)).toContain(q.target.id);
      expect(new Set(q.choices.map((c) => c.id)).size).toBe(3);
    }
  });
  it('supports choiceCount 2', () => {
    for (const s of seeds) {
      const q = makeFindQuestion(pool, seededRng(s), 2);
      expect(q.choices).toHaveLength(2);
      expect(q.choices.map((c) => c.id)).toContain(q.target.id);
    }
  });
  it('shrinks to small pools', () => {
    for (const s of seeds) {
      const one = makeFindQuestion(pool.slice(0, 1), seededRng(s));
      expect(one.choices).toEqual([pool[0]]);
      const two = makeFindQuestion(pool.slice(0, 2), seededRng(s));
      expect(two.choices).toHaveLength(2);
      expect(two.choices.map((c) => c.id)).toContain(two.target.id);
    }
  });
  it('throws on empty pool', () => {
    expect(() => makeFindQuestion([], seededRng(1))).toThrow();
  });
  it('is reproducible and varies target and order', () => {
    expect(makeFindQuestion(pool, seededRng(5))).toEqual(makeFindQuestion(pool, seededRng(5)));
    const targets = new Set(seeds.map((s) => makeFindQuestion(pool, seededRng(s)).target.id));
    expect(targets.size).toBeGreaterThan(5);
    const positions = new Set(
      seeds.map((s) => {
        const q = makeFindQuestion(pool, seededRng(s));
        return q.choices.findIndex((c) => c.id === q.target.id);
      }),
    );
    expect(positions.size).toBe(3);
  });
});

function checkChoices(choices: number[], answer: number, max: number) {
  expect(choices).toHaveLength(3);
  expect(new Set(choices).size).toBe(3);
  expect(choices).toContain(answer);
  for (const c of choices) {
    expect(c).toBeGreaterThanOrEqual(1);
    expect(c).toBeLessThanOrEqual(max);
  }
}

describe('makeNumberQuestion', () => {
  it('count10', () => {
    for (const s of seeds) {
      const q = makeNumberQuestion('count10', seededRng(s));
      expect(q.kind).toBe('count');
      expect(q.prompt).toBe('몇 개야?');
      expect(q.groups).toHaveLength(1);
      const n = q.groups[0];
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(10);
      expect(q.answer).toBe(n);
      expect(q.emoji.length).toBeGreaterThan(0);
      checkChoices(q.choices, q.answer, 10);
    }
  });
  it('count20', () => {
    for (const s of seeds) {
      const q = makeNumberQuestion('count20', seededRng(s));
      const n = q.groups[0];
      expect(q.kind).toBe('count');
      expect(n).toBeGreaterThanOrEqual(11);
      expect(n).toBeLessThanOrEqual(20);
      expect(q.answer).toBe(n);
      checkChoices(q.choices, q.answer, 20);
    }
  });
  it('compare', () => {
    for (const s of seeds) {
      const q = makeNumberQuestion('compare', seededRng(s));
      const [a, b] = q.groups;
      expect(q.kind).toBe('compare');
      expect(q.prompt).toBe('어느 쪽이 더 많아?');
      expect(q.groups).toHaveLength(2);
      expect(a).not.toBe(b);
      for (const g of q.groups) {
        expect(g).toBeGreaterThanOrEqual(1);
        expect(g).toBeLessThanOrEqual(10);
      }
      expect(q.choices).toEqual([0, 1]);
      expect(q.answer).toBe(a > b ? 0 : 1);
    }
  });
  it('add', () => {
    for (const s of seeds) {
      const q = makeNumberQuestion('add', seededRng(s));
      const [a, b] = q.groups;
      expect(q.kind).toBe('add');
      expect(q.prompt).toBe('모두 몇 개야?');
      expect(a).toBeGreaterThanOrEqual(1);
      expect(b).toBeGreaterThanOrEqual(1);
      expect(a + b).toBeLessThanOrEqual(10);
      expect(q.answer).toBe(a + b);
      checkChoices(q.choices, q.answer, 10);
    }
  });
  it('is reproducible', () => {
    for (const k of ['count10', 'count20', 'compare', 'add'] as const) {
      expect(makeNumberQuestion(k, seededRng(3))).toEqual(makeNumberQuestion(k, seededRng(3)));
    }
  });
});
