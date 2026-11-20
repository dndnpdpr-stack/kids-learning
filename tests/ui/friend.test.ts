import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Progress } from '../../src/core/progress';
import { seededRng } from '../../src/core/rng';
import { defaultPets, type PetsState } from '../../src/pets/state';
import { parseRoute, toHash } from '../../src/router';
import type { ScreenDeps } from '../../src/ui/dom';
import { render as renderFriend } from '../../src/ui/friend';
import { render as renderPick } from '../../src/ui/friendPick';
import { render as renderRoom } from '../../src/ui/friendRoom';
import { render as renderHome } from '../../src/ui/home';
import { render as renderParent } from '../../src/ui/parent';

function makeDeps(stars = 0, pets: Partial<PetsState> = {}, progress: Partial<Progress> = {}): ScreenDeps {
  const deps: ScreenDeps = {
    progress: { stars, correct: {}, volume: 0.5, ...progress },
    save: vi.fn(),
    speak: vi.fn(() => Promise.resolve()),
    rng: seededRng(7),
    childName: '하늘',
    announce: null,
    testMode: false,
    saveName: vi.fn(),
    pets: { ...defaultPets(), ...pets },
    savePets: vi.fn(),
  };
  return deps;
}

const spoken = (deps: ScreenDeps) => (deps.speak as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]);
const q = <T extends Element = HTMLElement>(sel: string) => root.querySelector<T & HTMLElement>(sel)!;
const tap = (sel: string) => q<HTMLButtonElement>(sel).click();

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

describe('friend routes', () => {
  it('parses and builds the friend hashes', () => {
    expect(parseRoute('#/friend')).toEqual({ name: 'friend' });
    expect(parseRoute('#/friend/pick')).toEqual({ name: 'friendPick' });
    expect(parseRoute('#/friend/room')).toEqual({ name: 'friendRoom' });
    expect(parseRoute('#/friend/x')).toEqual({ name: 'home' });
    expect(toHash({ name: 'friend' })).toBe('#/friend');
    expect(toHash({ name: 'friendPick' })).toBe('#/friend/pick');
    expect(toHash({ name: 'friendRoom' })).toBe('#/friend/room');
  });
});

describe('home friend button', () => {
  it('shows the star balance, not the total earned', () => {
    cleanup = renderHome(root, { name: 'home' }, makeDeps(5, { spent: 2 }));
    expect(q('.stars-badge').textContent).toBe('⭐ 3');
  });

  it('shows an egg and goes to pick when there is no friend', () => {
    cleanup = renderHome(root, { name: 'home' }, makeDeps());
    expect(q('[data-testid="friend-btn"]').textContent).toContain('🥚');
    tap('[data-testid="friend-btn"]');
    expect(location.hash).toBe('#/friend/pick');
  });

  it('shows the current friend art and goes to the friend screen', () => {
    cleanup = renderHome(root, { name: 'home' }, makeDeps(0, { current: { kind: 'cat', stage: 1, care: 0 } }));
    expect(q('[data-testid="friend-btn"] svg.pet.cat')).not.toBeNull();
    tap('[data-testid="friend-btn"]');
    expect(location.hash).toBe('#/friend');
  });
});

describe('friend pick', () => {
  it('asks who to befriend and starts the chosen friend', () => {
    const deps = makeDeps();
    cleanup = renderPick(root, { name: 'friendPick' }, deps);
    expect(root.querySelectorAll('[data-kind]').length).toBe(4);
    expect(spoken(deps)).toContain('누구랑 친구 할까?');
    tap('[data-kind="dog"]');
    expect(deps.pets.current).toEqual({ kind: 'dog', stage: 0, care: 0 });
    expect(deps.savePets).toHaveBeenCalledWith(deps.pets);
    expect(deps.announce).toBe('멍멍! 반가워!');
    expect(location.hash).toBe('#/friend');
  });

  it('redirects to the friend screen while a friend is being raised (e.g. after a back gesture)', () => {
    const half = { kind: 'cat' as const, stage: 2 as const, care: 3 };
    const deps = makeDeps(0, { spent: 7, current: half });
    cleanup = renderPick(root, { name: 'friendPick' }, deps);
    expect(location.hash).toBe('#/friend');
    expect(root.querySelectorAll('[data-kind]').length).toBe(0);
    expect(deps.pets.current).toEqual(half);
    expect(deps.speak).not.toHaveBeenCalled();
  });

  it('ignores a tap if a friend appeared after the screen was drawn', () => {
    const deps = makeDeps();
    cleanup = renderPick(root, { name: 'friendPick' }, deps);
    const half = { kind: 'cat' as const, stage: 2 as const, care: 3 };
    deps.pets = { ...deps.pets, current: half };
    tap('[data-kind="dog"]');
    expect(deps.pets.current).toEqual(half);
    expect(deps.savePets).not.toHaveBeenCalled();
  });

  it('folds a pending announcement into the question', () => {
    const deps = makeDeps();
    deps.announce = '새 친구를 데려오자!';
    cleanup = renderPick(root, { name: 'friendPick' }, deps);
    expect(deps.announce).toBe('새 친구를 데려오자! 누구랑 친구 할까?');
    expect(deps.speak).not.toHaveBeenCalled();
  });
});

