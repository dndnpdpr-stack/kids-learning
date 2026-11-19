import { FRIEND_ORDER, FRIENDS } from '../pets/friends';
import { startFriend } from '../pets/state';
import { go, type Route } from '../router';
import { button, el, say, topBar, type Cleanup, type ScreenDeps } from './dom';
import { petNode } from './petFx';

const ASK = '누구랑 친구 할까?';

export function render(root: HTMLElement, _route: Route, deps: ScreenDeps): Cleanup {
  let leaving = false;
  const choices = FRIEND_ORDER.map((kind) =>
    button(
      el('span', 'pick-face', [petNode(kind, 0)]),
      () => {
        if (leaving) return;
        leaving = true;
        deps.pets = startFriend(deps.pets, kind);
        deps.savePets(deps.pets);
        deps.announce = FRIENDS[kind].hello;
        go({ name: 'friend' });
      },
      'pick-btn',
      { 'data-kind': kind, 'aria-label': FRIENDS[kind].name },
    ),
  );

  root.append(el('section', 'screen friend-pick', [topBar(null), el('div', 'pick-grid', choices)]));

  // 이사 직후처럼 앞 화면이 남긴 말이 있으면 이어서 묻는다 (새 말이 앞 말을 끊지 않게).
  if (deps.announce) deps.announce = `${deps.announce} ${ASK}`;
  else void say(deps, ASK);

  return () => {};
}
