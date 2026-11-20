import { getWorld, type WorldId } from '../content';
import { isGroupUnlocked, type Progress } from '../core/progress';
import { makeFindQuestion, makeNumberQuestion, type FindQuestion, type NumberKind, type NumberQuestion } from '../core/quiz';
import type { Rng } from '../core/rng';

/**
 * 별이 없을 때 돌봐주기 대신 내는 퀴즈.
 * docs/superpowers/specs/2026-11-20-care-quiz-design.md
 */
export interface QuizSource {
  world: WorldId;
  group: string;
}

export type CareQuiz =
  | { type: 'letter'; world: WorldId; q: FindQuestion }
  | { type: 'number'; world: 'numbers'; q: NumberQuestion };

const WORLDS: WorldId[] = ['hangul', 'numbers', 'abc'];
/** 아무것도 안 해 봤을 때: 아이가 조금 아는 1~5 세기. */
const FALLBACK: QuizSource = { world: 'numbers', group: 'count5' };

/** 열려 있고 한 번이라도 맞힌 묶음 (= 아이가 배운 것). */
export function quizSources(p: Progress): QuizSource[] {
  const out: QuizSource[] = [];
  for (const id of WORLDS) {
    const world = getWorld(id);
    world.groups.forEach((g, i) => {
      if ((p.correct[`${id}/${g.id}`] ?? 0) >= 1 && isGroupUnlocked(p, world, i)) out.push({ world: id, group: g.id });
    });
  }
  return out.length > 0 ? out : [FALLBACK];
}

const pick = <T>(items: T[], rng: Rng): T => items[Math.floor(rng() * items.length)];

/** 배운 묶음에서 한 문제. 가능하면 직전(lastWorld)과 다른 세계에서 고른다. */
export function makeCareQuiz(p: Progress, rng: Rng, lastWorld: WorldId | null): CareQuiz {
  const sources = quizSources(p);
  const worlds = [...new Set(sources.map((s) => s.world))];
  const others = worlds.filter((w) => w !== lastWorld);
  const world = pick(others.length > 0 ? others : worlds, rng);
  const src = pick(sources.filter((s) => s.world === world), rng);
  if (world === 'numbers') {
    return { type: 'number', world, q: makeNumberQuestion(src.group as NumberKind, rng, 0) };
  }
  const group = getWorld(world).groups.find((g) => g.id === src.group)!;
  return { type: 'letter', world, q: makeFindQuestion(group.items, rng, 3) };
}
