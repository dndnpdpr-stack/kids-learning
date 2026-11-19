import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getWorld } from '../../src/content';
import type { Progress } from '../../src/core/progress';
import { seededRng } from '../../src/core/rng';
import { defaultPets } from '../../src/pets/state';
import { parseRoute } from '../../src/router';
import { hasBatchim, objectJosa, type ScreenDeps } from '../../src/ui/dom';
import { render as renderFind } from '../../src/ui/find';
import { render as renderHome } from '../../src/ui/home';
import { render as renderWorld } from '../../src/ui/world';

function makeDeps(progress?: Partial<Progress>): ScreenDeps {
  return {
    progress: { stars: 0, correct: {}, volume: 0.5, ...progress },
    save: vi.fn(),
    speak: vi.fn(() => Promise.resolve()),
    rng: seededRng(42),
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
  root = document.createElement('div');
  document.body.appendChild(root);
});

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  root.remove();
});

describe('parseRoute', () => {
  it('parses each hash format', () => {
    expect(parseRoute('')).toEqual({ name: 'home' });
    expect(parseRoute('#/')).toEqual({ name: 'home' });
    expect(parseRoute('#/w/hangul')).toEqual({ name: 'world', world: 'hangul' });
    expect(parseRoute('#/w/abc')).toEqual({ name: 'world', world: 'abc' });
    expect(parseRoute('#/w/hangul/g/c1/find')).toEqual({ name: 'find', world: 'hangul', group: 'c1' });
    expect(parseRoute('#/w/numbers/g/count10/meet')).toEqual({ name: 'meet', world: 'numbers', group: 'count10' });
    expect(parseRoute('#/w/abc/g/abc2/trace')).toEqual({ name: 'trace', world: 'abc', group: 'abc2' });
    expect(parseRoute('#/parent')).toEqual({ name: 'parent' });
  });

  it('sends unknown hashes home', () => {
    for (const h of ['#/nope', '#/w/space', '#/w/hangul/g/zz/find', '#/w/hangul/g/c1/dance', '#/parent/x']) {
      expect(parseRoute(h)).toEqual({ name: 'home' });
    }
  });
});

describe('josa helper', () => {
  it('detects 받침 on the final character', () => {
    expect(hasBatchim('기역')).toBe(true);
    expect(hasBatchim('아')).toBe(false);
    expect(hasBatchim('하나')).toBe(false);
    expect(hasBatchim('셋')).toBe(true);
    expect(hasBatchim('A')).toBe(false);
  });

  it('picks 을/를', () => {
    expect(objectJosa('기역')).toBe('기역을');
    expect(objectJosa('니은')).toBe('니은을');
    expect(objectJosa('가')).toBe('가를');
  });
});

describe('home', () => {
  it('renders three world buttons and the star count', () => {
    cleanup = renderHome(root, { name: 'home' }, makeDeps({ stars: 7 }));
    expect(root.querySelectorAll('[data-world]').length).toBe(3);
    expect(root.textContent).toContain('7');
    expect(root.querySelector('[data-testid="parent-btn"]')).not.toBeNull();
  });
});

describe('world', () => {
  it('opens only the first group when progress is empty', () => {
    cleanup = renderWorld(root, { name: 'world', world: 'hangul' }, makeDeps());
    const cards = [...root.querySelectorAll<HTMLElement>('[data-group]')];
    expect(cards.length).toBe(getWorld('hangul').groups.length);
    expect(cards.map((c) => c.dataset.locked)).toEqual(
      cards.map((_, i) => (i === 0 ? 'false' : 'true')),
    );
  });

  it('speaks a hint when a locked group is tapped', () => {
    const deps = makeDeps();
    cleanup = renderWorld(root, { name: 'world', world: 'hangul' }, deps);
    root.querySelector<HTMLElement>('[data-group="c2"]')!.click();
    expect(deps.speak).toHaveBeenCalledWith('조금 더 하면 열려!', { lang: 'ko-KR', volume: 0.5 });
  });
});

