import { getWorld, type WorldId } from '../content';
import { go, type Route } from '../router';
import { attachLongPress } from './longPress';
import { button, el, type Cleanup, type ScreenDeps } from './dom';

export const APP_NAME = '놀이 학교';

const WORLD_ORDER: WorldId[] = ['numbers', 'hangul', 'abc'];

export function render(root: HTMLElement, _route: Route, deps: ScreenDeps): Cleanup {
  let leaving = false;

  const worlds = WORLD_ORDER.map((id) => {
    const w = getWorld(id);
    return button(
      [el('span', 'mascot', [w.mascot]), el('span', 'world-label', [w.title])],
      () => {
        if (leaving) return;
        leaving = true;
        deps.announce = w.title;
        go({ name: 'world', world: id });
      },
      `world-btn world-${id}`,
      { 'data-world': id, 'aria-label': w.title },
    );
  });

  // 평소엔 3초 길게 눌러야 열린다. 테스트 모드에서는 한 번 눌러도 바로 연다.
  const parent = button('🔒', () => deps.testMode && go({ name: 'parent' }), 'icon-btn parent-btn', {
    'data-testid': 'parent-btn',
    'aria-label': '부모',
  });

  const detachLongPress = attachLongPress(parent, 3000, () => go({ name: 'parent' }));

  root.append(
    el('section', 'screen home', [
      el('div', 'home-top', [
        el('div', 'stars-badge', [`⭐ ${deps.progress.stars}`]),
        ...(deps.testMode ? [el('div', 'test-badge', ['🧪 테스트'], { 'data-testid': 'test-badge' })] : []),
        parent,
      ]),
      el('h1', 'app-title', [deps.childName ? `${deps.childName}의 ${APP_NAME}` : APP_NAME]),
      el('div', 'world-list', worlds),
    ]),
  );

  return () => detachLongPress();
}
