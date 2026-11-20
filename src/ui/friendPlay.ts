import { canFetch, toyFor } from '../pets/play';
import { go, type Route } from '../router';
import { button, el, say, topBar, type Cleanup, type ScreenDeps } from './dom';
import { petNode } from './petFx';

const ASK = '뭐 하고 놀까?';

/** 같이 놀기: 공 던지기 / 숨바꼭질 고르기. 걷지 못하는 친구는 바로 숨바꼭질로 간다. */
export function render(root: HTMLElement, _route: Route, deps: ScreenDeps): Cleanup {
  const f = deps.pets.current;
  if (!f) {
    go({ name: 'friendPick' }, { replace: true });
    return () => {};
  }
  if (!canFetch(f)) {
    go({ name: 'friendHide' }, { replace: true });
    return () => {};
  }
  const choice = (testid: string, icon: string, label: string, to: Route) =>
    button(
      [
        el('span', 'play-choice-art', [petNode(f.kind, f.stage), el('span', 'play-choice-icon', [icon])]),
        el('span', 'play-choice-label', [label]),
      ],
      () => go(to),
      'play-choice',
      { 'data-testid': testid, 'aria-label': label },
    );
  root.append(
    el('section', 'screen friend-play', [
      topBar(null, button('⬅', () => go({ name: 'friend' }), 'icon-btn', { 'data-testid': 'play-back', 'aria-label': '뒤로' })),
      el('div', 'play-choices', [
        choice('play-ball', toyFor(f.kind), '공 던지기', { name: 'friendBall' }),
        choice('play-hide', '🙈', '숨바꼭질', { name: 'friendHide' }),
      ]),
    ]),
  );
  void say(deps, ASK);
  return () => {};
}
