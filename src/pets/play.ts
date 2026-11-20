import { getWorld } from '../content';
import type { Progress } from '../core/progress';
import type { Rng } from '../core/rng';
import { quizSources } from './careQuiz';
import type { Friend, FriendKind } from './state';

/**
 * 같이 놀기(공 던지기·숨바꼭질) 규칙.
 * docs/superpowers/specs/2026-11-20-play-together-design.md
 */

/** 나무는 걷지 못하고, 병아리 알(0단계)은 아직 움직이지 못한다. */
export function canFetch(f: Friend): boolean {
  if (f.kind === 'tree') return false;
  if (f.kind === 'chick' && f.stage === 0) return false;
  return true;
}

const TOYS: Record<FriendKind, string> = { dog: '⚽', cat: '🧶', chick: '🐛', tree: '🦋' };

export function toyFor(kind: FriendKind): string {
  return TOYS[kind];
}

export interface HideSpot {
  emoji: string;
  name: string;
}

const FALLBACK_SPOTS: HideSpot[] = [
  { emoji: '🌳', name: '나무' },
  { emoji: '🏠', name: '집' },
  { emoji: '🚗', name: '자동차' },
  { emoji: '📦', name: '상자' },
  { emoji: '🌷', name: '꽃' },
];

function shuffle<T>(items: T[], rng: Rng): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 숨을 곳 n개: 아이가 배운 한글 낱말 그림에서, 모자라면 기본 물건으로 채운다. 이름은 겹치지 않는다. */
export function hideSpots(p: Progress, rng: Rng, n = 3): HideSpot[] {
  const hangul = getWorld('hangul');
  const learned = quizSources(p)
    .filter((s) => s.world === 'hangul')
    .flatMap((s) => hangul.groups.find((g) => g.id === s.group)?.items ?? [])
    .map((i) => ({ emoji: i.emoji, name: i.word }));
  const unique = [...new Map(learned.map((s) => [s.name, s])).values()];
  const out = shuffle(unique, rng).slice(0, n);
  for (const f of shuffle(FALLBACK_SPOTS, rng)) {
    if (out.length >= n) break;
    if (!out.some((s) => s.name === f.name)) out.push(f);
  }
  return out;
}

/** 다음에 숨을 곳 (직전 자리는 피한다). */
export function nextHide(rng: Rng, n: number, last: number | null): number {
  const options = Array.from({ length: n }, (_, i) => i).filter((i) => i !== last);
  return options[Math.floor(rng() * options.length)];
}

export interface Pt {
  x: number;
  y: number;
}

/** 떨어질 곳을 놀이 공간 [pad, w-pad] × [pad, h-pad] 안으로 맞춘다. */
export function throwTarget(_from: Pt, to: Pt, field: { w: number; h: number }, pad: number): Pt {
  const clamp = (v: number, max: number) => Math.min(Math.max(v, pad), Math.max(pad, max - pad));
  return { x: clamp(to.x, field.w), y: clamp(to.y, field.h) };
}

/** 공을 끈 방향과 길이에 비례한 곳 (맞추기는 throwTarget이 한다). */
export function dragTarget(ball: Pt, start: Pt, end: Pt, scale: number): Pt {
  return { x: ball.x + (end.x - start.x) * scale, y: ball.y + (end.y - start.y) * scale };
}
