import type { LearnItem, WorldId } from '../content';
import { advanceTrace, endStroke, getStrokes, newTrace, type Pt, type Stroke, type TraceState } from '../core/trace';
import { go, type Route } from '../router';
import { CELEBRATE_BIG_MS, celebrate } from './celebrate';
import { el, say, timers, topBar, type Cleanup, type ScreenDeps } from './dom';
import { findGroup, traceItems } from './groupItems';

const NEXT_ITEM_MS = 1600;
const FONT = "'Jua', system-ui, sans-serif";
const COLORS = { glyph: '#ececf4', guide: '#d5d9ea', ink: '#ff8fab', dot: '#c3c8dc', next: '#ffb703' };

export function render(root: HTMLElement, route: Route, deps: ScreenDeps): Cleanup {
  if (route.name !== 'trace') return () => {};
  const world: WorldId = route.world;
  const group = findGroup(world, route.group);
  const items = group ? traceItems(group) : [];

  const t = timers();
  const celebrations: (() => void)[] = [];
  const canvas = el('canvas', 'trace-canvas');
  const area = el('div', 'trace-area', [canvas]);
  const screen = el('section', `screen trace world-${world}`, [topBar(world), area]);
  root.append(screen);
  if (items.length === 0) return () => {};

  const ctx = canvas.getContext('2d');
  let index = 0;
  let item: LearnItem = items[0];
  let strokes: Stroke[] = [];
  let state: TraceState = newTrace();
  let activePointer: number | null = null;
  let finger: Pt | null = null;
  let side = 1;
  let frame = 0;

  function load(i: number) {
    index = i;
    item = items[i];
    strokes = getStrokes(item.glyph);
    state = newTrace();
    activePointer = null;
    finger = null;
    void say(deps, item.name, item.lang);
  }

  function resize() {
    const r = area.getBoundingClientRect();
    side = Math.max(1, Math.floor(Math.min(r.width, r.height)));
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = canvas.style.height = `${side}px`;
    canvas.width = Math.round(side * dpr);
    canvas.height = Math.round(side * dpr);
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function polyline(c: CanvasRenderingContext2D, pts: Pt[]) {
    if (pts.length < 2) return;
    c.beginPath();
    c.moveTo(pts[0].x * side, pts[0].y * side);
    for (const p of pts.slice(1)) c.lineTo(p.x * side, p.y * side);
    c.stroke();
  }

  function dot(c: CanvasRenderingContext2D, p: Pt, radius: number, color: string) {
    c.fillStyle = color;
    c.beginPath();
    c.arc(p.x * side, p.y * side, radius, 0, Math.PI * 2);
    c.fill();
  }

  function draw(now: number) {
    if (!ctx) return;
    const c = ctx;
    c.clearRect(0, 0, side, side);
    c.lineCap = 'round';
    c.lineJoin = 'round';

    c.fillStyle = COLORS.glyph;
    c.font = `${Math.round(side * 0.8)}px ${FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(item.glyph, side / 2, side / 2);

    c.strokeStyle = COLORS.guide;
    c.lineWidth = side * 0.02;
    c.setLineDash([side * 0.03, side * 0.03]);
    strokes.forEach((s) => polyline(c, s.points));
    c.setLineDash([]);

    c.strokeStyle = COLORS.ink;
    c.lineWidth = side * 0.06;
    strokes.slice(0, state.strokeIndex).forEach((s) => polyline(c, s.points));
    const cur = strokes[state.strokeIndex];
    if (cur && !state.done) {
      const reached = cur.points.slice(0, state.pointIndex);
      polyline(c, finger && reached.length > 0 ? [...reached, finger] : reached);

      cur.points.slice(state.pointIndex + 1).forEach((p) => dot(c, p, side * 0.015, COLORS.dot));
      const next = cur.points[state.pointIndex];
      const pulse = 1 + 0.3 * Math.sin(now / 180);
      dot(c, next, side * 0.035 * pulse, COLORS.next);
    }
  }

  function loop(now: number) {
    draw(now);
    frame = requestAnimationFrame(loop);
  }

  function toPt(e: PointerEvent): Pt {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / (r.width || 1), y: (e.clientY - r.top) / (r.height || 1) };
  }

  function feed(e: PointerEvent) {
    const samples = e.getCoalescedEvents?.() ?? [];
    for (const s of samples.length > 0 ? samples : [e]) {
      if (state.done) break;
      finger = toPt(s);
      state = advanceTrace(state, strokes, finger);
    }
    if (state.done) complete();
  }

  function complete() {
    activePointer = null;
    finger = null;
    const last = index + 1 >= items.length;
    celebrations.push(celebrate(screen, last ? { big: true, mascot: '✏️' } : {}));
    void say(deps, item.name, item.lang);
    t.after(last ? CELEBRATE_BIG_MS : NEXT_ITEM_MS, () => {
      if (last) go({ name: 'world', world });
      else load(index + 1);
    });
  }

  const onDown = (e: PointerEvent) => {
    if (state.done || activePointer !== null) return;
    activePointer = e.pointerId;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    feed(e);
  };
  const onMove = (e: PointerEvent) => {
    if (e.pointerId !== activePointer) return;
    feed(e);
  };
  const onUp = (e: PointerEvent) => {
    if (e.pointerId !== activePointer) return;
    activePointer = null;
    finger = null;
    state = endStroke(state, strokes);
  };
  const onResize = () => {
    if (!state.done) state = newTrace();
    activePointer = null;
    finger = null;
    resize();
  };

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  window.addEventListener('resize', onResize);

  load(0);
  resize();
  void document.fonts?.load(`64px ${FONT}`, item.glyph).catch(() => {});
  frame = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener('resize', onResize);
    t.clear();
    celebrations.forEach((stop) => stop());
  };
}
