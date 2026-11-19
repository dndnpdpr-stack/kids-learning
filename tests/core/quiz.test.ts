import { describe, expect, it } from 'vitest';
import { seededRng } from '../../src/core/rng';
import { koreanCount } from '../../src/core/koreanNumber';
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

type Level = 0 | 1;
const levels: Level[] = [0, 1];

function distractors(choices: number[], answer: number) {
  return choices.filter((c) => c !== answer);
}

describe('makeNumberQuestion', () => {
  it('count5: 1..5, choices in 1..5', () => {
    for (const lv of levels)
      for (const s of seeds) {
        const q = makeNumberQuestion('count5', seededRng(s), lv);
        expect(q.kind).toBe('count');
        expect(q.prompt).toBe('몇 개야?');
        expect(q.groups).toHaveLength(1);
        const n = q.groups[0];
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(5);
        expect(q.answer).toBe(n);
        expect(q.emoji.length).toBeGreaterThan(0);
        checkChoices(q.choices, q.answer, 5);
      }
  });
  it('count10: 6..10, choices in 1..10', () => {
    for (const lv of levels)
      for (const s of seeds) {
        const q = makeNumberQuestion('count10', seededRng(s), lv);
        expect(q.kind).toBe('count');
        const n = q.groups[0];
        expect(n).toBeGreaterThanOrEqual(6);
        expect(n).toBeLessThanOrEqual(10);
        expect(q.answer).toBe(n);
        checkChoices(q.choices, q.answer, 10);
      }
  });
  it('count20: level 0 in 11..13, level 1 in 11..20', () => {
    const seen = new Set<number>();
    for (const s of seeds) {
      const q0 = makeNumberQuestion('count20', seededRng(s), 0);
      expect(q0.kind).toBe('count');
      expect(q0.groups[0]).toBeGreaterThanOrEqual(11);
      expect(q0.groups[0]).toBeLessThanOrEqual(13);
      expect(q0.answer).toBe(q0.groups[0]);
      checkChoices(q0.choices, q0.answer, 20);
      const q1 = makeNumberQuestion('count20', seededRng(s), 1);
      expect(q1.groups[0]).toBeGreaterThanOrEqual(11);
      expect(q1.groups[0]).toBeLessThanOrEqual(20);
      checkChoices(q1.choices, q1.answer, 20);
      seen.add(q1.groups[0]);
    }
    expect(Math.max(...seen)).toBeGreaterThan(13);
  });
  it('level defaults to 0', () => {
    for (const s of seeds) {
      expect(makeNumberQuestion('count20', seededRng(s))).toEqual(makeNumberQuestion('count20', seededRng(s), 0));
    }
  });
  it('level 0 distractors are all at least 2 away from the answer', () => {
    for (const k of ['count5', 'count10', 'count20', 'oneMore', 'sequence', 'add5'] as const)
      for (const s of seeds) {
        const q = makeNumberQuestion(k, seededRng(s), 0);
        for (const d of distractors(q.choices, q.answer)) expect(Math.abs(d - q.answer)).toBeGreaterThanOrEqual(2);
      }
  });
  it('level 1 distractors are within 1..3 of the answer', () => {
    for (const k of ['count10', 'count20', 'oneMore', 'sequence'] as const)
      for (const s of seeds) {
        const q = makeNumberQuestion(k, seededRng(s), 1);
        for (const d of distractors(q.choices, q.answer)) {
          expect(Math.abs(d - q.answer)).toBeGreaterThanOrEqual(1);
          expect(Math.abs(d - q.answer)).toBeLessThanOrEqual(3);
        }
      }
  });
  it('compare5: 1..5; level 0 difference >= 3, level 1 >= 1', () => {
    for (const lv of levels)
      for (const s of seeds) {
        const q = makeNumberQuestion('compare5', seededRng(s), lv);
        const [a, b] = q.groups;
        expect(q.kind).toBe('compare');
        expect(q.prompt).toBe('어느 쪽이 더 많아?');
        expect(q.groups).toHaveLength(2);
        for (const g of q.groups) {
          expect(g).toBeGreaterThanOrEqual(1);
          expect(g).toBeLessThanOrEqual(5);
        }
        expect(Math.abs(a - b)).toBeGreaterThanOrEqual(lv === 0 ? 3 : 1);
        expect(q.choices).toEqual([0, 1]);
        expect(q.answer).toBe(a > b ? 0 : 1);
      }
    const diffs = new Set(
      seeds.map((s) => {
        const [a, b] = makeNumberQuestion('compare5', seededRng(s), 1).groups;
        return Math.abs(a - b);
      }),
    );
    expect(diffs.has(1)).toBe(true);
  });
  it('oneMore: +1 for n in 1..9, -1 for n in 2..10', () => {
    const deltas = new Set<number>();
    for (const lv of levels)
      for (const s of seeds) {
        const q = makeNumberQuestion('oneMore', seededRng(s), lv);
        const [n, delta] = q.groups;
        expect(q.kind).toBe('oneMore');
        expect(q.groups).toHaveLength(2);
        expect([1, -1]).toContain(delta);
        deltas.add(delta);
        if (delta === 1) {
          expect(n).toBeGreaterThanOrEqual(1);
          expect(n).toBeLessThanOrEqual(9);
          expect(q.prompt).toBe('하나 더 오면 몇 개야?');
        } else {
          expect(n).toBeGreaterThanOrEqual(2);
          expect(n).toBeLessThanOrEqual(10);
          expect(q.prompt).toBe('하나 가져가면 몇 개야?');
        }
        expect(q.answer).toBe(n + delta);
        checkChoices(q.choices, q.answer, 10);
      }
    expect(deltas).toEqual(new Set([1, -1]));
  });
  it('sequence: three consecutive numbers in 1..10; level 0 blank last, level 1 blank middle', () => {
    for (const lv of levels)
      for (const s of seeds) {
        const q = makeNumberQuestion('sequence', seededRng(s), lv);
        expect(q.kind).toBe('sequence');
        const seq = q.sequence!;
        expect(seq).toHaveLength(3);
        expect(seq.filter((v) => v === null)).toHaveLength(1);
        const blank = lv === 0 ? 2 : 1;
        expect(seq[blank]).toBeNull();
        const start = seq[0] as number;
        expect(start).toBeGreaterThanOrEqual(1);
        expect(start + 2).toBeLessThanOrEqual(10);
        const full = [start, start + 1, start + 2];
        seq.forEach((v, i) => {
          if (v !== null) expect(v).toBe(full[i]);
        });
        expect(q.answer).toBe(full[blank]);
        checkChoices(q.choices, q.answer, 10);
      }
  });
  it('sequence prompt reads the numbers in native Korean', () => {
    for (const s of seeds) {
      const q0 = makeNumberQuestion('sequence', seededRng(s), 0);
      const [a, b] = q0.sequence as number[];
      expect(q0.prompt).toBe(`${koreanCount(a)}, ${koreanCount(b)}, 다음은 뭘까?`);
      const q1 = makeNumberQuestion('sequence', seededRng(s), 1);
      const [c, , e] = q1.sequence as number[];
      expect(q1.prompt).toBe(`${koreanCount(c)}, 다음은 뭘까?, ${koreanCount(e)}`);
    }
  });
  it('add5: sum <= 5, choices in 1..5', () => {
    for (const lv of levels)
      for (const s of seeds) {
        const q = makeNumberQuestion('add5', seededRng(s), lv);
        const [a, b] = q.groups;
        expect(q.kind).toBe('add');
        expect(q.prompt).toBe('모두 몇 개야?');
        expect(a).toBeGreaterThanOrEqual(1);
        expect(b).toBeGreaterThanOrEqual(1);
        expect(a + b).toBeLessThanOrEqual(5);
        expect(q.answer).toBe(a + b);
        checkChoices(q.choices, q.answer, 5);
      }
  });
  it('mix10: compare (1..10) or add (sum <= 10), both kinds appear', () => {
    const kinds = new Set<string>();
    for (const lv of levels)
      for (const s of seeds) {
        const q = makeNumberQuestion('mix10', seededRng(s), lv);
        kinds.add(q.kind);
        const [a, b] = q.groups;
        if (q.kind === 'compare') {
          for (const g of q.groups) {
            expect(g).toBeGreaterThanOrEqual(1);
            expect(g).toBeLessThanOrEqual(10);
          }
          expect(Math.abs(a - b)).toBeGreaterThanOrEqual(lv === 0 ? 3 : 1);
          expect(q.answer).toBe(a > b ? 0 : 1);
        } else {
          expect(q.kind).toBe('add');
          expect(a + b).toBeLessThanOrEqual(10);
          expect(q.answer).toBe(a + b);
          checkChoices(q.choices, q.answer, 10);
          if (lv === 0)
            for (const d of distractors(q.choices, q.answer)) expect(Math.abs(d - q.answer)).toBeGreaterThanOrEqual(2);
        }
      }
    expect(kinds).toEqual(new Set(['compare', 'add']));
  });
  it('is reproducible', () => {
    for (const k of ['count5', 'count10', 'compare5', 'oneMore', 'sequence', 'add5', 'mix10', 'count20'] as const)
      for (const lv of levels) {
        expect(makeNumberQuestion(k, seededRng(3), lv)).toEqual(makeNumberQuestion(k, seededRng(3), lv));
      }
  });
});
