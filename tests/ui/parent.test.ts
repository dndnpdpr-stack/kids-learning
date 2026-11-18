import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Progress } from '../../src/core/progress';
import { seededRng } from '../../src/core/rng';
import type { ScreenDeps } from '../../src/ui/dom';
import { render as renderHome } from '../../src/ui/home';
import { attachLongPress } from '../../src/ui/longPress';
import { render as renderParent } from '../../src/ui/parent';

function ptr(node: Element, type: string, id = 1) {
  const e = new Event(type, { bubbles: true, cancelable: true }) as Event & { pointerId: number };
  e.pointerId = id;
  node.dispatchEvent(e);
  return e;
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('attachLongPress', () => {
  it('fires once after ms', () => {
    const b = document.createElement('button');
    const done = vi.fn();
    attachLongPress(b, 3000, done);
    ptr(b, 'pointerdown');
    expect(b.classList.contains('pressing')).toBe(true);
    vi.advanceTimersByTime(3000);
    expect(done).toHaveBeenCalledTimes(1);
    expect(b.classList.contains('pressing')).toBe(false);
  });

  it.each(['pointerup', 'pointerleave', 'pointercancel'])('cancels on %s', (type) => {
    const b = document.createElement('button');
    const done = vi.fn();
    attachLongPress(b, 3000, done);
    ptr(b, 'pointerdown');
    vi.advanceTimersByTime(2999);
    ptr(b, type);
    vi.advanceTimersByTime(5000);
    expect(done).not.toHaveBeenCalled();
    expect(b.classList.contains('pressing')).toBe(false);
  });

  it('contextmenu is suppressed but does not cancel the hold', () => {
    const b = document.createElement('button');
    const done = vi.fn();
    attachLongPress(b, 3000, done);
    ptr(b, 'pointerdown');
    vi.advanceTimersByTime(500);
    const e = ptr(b, 'contextmenu');
    expect(e.defaultPrevented).toBe(true);
    vi.advanceTimersByTime(2499);
    expect(done).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('pointermove outside the rect cancels, inside does not', () => {
    const b = document.createElement('button');
    b.getBoundingClientRect = () => ({ left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100, x: 0, y: 0, toJSON: () => ({}) });
    const done = vi.fn();
    const detach = attachLongPress(b, 3000, done);
    const mv = (x: number, y: number) => {
      const e = new Event('pointermove', { bubbles: true }) as Event & { pointerId: number; clientX: number; clientY: number };
      e.pointerId = 1;
      e.clientX = x;
      e.clientY = y;
      b.dispatchEvent(e);
    };
    ptr(b, 'pointerdown');
    mv(50, 50);
    expect(b.classList.contains('pressing')).toBe(true);
    mv(150, 50);
    expect(b.classList.contains('pressing')).toBe(false);
    vi.advanceTimersByTime(5000);
    expect(done).not.toHaveBeenCalled();
    detach();
  });

  it('releases pointer capture on down', () => {
    const b = document.createElement('button');
    const rel = vi.fn();
    b.releasePointerCapture = rel;
    attachLongPress(b, 3000, vi.fn());
    ptr(b, 'pointerdown', 7);
    expect(rel).toHaveBeenCalledWith(7);
  });

  it('ignores a second pointer and detach stops it', () => {
    const b = document.createElement('button');
    const done = vi.fn();
    const detach = attachLongPress(b, 1000, done);
    ptr(b, 'pointerdown', 1);
    ptr(b, 'pointerup', 2);
    vi.advanceTimersByTime(1000);
    expect(done).toHaveBeenCalledTimes(1);
    ptr(b, 'pointerdown', 1);
    detach();
    vi.advanceTimersByTime(2000);
    expect(done).toHaveBeenCalledTimes(1);
  });
});

function makeDeps(p?: Partial<Progress>): ScreenDeps {
  return {
    progress: { stars: 5, correct: { 'hangul/c1': 3 }, volume: 0.5, ...p },
    save: vi.fn(),
    speak: vi.fn(() => Promise.resolve()),
    rng: seededRng(1),
    childName: null,
    announce: null,
    saveName: vi.fn(),
  };
}

describe('home parent button', () => {
  it('goes to #/parent after a 3s hold', () => {
    const root = document.createElement('div');
    document.body.append(root);
    const cleanup = renderHome(root, { name: 'home' }, makeDeps());
    const btn = root.querySelector('[data-testid="parent-btn"]')!;
    ptr(btn, 'pointerdown');
    vi.advanceTimersByTime(3000);
    expect(location.hash).toBe('#/parent');
    cleanup();
    root.remove();
  });
});

describe('parent screen', () => {
  let root: HTMLElement;
  beforeEach(() => {
    root = document.createElement('div');
    document.body.append(root);
  });
  afterEach(() => root.remove());

  it('shows unlocked group counts and stars', () => {
    renderParent(root, { name: 'parent' }, makeDeps());
    expect(root.textContent).toMatch(/열린 묶음 2 \/ 전체/);
    expect(root.textContent).toContain('⭐ 5');
  });

  it('volume change saves and speaks 안녕!', () => {
    const deps = makeDeps();
    renderParent(root, { name: 'parent' }, deps);
    const s = root.querySelector<HTMLInputElement>('[data-testid="volume"]')!;
    s.value = '0.8';
    s.dispatchEvent(new Event('change'));
    expect(deps.progress.volume).toBe(0.8);
    expect(deps.save).toHaveBeenCalledWith(expect.objectContaining({ volume: 0.8 }));
    expect(deps.speak).toHaveBeenCalledWith('안녕!', expect.objectContaining({ volume: 0.8 }));
  });

  it('one tap keeps progress, second tap resets but keeps volume', () => {
    const deps = makeDeps();
    renderParent(root, { name: 'parent' }, deps);
    const b = root.querySelector<HTMLButtonElement>('[data-testid="reset-btn"]')!;
    b.click();
    expect(b.textContent).toBe('한 번 더 누르면 초기화돼요');
    expect(deps.progress.stars).toBe(5);
    b.click();
    expect(deps.progress).toEqual({ stars: 0, correct: {}, volume: 0.5 });
    expect(deps.save).toHaveBeenCalled();
    expect(b.textContent).toBe('진도 초기화');
    expect(root.textContent).toContain('⭐ 0');
  });

  it('confirmation expires after 3s', () => {
    const deps = makeDeps();
    renderParent(root, { name: 'parent' }, deps);
    const b = root.querySelector<HTMLButtonElement>('[data-testid="reset-btn"]')!;
    b.click();
    vi.advanceTimersByTime(3000);
    expect(b.textContent).toBe('진도 초기화');
    b.click();
    expect(deps.progress.stars).toBe(5);
  });
});
