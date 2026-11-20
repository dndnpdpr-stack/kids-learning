import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Progress } from '../../src/core/progress';
import { seededRng } from '../../src/core/rng';
import { defaultPets, type Friend, type PetsState } from '../../src/pets/state';
import { parseRoute, toHash } from '../../src/router';
import type { ScreenDeps } from '../../src/ui/dom';
import { render as renderFriend } from '../../src/ui/friend';
import { BACK_MS, FLY_MS, RUN_MS, render as renderBall } from '../../src/ui/friendBall';
import { render as renderPlay } from '../../src/ui/friendPlay';

function makeDeps(current: Friend | null, stars = 0, progress: Partial<Progress> = {}): ScreenDeps {
  const pets: PetsState = { ...defaultPets(), current };
  return {
    progress: { stars, correct: {}, volume: 0.5, ...progress },
    save: vi.fn(),
    speak: vi.fn(() => Promise.resolve()),
    rng: seededRng(7),
    childName: '하늘',
    announce: null,
    testMode: false,
    saveName: vi.fn(),
    pets,
    savePets: vi.fn(),
  };
}

const spoken = (deps: ScreenDeps) => (deps.speak as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]);
const q = <T extends Element = HTMLElement>(sel: string) => root.querySelector<T & HTMLElement>(sel)!;
const tap = (sel: string) => q<HTMLButtonElement>(sel).click();
const dog = (stage: 0 | 1 | 2 | 3 = 1): Friend => ({ kind: 'dog', stage, care: 0 });

let root: HTMLElement;
let cleanup: (() => void) | undefined;

beforeEach(() => {
  vi.useFakeTimers();
  root = document.createElement('div');
  document.body.appendChild(root);
  location.hash = '';
});

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  root.remove();
  location.hash = '';
  vi.useRealTimers();
});

describe('play routes', () => {
  it('parses and builds the play hashes', () => {
    expect(parseRoute('#/friend/play')).toEqual({ name: 'friendPlay' });
    expect(parseRoute('#/friend/play/ball')).toEqual({ name: 'friendBall' });
    expect(parseRoute('#/friend/play/hide')).toEqual({ name: 'friendHide' });
    expect(parseRoute('#/friend/play/x')).toEqual({ name: 'home' });
    expect(toHash({ name: 'friendPlay' })).toBe('#/friend/play');
    expect(toHash({ name: 'friendBall' })).toBe('#/friend/play/ball');
    expect(toHash({ name: 'friendHide' })).toBe('#/friend/play/hide');
  });
});

describe('같이 놀기 button', () => {
  it('is free and opens the picker', () => {
    const deps = makeDeps(dog());
    cleanup = renderFriend(root, { name: 'friend' }, deps);
    const b = q('[data-free="play-together"]');
    expect(b.querySelector('.star-cost')).toBeNull();
    b.click();
    expect(location.hash).toBe('#/friend/play');
  });

  it('is ignored while another action is playing', () => {
    const deps = makeDeps(dog(), 5);
    cleanup = renderFriend(root, { name: 'friend' }, deps);
    tap('[data-care="eat"]');
    tap('[data-free="play-together"]');
    expect(location.hash).toBe('');
  });
});

describe('game picker', () => {
  it('offers both games to a walking friend', () => {
    const deps = makeDeps(dog());
    cleanup = renderPlay(root, { name: 'friendPlay' }, deps);
    expect(q('[data-testid="play-hide"]')).not.toBeNull();
    tap('[data-testid="play-ball"]');
    expect(location.hash).toBe('#/friend/play/ball');
    expect(spoken(deps)).toContain('뭐 하고 놀까?');
  });

  it('goes straight to hide-and-seek for a tree or an egg', () => {
    cleanup = renderPlay(root, { name: 'friendPlay' }, makeDeps({ kind: 'tree', stage: 2, care: 0 }));
    expect(location.hash).toBe('#/friend/play/hide');
    cleanup();
    location.hash = '';
    cleanup = renderPlay(root, { name: 'friendPlay' }, makeDeps({ kind: 'chick', stage: 0, care: 0 }));
    expect(location.hash).toBe('#/friend/play/hide');
  });

  it('sends to pick when there is no friend', () => {
    cleanup = renderPlay(root, { name: 'friendPlay' }, makeDeps(null));
    expect(location.hash).toBe('#/friend/pick');
  });
});

