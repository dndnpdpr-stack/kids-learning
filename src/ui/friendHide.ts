import { drawParkSpot } from '../pets/parkArt';
import { PARK_SPOTS, canFetch, nextHide } from '../pets/play';
import { go, type Route } from '../router';
import { celebrate } from './celebrate';
import { button, el, say, shake, timers, topBar, type Cleanup, type ScreenDeps } from './dom';
import { petNode } from './petFx';
import { showPlayEnd } from './playEnd';

/** 친구가 숨을 곳으로 쏙 들어가는 시간 (그동안은 누를 수 없다). */
export const HIDE_MS = 700;
/** "까꿍!" 뒤에 다음 판으로 넘어가기까지. */
export const NEXT_MS = 1600;
const TURNS = 3;
/** 한 판에서 이만큼 틀리면 숨은 친구가 크게 꼼지락거린다. */
const HINT_AFTER = 2;

function svgNode(markup: string): SVGSVGElement {
  const tpl = document.createElement('template');
  tpl.innerHTML = markup.trim();
  return tpl.content.firstElementChild as SVGSVGElement;
}

/**
 * 숨바꼭질 (공원): 나무·미끄럼틀·벤치·덤불·꽃밭 중 한 곳에 친구(나무면 나비)가 반쯤 숨고,
 * 아이가 눌러서 찾는다. 3번 찾으면 끝.
 * docs/superpowers/specs/2026-11-20-play-together-design.md (변경 2026-11-21)
 */
export function render(root: HTMLElement, _route: Route, deps: ScreenDeps): Cleanup {
  const f = deps.pets.current;
  if (!f) {
    go({ name: 'friendPick' }, { replace: true });
    return () => {};
  }
  const isTree = f.kind === 'tree';
  const lines = isTree
    ? { start: '나비가 숨었어! 찾아봐!', again: '나비가 또 숨었어!', found: '찾았다!' }
    : { start: '숨을게! 찾아봐!', again: '또 숨을게!', found: '까꿍!' };
  const art = (): Element => (isTree ? el('span', 'hider-emoji', ['🦋']) : petNode(f.kind, f.stage));

  const t = timers();
  const stops: (() => void)[] = [];
  const dots = Array.from({ length: TURNS }, () => el('span', 'fetch-dot'));
  const body = el('div', 'play-body');
  // 고르기 화면을 건너뛰는 친구(나무·알)는 친구 화면으로 바로 돌아간다.
  const backTo: Route = canFetch(f) ? { name: 'friendPlay' } : { name: 'friend' };
  const back = button('⬅', () => go(backTo), 'icon-btn', { 'data-testid': 'play-back', 'aria-label': '뒤로' });
  const screen = el('section', 'screen friend-hide', [topBar(null, back, el('div', 'fetch-dots', dots)), body]);
  root.append(screen);

  function start() {
    let turn = 0;
    let last: number | null = null;
    let hidden = 0;
    let misses = 0;
    let locked = true;
    let peeker: HTMLElement | null = null;
    dots.forEach((d) => d.classList.remove('on'));

    const spotBtns = PARK_SPOTS.map((s, i) =>
      button(svgNode(drawParkSpot(s.id)), () => seek(i), `park-spot spot-${s.id}`, {
        'data-spot': s.id,
        'aria-label': s.name,
      }),
    );
    const hider = el('div', 'hider');
    const park = el('div', 'park', [
      el('div', 'pg-sun', [], { 'aria-hidden': 'true' }),
      el('div', 'pg-cloud c1', [], { 'aria-hidden': 'true' }),
      el('div', 'pg-cloud c2', [], { 'aria-hidden': 'true' }),
      el('div', 'park-path', [], { 'aria-hidden': 'true' }),
      ...spotBtns,
      hider,
    ]);
    body.replaceChildren(park);

    function nextTurn() {
      hidden = nextHide(deps.rng, PARK_SPOTS.length, last);
      last = hidden;
      misses = 0;
      locked = true;
      spotBtns.forEach((b) => b.classList.remove('hint', 'found'));
      peeker?.remove();
      // 숨은 친구는 그림 뒤(앞선 형제)에 깔고, 숨는 연출이 끝나면 보이게 한다.
      peeker = el('span', 'peeker waiting', [art()]);
      spotBtns[hidden].prepend(peeker);
      hider.replaceChildren(art());
      hider.classList.remove('hiding');
      void hider.offsetWidth;
      hider.classList.add('hiding');
      void say(deps, turn === 0 ? lines.start : lines.again);
      t.after(HIDE_MS, () => {
        peeker?.classList.remove('waiting');
        locked = false;
      });
    }

    function seek(i: number) {
      if (locked) return;
      const b = spotBtns[i];
      if (i !== hidden) {
        shake(b);
        void say(deps, `${PARK_SPOTS[i].ask} 여기 없네!`);
        misses++;
        if (misses >= HINT_AFTER) spotBtns[hidden].classList.add('hint');
        return;
      }
      locked = true;
      b.classList.remove('hint');
      b.classList.add('found');
      peeker?.firstElementChild?.classList.add('happy');
      void say(deps, lines.found);
      dots[turn]?.classList.add('on');
      turn++;
      if (turn >= TURNS) {
        stops.push(celebrate(screen, { big: true, mascot: isTree ? '🦋' : '🙈' }));
        t.after(NEXT_MS, () => showPlayEnd(body, deps, f!.kind, f!.stage, start));
        return;
      }
      t.after(NEXT_MS, nextTurn);
    }

    nextTurn();
  }

  start();
  return () => {
    t.clear();
    stops.forEach((s) => s());
  };
}
