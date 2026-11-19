import { FRIENDS } from '../pets/friends';
import { go, type Route } from '../router';
import { button, el, say, timers, topBar, type Cleanup, type ScreenDeps } from './dom';
import { petFx } from './petFx';

const EMPTY = '친구를 다 키우면 여기로 와요';

/** 친구 수와 화면 비율로 격자 칸 수를 정한다 (스크롤 없이 모두 보이게). */
function gridCols(n: number): number {
  const aspect = window.innerHeight > 0 ? window.innerWidth / window.innerHeight : 1;
  return Math.max(1, Math.min(n, Math.ceil(Math.sqrt(n * aspect))));
}

export function render(root: HTMLElement, _route: Route, deps: ScreenDeps): Cleanup {
  const t = timers();
  const room = deps.pets.room;
  const back = button('⬅', () => go({ name: 'friend' }), 'icon-btn', { 'aria-label': '뒤로' });

  const tiles = room.map(({ kind }, i) => {
    const tile = el('div', 'room-stage');
    const fx = petFx(tile, t, kind, deps.rng);
    fx.draw(3);
    return button(
      tile,
      () => {
        fx.pet();
        fx.bubble(FRIENDS[kind].pet.line);
        void say(deps, FRIENDS[kind].pet.line);
      },
      'room-btn-pet',
      { 'data-room': String(i), 'aria-label': FRIENDS[kind].name },
    );
  });

  const body = tiles.length
    ? el('div', 'room-grid', tiles)
    : el('div', 'room-empty', ['🧸']);
  if (tiles.length) {
    const cols = gridCols(tiles.length);
    body.style.setProperty('--cols', String(cols));
    body.style.setProperty('--rows', String(Math.ceil(tiles.length / cols)));
  }

  root.append(el('section', 'screen friend-room', [topBar(null, back), body]));
  if (!tiles.length) void say(deps, EMPTY);

  return () => t.clear();
}