describe('friend screen', () => {
  const dog = (stage: 0 | 1 | 2 | 3 = 0, care = 0) => ({ current: { kind: 'dog' as const, stage, care } });

  it('sends to pick when there is no friend', () => {
    cleanup = renderFriend(root, { name: 'friend' }, makeDeps());
    expect(location.hash).toBe('#/friend/pick');
  });

  it('shows balance, growth dots, five actions and greets', () => {
    const deps = makeDeps(4, { ...dog(1, 2), spent: 1 });
    cleanup = renderFriend(root, { name: 'friend' }, deps);
    expect(q('[data-testid="balance"]').textContent).toBe('⭐ 3');
    expect(q('[data-testid="growth"]').querySelectorAll('.dot').length).toBe(5);
    expect(q('[data-testid="growth"]').querySelectorAll('.dot.on').length).toBe(2);
    expect(root.querySelectorAll('[data-care]').length).toBe(3);
    expect(root.querySelectorAll('[data-free]').length).toBe(2);
    expect(root.querySelectorAll('.star-cost').length).toBe(3);
    expect(spoken(deps)).toContain('멍멍! 반가워!');
    expect(root.querySelector('[data-testid="move-btn"]')).toBeNull();
  });

  it('does not repeat the greeting when it is already announced', () => {
    const deps = makeDeps(0, dog());
    deps.announce = '멍멍! 반가워!';
    cleanup = renderFriend(root, { name: 'friend' }, deps);
    expect(deps.speak).not.toHaveBeenCalled();
  });

  describe('no stars → quiz', () => {
    /** 아직 아무것도 안 해 봤으면 1~5 세기 문제가 나온다: 채운 칸 수가 정답. */
    const answerOf = () => q('.care-quiz').querySelectorAll('.frame-cell.filled').length;
    const choose = (n: number) => q<HTMLButtonElement>(`.care-quiz [data-choice="${n}"]`).click();
    const wrongChoice = () =>
      [...root.querySelectorAll<HTMLButtonElement>('.care-quiz [data-choice]')].find(
        (b) => Number(b.dataset.choice) !== answerOf(),
      )!;

    it('opens a quiz instead of caring, and locks the actions', () => {
      const deps = makeDeps(0, dog());
      cleanup = renderFriend(root, { name: 'friend' }, deps);
      tap('[data-care="eat"]');
      expect(root.querySelector('.care-quiz')).not.toBeNull();
      expect(deps.pets.current).toEqual({ kind: 'dog', stage: 0, care: 0 });
      expect(deps.savePets).not.toHaveBeenCalled();
      expect(q('[data-testid="balance"]').classList.contains('shake')).toBe(true);
      expect(spoken(deps)).toContain('문제를 맞히면 바로 해 줄게!');
      expect(q('.act-row').classList.contains('busy')).toBe(true);
      tap('[data-care="wash"]');
      expect(root.querySelectorAll('.care-quiz').length).toBe(1);
    });

    it('a right answer closes the quiz and does that care once without spending stars', () => {
      const deps = makeDeps(0, dog());
      cleanup = renderFriend(root, { name: 'friend' }, deps);
      tap('[data-care="eat"]');
      choose(answerOf());
      expect(spoken(deps)).toContain('맞았어!');
      vi.advanceTimersByTime(900);
      expect(root.querySelector('.care-quiz')).toBeNull();
      expect(deps.pets.current).toEqual({ kind: 'dog', stage: 0, care: 1 });
      expect(deps.pets.spent).toBe(0);
      expect(deps.savePets).toHaveBeenLastCalledWith(deps.pets);
      expect(deps.progress.stars).toBe(0);
      vi.advanceTimersByTime(3200);
      expect(spoken(deps)).toContain('냠냠! 맛있어!');
      expect(q('.act-row').classList.contains('busy')).toBe(false);
    });

    it('quiz care counts toward growing up', () => {
      const deps = makeDeps(0, dog(0, 2));
      cleanup = renderFriend(root, { name: 'friend' }, deps);
      tap('[data-care="play"]');
      choose(answerOf());
      vi.advanceTimersByTime(900 + 1000);
      expect(deps.pets.current).toEqual({ kind: 'dog', stage: 1, care: 0 });
      expect(spoken(deps)).toContain('와! 강아지가 자랐어!');
    });

    it('a wrong answer shakes and keeps the same quiz open', () => {
      const deps = makeDeps(0, dog());
      cleanup = renderFriend(root, { name: 'friend' }, deps);
      tap('[data-care="eat"]');
      const wrong = wrongChoice();
      wrong.click();
      expect(wrong.classList.contains('shake')).toBe(true);
      expect(spoken(deps)).toContain('다시 들어볼까?');
      vi.advanceTimersByTime(2000);
      expect(root.querySelector('.care-quiz')).not.toBeNull();
      expect(deps.pets.current?.care).toBe(0);
    });

    it('closing the quiz changes nothing and unlocks the actions', () => {
      const deps = makeDeps(0, dog());
      cleanup = renderFriend(root, { name: 'friend' }, deps);
      tap('[data-care="eat"]');
      tap('[data-testid="quiz-close"]');
      expect(root.querySelector('.care-quiz')).toBeNull();
      expect(deps.pets.current?.care).toBe(0);
      expect(q('.act-row').classList.contains('busy')).toBe(false);
      tap('[data-care="eat"]');
      expect(root.querySelector('.care-quiz')).not.toBeNull();
    });

    it('free actions and a grown friend never ask a quiz', () => {
      const deps = makeDeps(0, dog(3));
      cleanup = renderFriend(root, { name: 'friend' }, deps);
      tap('[data-care="eat"]');
      tap('[data-free="pet"]');
      expect(root.querySelector('.care-quiz')).toBeNull();
    });
  });

  /** 진행 중인 동작이 끝날 만큼 시간을 보낸다 (가장 긴 연출보다 길게). */
  const settle = () => vi.advanceTimersByTime(3200);

  it('three meals grow the friend; a tap during the grow animation is ignored', () => {
    const deps = makeDeps(5, dog());
    cleanup = renderFriend(root, { name: 'friend' }, deps);
    tap('[data-care="eat"]');
    settle();
    tap('[data-care="wash"]');
    expect(q('[data-testid="balance"]').textContent).toBe('⭐ 3');
    settle();
    tap('[data-care="play"]');
    expect(deps.pets.current).toEqual({ kind: 'dog', stage: 1, care: 0 });
    expect(deps.pets.spent).toBe(3);
    expect(deps.savePets).toHaveBeenLastCalledWith(deps.pets);
    tap('[data-care="eat"]');
    expect(deps.pets.spent).toBe(3);
    vi.advanceTimersByTime(1000);
    expect(spoken(deps)).toContain('와! 강아지가 자랐어!');
    expect(q('[data-testid="growth"]').querySelectorAll('.dot').length).toBe(5);
    settle();
    tap('[data-care="eat"]');
    expect(deps.pets.spent).toBe(4);
    expect(deps.pets.current?.care).toBe(1);
  });

  it('only one action at a time: other taps are ignored until the current one finishes', () => {
    const deps = makeDeps(5, dog());
    cleanup = renderFriend(root, { name: 'friend' }, deps);
    const row = q('.act-row');
    tap('[data-care="eat"]');
    expect(row.classList.contains('busy')).toBe(true);
    tap('[data-care="wash"]');
    tap('[data-care="play"]');
    tap('[data-free="pet"]');
    tap('[data-free="sleep"]');
    expect(deps.pets.spent).toBe(1);
    expect(spoken(deps)).not.toContain('헤헤, 좋아!');
    expect(q('svg.pet').classList.contains('sleeping')).toBe(false);
    vi.advanceTimersByTime(3099);
    tap('[data-care="wash"]');
    expect(deps.pets.spent).toBe(1);
    vi.advanceTimersByTime(1);
    expect(row.classList.contains('busy')).toBe(false);
    tap('[data-care="wash"]');
    expect(deps.pets.spent).toBe(2);
  });

  it('in test mode care is free and badges are hidden', () => {
    const deps = { ...makeDeps(0, dog()), testMode: true };
    cleanup = renderFriend(root, { name: 'friend' }, deps);
    expect(root.querySelectorAll('.star-cost').length).toBe(0);
    for (let i = 0; i < 3; i++) {
      tap('[data-care="eat"]');
      settle();
    }
    expect(deps.pets.current?.stage).toBe(1);
    expect(deps.pets.spent).toBe(0);
  });

  it('free actions cost nothing', () => {
    const deps = makeDeps(0, dog());
    cleanup = renderFriend(root, { name: 'friend' }, deps);
    tap('[data-free="pet"]');
    expect(spoken(deps)).toContain('헤헤, 좋아!');
    settle();
    tap('[data-free="sleep"]');
    expect(q('svg.pet').classList.contains('sleeping')).toBe(true);
    settle();
    tap('[data-free="sleep"]');
    expect(q('svg.pet').classList.contains('sleeping')).toBe(false);
    expect(deps.pets).toEqual({ ...defaultPets(), ...dog() });
    expect(deps.savePets).not.toHaveBeenCalled();
  });

  it('a grown friend shows a crown and moves to the room', () => {
    const deps = makeDeps(0, dog(3));
    cleanup = renderFriend(root, { name: 'friend' }, deps);
    expect(q('[data-testid="growth"]').textContent).toContain('👑');
    expect(q('[data-testid="move-btn"]').textContent).toBe('🚚');
    expect(q('[data-testid="room-btn"]').textContent).toBe('🧸');
    tap('[data-testid="move-btn"]');
    expect(deps.pets.room).toEqual([{ kind: 'dog' }]);
    expect(deps.pets.current).toBeNull();
    expect(deps.savePets).toHaveBeenCalledWith(deps.pets);
    expect(deps.announce).toBe('새 친구를 데려오자!');
    expect(location.hash).toBe('#/friend/pick');
  });

  it('leaves no timers behind after cleanup', () => {
    const deps = makeDeps(10, dog(0, 2));
    cleanup = renderFriend(root, { name: 'friend' }, deps);
    tap('[data-care="eat"]');
    tap('[data-free="pet"]');
    tap('[data-free="sleep"]');
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    cleanup();
    cleanup = undefined;
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('friend room', () => {
  it('shows grown friends that react to a tap', () => {
    const deps = makeDeps(0, { room: [{ kind: 'dog' }, { kind: 'tree' }, { kind: 'dog' }] });
    cleanup = renderRoom(root, { name: 'friendRoom' }, deps);
    const tiles = root.querySelectorAll<HTMLButtonElement>('[data-room]');
    expect(tiles.length).toBe(3);
    tiles[1].click();
    expect(spoken(deps)).toContain('간지러워!');
    expect(tiles[1].querySelector('svg.pet')!.classList.contains('happy')).toBe(true);
    cleanup();
    cleanup = undefined;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('says how to fill an empty room', () => {
    const deps = makeDeps();
    cleanup = renderRoom(root, { name: 'friendRoom' }, deps);
    expect(spoken(deps)).toContain('친구를 다 키우면 여기로 와요');
  });
});

describe('parent reset', () => {
  it('also resets friends', () => {
    const deps = makeDeps(5, { spent: 3, current: { kind: 'cat', stage: 2, care: 1 }, room: [{ kind: 'dog' }] });
    cleanup = renderParent(root, { name: 'parent' }, deps);
    tap('[data-testid="reset-btn"]');
    tap('[data-testid="reset-btn"]');
    expect(deps.pets).toEqual(defaultPets());
    expect(deps.savePets).toHaveBeenCalledWith(defaultPets());
  });
});
