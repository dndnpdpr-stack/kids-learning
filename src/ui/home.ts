import { getWorld, type WorldId } from '../content';
import { go, type Route } from '../router';
import { button, el, say, type Cleanup, type ScreenDeps } from './dom';

export const APP_NAME = '놀이 학교';

const WORLD_ORDER: WorldId[] = ['hangul', 'numbers', 'abc'];

export function render(root: HTMLElement, _route: Route, deps: ScreenDeps): Cleanup {
  let disposed = false;
  let leaving = false;

  const worlds = WORLD_ORDER.map((id) => {
    const w = getWorld(id);
    return button(
      el('span', 'mascot', [w.mascot]),
      async () => {
        if (leaving) return;
        leaving = true;
        await say(deps, w.title);
        if (!disposed) go({ name: 'world', world: id });
      },
      `world-btn world-${id}`,
      { 'data-world': id, 'aria-label': w.title },
    );
  });

  const parent = button('🔒', () => {}, 'icon-btn parent-btn', {
    'data-testid': 'parent-btn',
    'aria-label': '부모',
  });

  root.append(
    el('section', 'screen home', [
      el('div', 'home-top', [el('div', 'stars-badge', [`⭐ ${deps.progress.stars}`]), parent]),
      el('h1', 'app-title', [APP_NAME]),
      el('div', 'world-list', worlds),
    ]),
  );

  return () => {
    disposed = true;
  };
}
