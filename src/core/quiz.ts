import type { LearnItem } from '../content';
import type { Rng } from './rng';

export interface FindQuestion {
  target: LearnItem;
  choices: LearnItem[];
}

export interface NumberQuestion {
  kind: 'count' | 'compare' | 'add';
  prompt: string;
  emoji: string;
  groups: number[];
  choices: number[];
  answer: number;
}

const EMOJIS = ['🍎', '🍌', '🍓', '⭐', '🐟', '🚗', '🎈', '🐥'];

function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function shuffle<T>(items: T[], rng: Rng): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function makeFindQuestion(pool: LearnItem[], rng: Rng, choiceCount: 2 | 3 = 3): FindQuestion {
  if (pool.length === 0) throw new Error('makeFindQuestion: pool is empty');
  const unique = [...new Map(pool.map((i) => [i.id, i])).values()];
  const count = Math.min(choiceCount, unique.length);
  const picked = shuffle(unique, rng).slice(0, count);
  const target = picked[Math.floor(rng() * picked.length)];
  return { target, choices: shuffle(picked, rng) };
}

/** 3 distinct choices in [1, max] including answer, distractors near the answer. */
function numberChoices(answer: number, max: number, rng: Rng): number[] {
  const near: number[] = [];
  for (let d = 1; d <= 3; d++) {
    for (const v of [answer - d, answer + d]) if (v >= 1 && v <= max) near.push(v);
  }
  const distractors = shuffle(near, rng).slice(0, 2);
  for (let v = 1; distractors.length < 2 && v <= max; v++) {
    if (v !== answer && !distractors.includes(v)) distractors.push(v);
  }
  return shuffle([answer, ...distractors], rng);
}

export function makeNumberQuestion(
  kind: 'count10' | 'count20' | 'compare' | 'add',
  rng: Rng,
): NumberQuestion {
  const emoji = EMOJIS[Math.floor(rng() * EMOJIS.length)];
  switch (kind) {
    case 'count10':
    case 'count20': {
      const [min, max] = kind === 'count10' ? [1, 10] : [11, 20];
      const n = randInt(rng, min, max);
      return {
        kind: 'count', prompt: '몇 개야?', emoji, groups: [n],
        choices: numberChoices(n, max, rng), answer: n,
      };
    }
    case 'compare': {
      const a = randInt(rng, 1, 10);
      let b = randInt(rng, 1, 9);
      if (b >= a) b += 1;
      return {
        kind: 'compare', prompt: '어느 쪽이 더 많아?', emoji, groups: [a, b],
        choices: [0, 1], answer: a > b ? 0 : 1,
      };
    }
    case 'add': {
      const a = randInt(rng, 1, 9);
      const b = randInt(rng, 1, 10 - a);
      return {
        kind: 'add', prompt: '모두 몇 개야?', emoji, groups: [a, b],
        choices: numberChoices(a + b, 10, rng), answer: a + b,
      };
    }
  }
}
