import { STROKES } from './strokes';

export type Pt = { x: number; y: number }; // 0~1 정규화 좌표 (왼쪽 위 원점, y 아래로)
export interface Stroke {
  points: Pt[]; // 체크포인트
}
export interface TraceState {
  strokeIndex: number;
  pointIndex: number;
  done: boolean;
}

export const TRACE_TOLERANCE = 0.12;

export function newTrace(): TraceState {
  return { strokeIndex: 0, pointIndex: 0, done: false };
}

/** 다음 체크포인트와의 거리가 허용 범위 안이면 한 칸만 전진한다. */
export function advanceTrace(s: TraceState, strokes: Stroke[], p: Pt): TraceState {
  if (s.done) return s;
  const target = strokes[s.strokeIndex]?.points[s.pointIndex];
  if (!target) return s;
  if (Math.hypot(p.x - target.x, p.y - target.y) > TRACE_TOLERANCE) return s;
  const pointIndex = s.pointIndex + 1;
  if (pointIndex < strokes[s.strokeIndex].points.length) return { ...s, pointIndex };
  const strokeIndex = s.strokeIndex + 1;
  return { strokeIndex, pointIndex: 0, done: strokeIndex >= strokes.length };
}

/** 획 중간에 손을 떼면 그 획을 처음부터 다시. 끝낸 획은 유지한다. */
export function endStroke(s: TraceState, _strokes: Stroke[]): TraceState {
  if (s.done || s.pointIndex === 0) return s;
  return { ...s, pointIndex: 0 };
}

export function getStrokes(glyph: string): Stroke[] {
  return Object.prototype.hasOwnProperty.call(STROKES, glyph) ? STROKES[glyph] : [];
}
