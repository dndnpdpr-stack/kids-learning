import type { Rng } from '../core/rng';
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

/** 공원 숨바꼭질의 숨을 곳 (순서 = 화면에 놓는 순서). ask는 누르면 읽어 주는 위치 말. */
export type ParkSpotId = 'tree' | 'slide' | 'bench' | 'bush' | 'flowers';

export const PARK_SPOTS: readonly { id: ParkSpotId; name: string; ask: string }[] = [
  { id: 'tree', name: '큰 나무', ask: '나무 뒤일까?' },
  { id: 'slide', name: '미끄럼틀', ask: '미끄럼틀 뒤일까?' },
  { id: 'bench', name: '벤치', ask: '벤치 밑일까?' },
  { id: 'bush', name: '덤불', ask: '덤불 속일까?' },
  { id: 'flowers', name: '꽃밭', ask: '꽃밭 속일까?' },
];

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
