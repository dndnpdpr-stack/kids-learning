import { getWorld, type WorldId } from '../content';
import { starBalance } from '../pets/state';
import { go, type Route } from '../router';
import { attachLongPress } from './longPress';
import { button, el, type Cleanup, type ScreenDeps } from './dom';
import { petNode } from './petFx';

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

  const friend = deps.pets.current;
  const friendBtn = button(
    friend ? petNode(friend.kind, friend.stage) : el('span', 'egg', ['🥚']),
    () => {
      if (leaving) return;
      leaving = true;
      go({ name: friend ? 'friend' : 'friendPick' });
    },
    'friend-btn',
    { 'data-testid': 'friend-btn', 'aria-label': '내 친구' },
  );

  // 평소엔 3초 길게 눌러야 열린다. 테스트 모드에서는 한 번 눌러도 바로 연다.
  const parent = button('🔒', () => deps.testMode && go({ name: 'parent' }), 'icon-btn parent-btn', {
    'data-testid': 'parent-btn',
    'aria-label': '부모',
  });

  const detachLongPress = attachLongPress(parent, 3000, () => go({ name: 'parent' }));

  root.append(
    el('section', 'screen home', [
      el('div', 'home-top', [
        el('div', 'stars-badge', [`⭐ ${starBalance(deps.progress.stars, deps.pets)}`]),
        ...(deps.testMode ? [el('div', 'test-badge', ['🧪 테스트'], { 'data-testid': 'test-badge' })] : []),
        parent,
      ]),
      el('h1', 'app-title', [deps.childName ? `${deps.childName}의 ${APP_NAME}` : APP_NAME]),
      el('div', 'world-list', worlds),
      friendBtn,
    ]),
  );

  return () => detachLongPress();
}
