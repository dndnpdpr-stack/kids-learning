import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { seededRng } from '../../src/core/rng';
import { parseRoute } from '../../src/router';
import { callName, type ScreenDeps } from '../../src/ui/dom';
import { render as renderHome } from '../../src/ui/home';
import { render as renderParent } from '../../src/ui/parent';
import { render as renderSetup } from '../../src/ui/setup';

function makeDeps(childName: string | null = null): ScreenDeps {
  const deps: ScreenDeps = {
    progress: { stars: 0, correct: {}, volume: 0.5 },
    save: vi.fn(),
    speak: vi.fn(() => Promise.resolve()),
    rng: seededRng(1),
    childName,
    announce: null,
    saveName: vi.fn((n: string) => {
      deps.childName = n;
    }),
  };
  return deps;
}

let root: HTMLElement;
let cleanup: (() => void) | undefined;
beforeEach(() => {
  root = document.createElement('div');
  document.body.appendChild(root);
  location.hash = '';
});
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  root.remove();
  location.hash = '';
});

describe('setup route', () => {
  it('parses #/setup', () => {
    expect(parseRoute('#/setup')).toEqual({ name: 'setup' });
  });
});

describe('callName (호격 아/야)', () => {
  it('uses 아 after 받침 and 야 otherwise', () => {
    expect(callName('하늘')).toBe('하늘아');
    expect(callName('지우')).toBe('지우야');
    expect(callName('Leo')).toBe('Leo');
  });
});

describe('setup screen', () => {
  it('disables start until a name is typed', () => {
    const deps = makeDeps();
    cleanup = renderSetup(root, { name: 'setup' }, deps);
    const input = root.querySelector<HTMLInputElement>('[data-testid="name-input"]')!;
    const start = root.querySelector<HTMLButtonElement>('[data-testid="name-start"]')!;
    expect(start.disabled).toBe(true);
    input.value = '   ';
    input.dispatchEvent(new Event('input'));
    expect(start.disabled).toBe(true);
    input.value = '하늘';
    input.dispatchEvent(new Event('input'));
    expect(start.disabled).toBe(false);
  });

  it('saves the name and goes home immediately, leaving the greeting for the next screen', () => {
    const deps = makeDeps();
    cleanup = renderSetup(root, { name: 'setup' }, deps);
    const input = root.querySelector<HTMLInputElement>('[data-testid="name-input"]')!;
    input.value = ' 하늘 ';
    input.dispatchEvent(new Event('input'));
    root.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(deps.saveName).toHaveBeenCalledWith('하늘');
    expect(location.hash).toBe('#/');
    expect(deps.announce).toBe('하늘아, 반가워!');
    expect(deps.speak).not.toHaveBeenCalled();
  });
});

describe('home world buttons', () => {
  it('navigate immediately and leave the world name for the next screen', () => {
    const deps = makeDeps('하늘');
    cleanup = renderHome(root, { name: 'home' }, deps);
    root.querySelector<HTMLButtonElement>('[data-world="numbers"]')!.click();
    expect(location.hash).toBe('#/w/numbers');
    expect(deps.announce).toBe('숫자');
    expect(deps.speak).not.toHaveBeenCalled();
  });
});

describe('home title', () => {
  it('shows "<name>의 놀이 학교" when a name is set', () => {
    cleanup = renderHome(root, { name: 'home' }, makeDeps('하늘'));
    expect(root.querySelector('.app-title')!.textContent).toBe('하늘의 놀이 학교');
  });
  it('falls back to 놀이 학교 without a name', () => {
    cleanup = renderHome(root, { name: 'home' }, makeDeps(null));
    expect(root.querySelector('.app-title')!.textContent).toBe('놀이 학교');
  });
});

describe('parent screen name edit', () => {
  it('changes the child name', () => {
    const deps = makeDeps('하늘');
    cleanup = renderParent(root, { name: 'parent' }, deps);
    const input = root.querySelector<HTMLInputElement>('[data-testid="parent-name"]')!;
    expect(input.value).toBe('하늘');
    input.value = '바다';
    root.querySelector<HTMLButtonElement>('[data-testid="parent-name-save"]')!.click();
    expect(deps.saveName).toHaveBeenCalledWith('바다');
  });
  it('ignores an empty name', () => {
    const deps = makeDeps('하늘');
    cleanup = renderParent(root, { name: 'parent' }, deps);
    const input = root.querySelector<HTMLInputElement>('[data-testid="parent-name"]')!;
    input.value = '  ';
    root.querySelector<HTMLButtonElement>('[data-testid="parent-name-save"]')!.click();
    expect(deps.saveName).not.toHaveBeenCalled();
  });
});