describe('ball throw', () => {
  const FETCH = FLY_MS + RUN_MS + BACK_MS;
  /** 놀이 공간을 누르기 (같은 자리에서 누르고 떼기). */
  const throwTap = () => {
    const field = q('[data-testid="ball-field"]');
    field.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 50, clientY: 20 }));
    field.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 50, clientY: 20 }));
  };
  const dotsOn = () => root.querySelectorAll('.fetch-dot.on').length;

  it('a tap throws; the friend fetches and counts 하나', () => {
    const deps = makeDeps(dog());
    cleanup = renderBall(root, { name: 'friendBall' }, deps);
    expect(q('[data-testid="toy"]').textContent).toBe('⚽');
    expect(root.querySelectorAll('.fetch-dot').length).toBe(3);
    throwTap();
    vi.advanceTimersByTime(FETCH - 1);
    expect(spoken(deps)).not.toContain('하나!');
    vi.advanceTimersByTime(1);
    expect(spoken(deps)).toContain('하나!');
    expect(dotsOn()).toBe(1);
  });

  it('cannot throw again while the friend is fetching', () => {
    const deps = makeDeps(dog());
    cleanup = renderBall(root, { name: 'friendBall' }, deps);
    throwTap();
    vi.advanceTimersByTime(FLY_MS + 10);
    throwTap();
    vi.advanceTimersByTime(FETCH * 2);
    expect(dotsOn()).toBe(1);
  });

  it('three fetches end the game; again restarts, back goes to the friend', () => {
    const deps = makeDeps({ kind: 'cat', stage: 2, care: 0 });
    cleanup = renderBall(root, { name: 'friendBall' }, deps);
    expect(q('[data-testid="toy"]').textContent).toBe('🧶');
    for (let i = 0; i < 3; i++) {
      throwTap();
      vi.advanceTimersByTime(FETCH + 50);
    }
    expect(spoken(deps)).toEqual(expect.arrayContaining(['하나!', '둘!', '셋!']));
    vi.advanceTimersByTime(2000);
    expect(spoken(deps)).toContain('재밌었어! 또 놀자!');
    tap('[data-testid="again"]');
    expect(root.querySelector('[data-testid="ball-field"]')).not.toBeNull();
    expect(dotsOn()).toBe(0);
    for (let i = 0; i < 3; i++) {
      throwTap();
      vi.advanceTimersByTime(FETCH + 50);
    }
    vi.advanceTimersByTime(2000);
    tap('[data-testid="back-friend"]');
    expect(location.hash).toBe('#/friend');
    expect(deps.savePets).not.toHaveBeenCalled();
    expect(deps.save).not.toHaveBeenCalled();
  });

  it('leaving mid-throw stops everything', () => {
    const deps = makeDeps(dog());
    cleanup = renderBall(root, { name: 'friendBall' }, deps);
    throwTap();
    vi.advanceTimersByTime(FLY_MS);
    cleanup();
    cleanup = undefined;
    vi.advanceTimersByTime(5000);
    expect(spoken(deps)).not.toContain('하나!');
  });

  it('a friend that cannot walk goes to hide-and-seek; no friend goes to pick', () => {
    cleanup = renderBall(root, { name: 'friendBall' }, makeDeps({ kind: 'tree', stage: 1, care: 0 }));
    expect(location.hash).toBe('#/friend/play/hide');
    cleanup();
    location.hash = '';
    cleanup = renderBall(root, { name: 'friendBall' }, makeDeps(null));
    expect(location.hash).toBe('#/friend/pick');
  });
});
