import type { FriendKind, Stage } from '../pets/state';
import { go } from '../router';
import { button, el, say, type ScreenDeps } from './dom';
import { petNode } from './petFx';

export const END_LINE = '재밌었어! 또 놀자!';

/** 놀이 한 판이 끝났을 때: 기뻐하는 친구 + 또 하기 / 돌아가기. host의 내용을 바꾼다. */
export function showPlayEnd(host: HTMLElement, deps: ScreenDeps, kind: FriendKind, stage: Stage, onAgain: () => void): void {
  const pet = petNode(kind, stage);
  pet.classList.add('happy');
  host.replaceChildren(
    el('div', 'play-end', [
      el('div', 'play-end-pet', [pet]),
      el('div', 'play-end-actions', [
        button('🔁', onAgain, 'play-end-btn', { 'data-testid': 'again', 'aria-label': '또 하기' }),
        button('🏠', () => go({ name: 'friend' }), 'play-end-btn', { 'data-testid': 'back-friend', 'aria-label': '돌아가기' }),
      ]),
    ]),
  );
  void say(deps, END_LINE);
}
