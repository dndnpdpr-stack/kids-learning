import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Progress } from '../../src/core/progress';
import { seededRng } from '../../src/core/rng';
import { defaultPets, type Friend, type PetsState } from '../../src/pets/state';
import { parseRoute, toHash } from '../../src/router';
import type { ScreenDeps } from '../../src/ui/dom';
import { render as renderFriend } from '../../src/ui/friend';
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