describe('find', () => {
  const c1 = getWorld('hangul').groups[0].items;

  function targetGlyph(deps: ScreenDeps): string {
    const prompt = vi.mocked(deps.speak).mock.calls[0][0];
    const item = c1.find((i) => prompt === `${objectJosa(i.name)} 찾아봐!`);
    expect(item).toBeDefined();
    return item!.glyph;
  }

  function choiceButtons(): HTMLButtonElement[] {
    return [...root.querySelectorAll<HTMLButtonElement>('[data-choice]')];
  }

  it('counts a correct answer once even when tapped 5 times in the same tick', () => {
    const deps = makeDeps();
    cleanup = renderFind(root, { name: 'find', world: 'hangul', group: 'c1' }, deps);
    const glyph = targetGlyph(deps);
    const correct = choiceButtons().find((b) => b.textContent === glyph)!;
    for (let i = 0; i < 5; i++) correct.click();
    expect(deps.progress.stars).toBe(1);
    expect(deps.progress.correct['hangul/c1']).toBe(1);
    expect(deps.save).toHaveBeenCalledTimes(1);
  });

  it('keeps stars on a wrong answer and asks to listen again', () => {
    const deps = makeDeps();
    cleanup = renderFind(root, { name: 'find', world: 'hangul', group: 'c1' }, deps);
    const glyph = targetGlyph(deps);
    const wrong = choiceButtons().find((b) => b.textContent !== glyph)!;
    wrong.click();
    expect(deps.progress.stars).toBe(0);
    expect(deps.save).not.toHaveBeenCalled();
    expect(deps.speak).toHaveBeenLastCalledWith('다시 들어볼까?', { lang: 'ko-KR', volume: 0.5 });
  });
});

describe('find speech sequencing', () => {
  /** speak mock that behaves like audio.ts: a new call resolves (cancels) the pending one. */
  function cancelableSpeak() {
    const spoken: [string, string][] = [];
    let pending: (() => void) | null = null;
    const speak = vi.fn((text: string, opts: { lang: string }) => {
      pending?.();
      spoken.push([text, opts.lang]);
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

  const flush = () => new Promise((r) => setTimeout(r, 0));
  const abc1 = getWorld('abc').groups[0].items;

  function setup() {
    const mock = cancelableSpeak();
    const deps = { ...makeDeps(), speak: mock.speak as unknown as ScreenDeps['speak'] };
    cleanup = renderFind(root, { name: 'find', world: 'abc', group: 'abc1' }, deps);
    const name = mock.spoken[0][0];
    expect(abc1.some((i) => i.name === name)).toBe(true);
    return { ...mock, name };
  }

  it('replaying while the letter name plays is not cut off by a stale 찾아봐!', async () => {
    const { spoken, finish, name } = setup();
    root.querySelector<HTMLElement>('.replay-btn')!.click();
    await flush();
    expect(spoken).toEqual([
      [name, 'en-US'],
      [name, 'en-US'],
    ]);
    finish();
    await flush();
    expect(spoken.slice(-2)).toEqual([
      [name, 'en-US'],
      ['찾아봐!', 'ko-KR'],
    ]);
    expect(spoken.length).toBe(3);
  });

  it('a wrong tap while the name plays is not followed by a stale 찾아봐!', async () => {
    const { spoken, finish, name } = setup();
    const glyph = abc1.find((i) => i.name === name)!.glyph;
    [...root.querySelectorAll<HTMLButtonElement>('[data-choice]')].find((b) => b.textContent !== glyph)!.click();
    await flush();
    expect(spoken.slice(1)).toEqual([['다시 들어볼까?', 'ko-KR']]);
    finish();
    await flush();
    finish();
    await flush();
    expect(spoken.slice(1)).toEqual([
      ['다시 들어볼까?', 'ko-KR'],
      [name, 'en-US'],
      ['찾아봐!', 'ko-KR'],
    ]);
  });
});
