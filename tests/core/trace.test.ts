import { describe, expect, it } from 'vitest';
import { advanceTrace, endStroke, getStrokes, newTrace, TRACE_TOLERANCE } from '../../src/core/trace';
import type { Stroke } from '../../src/core/trace';

const strokes: Stroke[] = [
  { points: [{ x: 0.2, y: 0.2 }, { x: 0.5, y: 0.2 }, { x: 0.8, y: 0.2 }] },
  { points: [{ x: 0.8, y: 0.5 }, { x: 0.8, y: 0.8 }] },
];

const CONSONANTS = 'ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ';
const VOWELS = 'ㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣ';
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
const supported = [...CONSONANTS, ...VOWELS, ...LETTERS, ...DIGITS];

describe('trace judge', () => {
  it('completes when checkpoints are passed in order', () => {
    let s = newTrace();
    for (const st of strokes) for (const p of st.points) s = advanceTrace(s, strokes, p);
    expect(s.done).toBe(true);
  });

  it('moves to the next stroke at pointIndex 0 after finishing a stroke', () => {
    let s = newTrace();
    for (const p of strokes[0].points) s = advanceTrace(s, strokes, p);
    expect(s).toEqual({ strokeIndex: 1, pointIndex: 0, done: false });
  });

  it('ignores skipped-ahead points', () => {
    const s = advanceTrace(newTrace(), strokes, strokes[0].points[2]);
    expect(s).toEqual(newTrace());
  });

  it('ignores points outside tolerance', () => {
    const p = { x: 0.2 + TRACE_TOLERANCE + 0.01, y: 0.2 };
    expect(advanceTrace(newTrace(), strokes, p)).toEqual(newTrace());
  });

  it('accepts a point within tolerance and advances only one checkpoint', () => {
    const s = advanceTrace(newTrace(), strokes, { x: 0.25, y: 0.25 });
    expect(s.pointIndex).toBe(1);
  });

  it('endStroke mid-stroke restarts that stroke; finished strokes are kept', () => {
    let s = newTrace();
    for (const p of strokes[0].points) s = advanceTrace(s, strokes, p);
    s = advanceTrace(s, strokes, strokes[1].points[0]);
    expect(s).toEqual({ strokeIndex: 1, pointIndex: 1, done: false });
    s = endStroke(s, strokes);
    expect(s).toEqual({ strokeIndex: 1, pointIndex: 0, done: false });
  });

  it('endStroke at pointIndex 0 is a no-op', () => {
    const s = newTrace();
    expect(endStroke(s, strokes)).toEqual(s);
  });

  it('does not change state after done', () => {
    let s = newTrace();
    for (const st of strokes) for (const p of st.points) s = advanceTrace(s, strokes, p);
    expect(advanceTrace(s, strokes, strokes[0].points[0])).toEqual(s);
    expect(endStroke(s, strokes)).toEqual(s);
  });

  it('is pure', () => {
    const s0 = newTrace();
    const s1 = advanceTrace(s0, strokes, strokes[0].points[0]);
    expect(s0).toEqual(newTrace());
    expect(s1).not.toBe(s0);
  });
});

describe('getStrokes', () => {
  it('has the expected supported count', () => {
    expect(supported).toHaveLength(14 + 10 + 26 + 10);
  });

  it.each(supported)('%s has valid strokes', (g) => {
    const strokes = getStrokes(g);
    expect(strokes.length).toBeGreaterThanOrEqual(1);
    for (const st of strokes) {
      expect(st.points.length).toBeGreaterThanOrEqual(3);
      expect(st.points.length).toBeLessThanOrEqual(8);
      for (const p of st.points) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(1);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(1);
      }
      for (let i = 1; i < st.points.length; i++) {
        const d = Math.hypot(st.points[i].x - st.points[i - 1].x, st.points[i].y - st.points[i - 1].y);
        expect(d).toBeGreaterThanOrEqual(0.1);
      }
    }
  });

  it('returns [] for unsupported glyphs', () => {
    expect(getStrokes('가')).toEqual([]);
    expect(getStrokes('a')).toEqual([]);
    expect(getStrokes('')).toEqual([]);
  });

  it('every glyph can be completed by tracing its own checkpoints', () => {
    for (const g of supported) {
      const st = getStrokes(g);
      let s = newTrace();
      for (const stroke of st) for (const p of stroke.points) s = advanceTrace(s, st, p);
      expect(s.done).toBe(true);
    }
  });
});
