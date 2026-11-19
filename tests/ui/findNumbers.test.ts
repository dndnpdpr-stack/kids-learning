import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Progress } from '../../src/core/progress';
import { seededRng } from '../../src/core/rng';
import { defaultPets } from '../../src/pets/state';
import { CELEBRATE_SMALL_MS } from '../../src/ui/celebrate';
import type { ScreenDeps } from '../../src/ui/dom';
import { render as renderFind } from '../../src/ui/find';

/** speak mock that behaves like audio.ts: a new call resolves (cancels) the pending one. */
function cancelableSpeak() {
  const spoken: string[] = [];
  let pending: (() => void) | null = null;
  const speak = vi.fn((text: string) => {
    pending?.();
    spoken.push(text);
    return new Promise<void>((resolve) => {
      pending = resolve;
    });
  });
  const finish = () => {
    const p = pending;
    pending = null;
    p?.();
  };
  return { speak, spoken, finish };
}

function makeDeps(correct: Progress['correct'], speak: unknown, seed = 42): ScreenDeps {
  return {
    progress: { stars: 0, correct, volume: 0.5 },
    save: vi.fn(),
    speak: speak as ScreenDeps['speak'],
    rng: seededRng(seed),
    childName: null,
    announce: null,
    testMode: false,
    pets: defaultPets(),
    savePets: vi.fn(),
    saveName: vi.fn(),
  };
}

let root: HTMLElement;
let cleanup: (() => void) | undefined;

beforeEach(() => {
  vi.useFakeTimers();
  root = document.createElement('div');
  document.body.appendChild(root);
});

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  root.remove();
  vi.useRealTimers();
});

const blankIndex = () => [...root.querySelectorAll('.seq-card')].findIndex((c) => c.classList.contains('blank'));
const cards = () => [...root.querySelectorAll('.seq-card')].map((c) => c.textContent);

function sequenceAnswer(): number {
  const vals = cards();
  const i = vals.indexOf('?');
  const known = vals.map((v, j) => (v === '?' ? null : Number(v) - j)).find((v) => v !== null)!;
  return known + i;
}

function clickChoice(value: number) {
  root.querySelector<HTMLButtonElement>(`[data-choice="${value}"]`)!.click();
}

describe('find: number level', () => {
  it('uses level 0 (blank last) below 3 correct and level 1 (blank middle) from 3', () => {
    const m = cancelableSpeak();
    cleanup = renderFind(root, { name: 'find', world: 'numbers', group: 'sequence' }, makeDeps({}, m.speak));
    expect(blankIndex()).toBe(2);
    cleanup();
    root.replaceChildren();
    cleanup = renderFind(
      root, { name: 'find', world: 'numbers', group: 'sequence' }, makeDeps({ 'numbers/sequence': 3 }, m.speak),
    );
    expect(blankIndex()).toBe(1);
  });

  it('recomputes the level at each new question within a round', async () => {
    const m = cancelableSpeak();
    const deps = makeDeps({ 'numbers/sequence': 2 }, m.speak);
    cleanup = renderFind(root, { name: 'find', world: 'numbers', group: 'sequence' }, deps);
    expect(blankIndex()).toBe(2);
    clickChoice(sequenceAnswer());
    expect(deps.progress.correct['numbers/sequence']).toBe(3);
    await vi.advanceTimersByTimeAsync(CELEBRATE_SMALL_MS);
    expect(blankIndex()).toBe(1);
  });

  it('speaks the sequence prompt in native Korean', () => {
    const m = cancelableSpeak();
    cleanup = renderFind(root, { name: 'find', world: 'numbers', group: 'sequence' }, makeDeps({}, m.speak));
    expect(m.spoken[0]).toMatch(/^[가-힣]+, [가-힣]+, 다음은 뭘까\?$/);
  });
});

describe('find: count20', () => {
  const count = () => root.querySelectorAll('.frame-cell.filled').length;

  it('after a correct answer says 맞았어! then splits into ten and the rest, without being cut off', async () => {
    const m = cancelableSpeak();
    cleanup = renderFind(root, { name: 'find', world: 'numbers', group: 'count20' }, makeDeps({}, m.speak));
    const n = count();
    expect(n).toBeGreaterThanOrEqual(11);
    expect(n).toBeLessThanOrEqual(13);
    expect(m.spoken).toEqual(['몇 개야?']);
    clickChoice(n);
    expect(m.spoken.slice(1)).toEqual(['맞았어!']);
    m.finish();
    await vi.advanceTimersByTimeAsync(0);
    const ones = ['하나', '둘', '셋'][n - 11];
    expect(m.spoken.slice(1)).toEqual(['맞았어!', `열${ones}! 열하고 ${ones}!`]);
    // celebrate time passes while the split line is still playing: the next question waits for it.
    await vi.advanceTimersByTimeAsync(CELEBRATE_SMALL_MS);
    expect(m.spoken).toHaveLength(3);
    m.finish();
    await vi.advanceTimersByTimeAsync(0);
    expect(m.spoken.slice(3)).toEqual(['몇 개야?']);
  });

  it('still waits for the celebrate time when speech ends early', async () => {
    const m = cancelableSpeak();
    cleanup = renderFind(root, { name: 'find', world: 'numbers', group: 'count20' }, makeDeps({}, m.speak));
    clickChoice(count());
    m.finish();
    await vi.advanceTimersByTimeAsync(0);
    m.finish();
    await vi.advanceTimersByTimeAsync(CELEBRATE_SMALL_MS - 1);
    expect(m.spoken).toHaveLength(3);
    await vi.advanceTimersByTimeAsync(1);
    expect(m.spoken[3]).toBe('몇 개야?');
  });

  it('other number groups just say 맞았어!', async () => {
    const m = cancelableSpeak();
    cleanup = renderFind(root, { name: 'find', world: 'numbers', group: 'count10' }, makeDeps({}, m.speak));
    clickChoice(count());
    m.finish();
    await vi.advanceTimersByTimeAsync(CELEBRATE_SMALL_MS);
    expect(m.spoken).toEqual(['몇 개야?', '맞았어!', '몇 개야?']);
  });
});

describe('find: mix10', () => {
  it('alternates between compare and add questions', async () => {
    for (const seed of [1, 2, 3, 42]) {
      const m = cancelableSpeak();
      cleanup = renderFind(root, { name: 'find', world: 'numbers', group: 'mix10' }, makeDeps({}, m.speak, seed));
      const kinds: string[] = [];
      for (let i = 0; i < 4; i++) {
        const q = root.querySelector('.number-question')!;
        const isCompare = q.classList.contains('compare');
        kinds.push(isCompare ? 'compare' : 'add');
        if (isCompare) {
          const sides = [...root.querySelectorAll('.compare-btn')].map((b) => b.querySelectorAll('.filled').length);
          root.querySelectorAll<HTMLButtonElement>('.compare-btn')[sides[0] > sides[1] ? 0 : 1].click();
        } else {
          clickChoice(root.querySelectorAll('.picture .filled').length);
        }
        await vi.advanceTimersByTimeAsync(CELEBRATE_SMALL_MS);
      }
      for (let i = 1; i < kinds.length; i++) expect(kinds[i]).not.toBe(kinds[i - 1]);
      cleanup();
      cleanup = undefined;
      root.replaceChildren();
    }
  });
});
