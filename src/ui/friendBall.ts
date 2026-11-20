import { koreanCount } from '../core/koreanNumber';
import { canFetch, dragTarget, throwTarget, toyFor, type Pt } from '../pets/play';
import { go, type Route } from '../router';
import { celebrate } from './celebrate';
import { button, el, say, timers, topBar, type Cleanup, type ScreenDeps } from './dom';
import { petNode } from './petFx';
import { showPlayEnd } from './playEnd';

/** 공이 날아가는 시간 · 친구가 달려가는 시간 · 물고 돌아오는 시간 (CSS 전환 시간도 이 값으로 정한다). */
export const FLY_MS = 800;
export const RUN_MS = 1000;
export const BACK_MS = 1000;
const TURNS = 3;
/** 3번째를 세고 끝 화면을 띄우기까지 (기뻐하는 모습을 잠깐 보여 준다). */
const END_DELAY_MS = 1200;
/** 이만큼 넘게 끌면 "밀기", 아니면 "누르기"로 본다. */
const DRAG_MIN_PX = 12;
const DRAG_SCALE = 3;
const START_LINE = '던져 줘! 내가 가져올게!';

/**
 * 공 던지기: 공을 밀거나 놀이 공간을 누르면 그쪽으로 던지고, 친구가 물어 와서 센다. 3번 하면 끝.
 * docs/superpowers/specs/2026-11-20-play-together-design.md
 */
/** 운동장 꾸미기 (누를 수 없음): 해, 구름, 멀리 나무, 골대, 잔디 줄무늬와 흰 선은 CSS. */
function playground(): HTMLElement[] {
  const goal = document.createElement('template');
  goal.innerHTML = `<svg class="pg-goal" viewBox="0 0 100 64" aria-hidden="true">
    <path d="M8 60 L14 18 L86 18 L92 60" fill="rgba(255,255,255,.35)" stroke="none"/>
    <g stroke="rgba(255,255,255,.75)" stroke-width="1.2">
      <path d="M26 18 L22 60 M38 18 L36 60 M50 18 L50 60 M62 18 L64 60 M74 18 L78 60"/>
      <path d="M12 32 L88 32 M10 46 L90 46"/>
    </g>
    <path d="M8 60 L8 6 L92 6 L92 60" fill="none" stroke="#fff" stroke-width="5" stroke-linejoin="round"/>
  </svg>`;
  return [
    el('div', 'pg-sun', [], { 'aria-hidden': 'true' }),
    el('div', 'pg-cloud c1', [], { 'aria-hidden': 'true' }),
    el('div', 'pg-cloud c2', [], { 'aria-hidden': 'true' }),
    el('div', 'pg-trees', ['🌳', '🌲', '🌳'], { 'aria-hidden': 'true' }),
    el('div', 'pg-lines', [], { 'aria-hidden': 'true' }),
    goal.content.firstElementChild as HTMLElement,
  ];
}

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
  const t = timers();
  let disposed = false;
  const stops: (() => void)[] = [];

  const dots = Array.from({ length: TURNS }, () => el('span', 'fetch-dot'));
  const body = el('div', 'play-body');
  const back = button('⬅', () => go({ name: 'friendPlay' }), 'icon-btn', { 'data-testid': 'play-back', 'aria-label': '뒤로' });
  const screen = el('section', 'screen friend-ball', [topBar(null, back, el('div', 'fetch-dots', dots)), body]);
  root.append(screen);

  function start() {
    let count = 0;
    let busy = false;
    let dragFrom: Pt | null = null;
    dots.forEach((d) => d.classList.remove('on'));

    const pet = petNode(f!.kind, f!.stage);
    const friend = el('div', 'ball-friend', [pet]);
    const toyInner = el('span', 'toy-inner', [toyFor(f!.kind)]);
    const toy = el('div', 'ball-toy', [toyInner], { 'data-testid': 'toy' });
    const field = el('div', 'ball-field', [...playground(), friend, toy], { 'data-testid': 'ball-field' });
    body.replaceChildren(field);

    const size = () => ({ w: field.clientWidth, h: field.clientHeight });
    const toyHome = (): Pt => ({ x: size().w * 0.55, y: size().h * 0.85 });
    const friendHome = (): Pt => ({ x: size().w * 0.3, y: size().h * 0.78 });
    /** 전환 시간 ms로 node를 p(놀이 공간 안 좌표, 가운데 기준)로 옮긴다. */
    const place = (node: HTMLElement, p: Pt, ms: number) => {
      node.style.transitionDuration = `${ms}ms`;
      node.style.left = `${p.x}px`;
      node.style.top = `${p.y}px`;
    };
    const face = (from: Pt, to: Pt) => friend.classList.toggle('facing-left', to.x < from.x);
    place(friend, friendHome(), 0);
    place(toy, toyHome(), 0);

    const local = (e: MouseEvent): Pt => {
      const r = field.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    function throwTo(target: Pt) {
      busy = true;
      pet.classList.remove('happy');
      place(toy, target, FLY_MS);
      toyInner.classList.add('flying');
      t.after(FLY_MS, () => {
        toyInner.classList.remove('flying');
        face(friendHome(), target);
        place(friend, target, RUN_MS);
        t.after(RUN_MS, () => {
          const home = friendHome();
          face(target, home);
          place(friend, home, BACK_MS);
          // 물고 오는 동안 공은 친구 입 근처에 붙어 온다.
          place(toy, { x: home.x + field.clientWidth * 0.06, y: home.y }, BACK_MS);
          t.after(BACK_MS, () => fetched());
        });
      });
    }

    function fetched() {
      count++;
      dots[count - 1]?.classList.add('on');
      friend.classList.remove('facing-left');
      pet.classList.add('happy');
      void say(deps, `${koreanCount(count)}!`);
      if (count >= TURNS) {
        stops.push(celebrate(screen, { big: true, mascot: toyFor(f!.kind) }));
        t.after(END_DELAY_MS, () => showPlayEnd(body, deps, f!.kind, f!.stage, start));
        return;
      }
      place(toy, toyHome(), 300);
      busy = false;
    }

    field.addEventListener('pointerdown', (e) => {
      if (busy) return;
      dragFrom = toy.contains(e.target as Node) ? local(e) : null;
      try {
        field.setPointerCapture?.((e as PointerEvent).pointerId);
      } catch {
        // 테스트(jsdom)나 오래된 브라우저
      }
    });
    field.addEventListener('pointerup', (e) => {
      if (busy || disposed) return;
      const end = local(e);
      const pad = Math.max(toy.offsetWidth / 2, 1);
      let target: Pt;
      if (dragFrom && Math.hypot(end.x - dragFrom.x, end.y - dragFrom.y) > DRAG_MIN_PX) {
        target = dragTarget(toyHome(), dragFrom, end, DRAG_SCALE);
      } else if (dragFrom) {
        // 공을 누르기만 하면 화면 위쪽 가운데로 던진다.
        target = { x: size().w / 2, y: size().h * 0.3 };
      } else {
        target = end;
      }
      dragFrom = null;
      throwTo(throwTarget(toyHome(), target, size(), pad));
    });

    void say(deps, START_LINE);
  }

  start();
  return () => {
    disposed = true;
    t.clear();
    stops.forEach((s) => s());
  };
}
