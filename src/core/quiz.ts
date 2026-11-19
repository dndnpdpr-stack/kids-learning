import type { LearnItem } from '../content';
import { koreanCount } from './koreanNumber';
import type { Rng } from './rng';

export interface FindQuestion {
  target: LearnItem;
  choices: LearnItem[];
}

export interface NumberQuestion {
  kind: 'count' | 'compare' | 'add' | 'oneMore' | 'sequence';
  prompt: string;
  emoji: string;
  /** count: [n] · compare/add: [a, b] · oneMore: [n, delta(±1)] · sequence: [] */
  groups: number[];
  /** sequence only: 연속한 세 수, 빈칸 하나는 null. */
  sequence?: (number | null)[];
  choices: number[];
  answer: number;
}

export type NumberKind = 'count5' | 'count10' | 'compare5' | 'oneMore' | 'sequence' | 'add5' | 'mix10' | 'count20';

/** 0 = 쉬움 (먼 오답, 큰 차이), 1 = 보통. */
export type NumberLevel = 0 | 1;

const EMOJIS = ['🍎', '🍌', '🍓', '⭐', '🐟', '🚗', '🎈', '🐥'];

function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function pick<T>(items: T[], rng: Rng): T {
  return items[Math.floor(rng() * items.length)];
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

/**
 * 3 distinct choices in [1, max] including answer.
 * level 0: distractors at least 2 away (prefer 2~4 away). level 1: distractors 1~3 away.
 * If the range is too small for the preferred band, the closest remaining numbers fill in.
 */
function numberChoices(answer: number, max: number, level: NumberLevel, rng: Rng): number[] {
  const [near, far] = level === 0 ? [2, 4] : [1, 3];
  const inRange = (v: number) => v >= 1 && v <= max && v !== answer;
  const band: number[] = [];
  for (let d = near; d <= far; d++) for (const v of [answer - d, answer + d]) if (inRange(v)) band.push(v);
  const distractors = shuffle(band, rng).slice(0, 2);
  const rest = Array.from({ length: max }, (_, i) => i + 1)
    .filter((v) => inRange(v) && !distractors.includes(v))
    // 2 이상 떨어진 수를 먼저, 그다음 가까운 순서로 채운다.
    .sort((x, y) => {
      const dx = Math.abs(x - answer);
      const dy = Math.abs(y - answer);
      return Number(dx < near) - Number(dy < near) || dx - dy;
    });
  while (distractors.length < 2 && rest.length > 0) distractors.push(rest.shift()!);
  return shuffle([answer, ...distractors], rng);
}

function countQuestion(emoji: string, n: number, max: number, level: NumberLevel, rng: Rng): NumberQuestion {
  return { kind: 'count', prompt: '몇 개야?', emoji, groups: [n], choices: numberChoices(n, max, level, rng), answer: n };
}

/** 두 수 a≠b in [1, max]. level 0은 차이가 3 이상인 쌍만 (그런 쌍이 있을 때). */
function compareQuestion(emoji: string, max: number, level: NumberLevel, rng: Rng): NumberQuestion {
  const pairs = (minDiff: number) => {
    const out: [number, number][] = [];
    for (let a = 1; a <= max; a++) for (let b = 1; b <= max; b++) if (Math.abs(a - b) >= minDiff) out.push([a, b]);
    return out;
  };
  const wide = pairs(level === 0 ? 3 : 1);
  const [a, b] = pick(wide.length > 0 ? wide : pairs(1), rng);
  return { kind: 'compare', prompt: '어느 쪽이 더 많아?', emoji, groups: [a, b], choices: [0, 1], answer: a > b ? 0 : 1 };
}

function addQuestion(emoji: string, maxSum: number, level: NumberLevel, rng: Rng): NumberQuestion {
  const a = randInt(rng, 1, maxSum - 1);
  const b = randInt(rng, 1, maxSum - a);
  return {
    kind: 'add', prompt: '모두 몇 개야?', emoji, groups: [a, b],
    choices: numberChoices(a + b, maxSum, level, rng), answer: a + b,
  };
}

export function makeNumberQuestion(kind: NumberKind, rng: Rng, level: NumberLevel = 0): NumberQuestion {
  const emoji = pick(EMOJIS, rng);
  switch (kind) {
    case 'count5':
      return countQuestion(emoji, randInt(rng, 1, 5), 5, level, rng);
    case 'count10':
      return countQuestion(emoji, randInt(rng, 6, 10), 10, level, rng);
    case 'count20':
      return countQuestion(emoji, randInt(rng, 11, level === 0 ? 13 : 20), 20, level, rng);
    case 'compare5':
      return compareQuestion(emoji, 5, level, rng);
    case 'add5':
      return addQuestion(emoji, 5, level, rng);
    case 'mix10':
      return rng() < 0.5 ? compareQuestion(emoji, 10, level, rng) : addQuestion(emoji, 10, level, rng);
    case 'oneMore': {
      const delta = rng() < 0.5 ? 1 : -1;
      const n = delta === 1 ? randInt(rng, 1, 9) : randInt(rng, 2, 10);
      return {
        kind: 'oneMore',
        prompt: delta === 1 ? '하나 더 오면 몇 개야?' : '하나 가져가면 몇 개야?',
        emoji, groups: [n, delta], choices: numberChoices(n + delta, 10, level, rng), answer: n + delta,
      };
    }
    case 'sequence': {
      const start = randInt(rng, 1, 8);
      const full = [start, start + 1, start + 2];
      const blank = level === 0 ? 2 : 1;
      const sequence = full.map((v, i) => (i === blank ? null : v));
      const spoken = sequence.map((v) => (v === null ? '다음은 뭘까?' : koreanCount(v)));
      return {
        kind: 'sequence', prompt: spoken.join(', '), emoji, groups: [], sequence,
        choices: numberChoices(full[blank], 10, level, rng), answer: full[blank],
      };
    }
  }
}
