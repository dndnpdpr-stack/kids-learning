import { FRIENDS, type CareKind } from '../pets/friends';
import { careProgress, moveToRoom, paidCare, starBalance, type Friend } from '../pets/state';
import { go, type Route } from '../router';
import { button, el, hasBatchim, say, shake, timers, topBar, type Cleanup, type ScreenDeps } from './dom';
import { petFx } from './petFx';

const NO_STARS = '별을 모아 오면 줄 수 있어!';
const SLEEP_LINE = '코오...';
const MOVED = '새 친구를 데려오자!';
/** 반짝이가 퍼진 뒤 새 모습으로 바꾸는 때 */
const GROW_DRAW_MS = 700;
/** 자라는 동안 유료 행동을 잠그는 시간 */
const GROW_LOCK_MS = 1000;
const CARE_ORDER: CareKind[] = ['eat', 'wash', 'play'];

function grewLine(name: string): string {
  return `와! ${name}${hasBatchim(name) ? '이' : '가'} 자랐어!`;
}

export function render(root: HTMLElement, _route: Route, deps: ScreenDeps): Cleanup {
  const start = deps.pets.current;
  if (!start) {
    go({ name: 'friendPick' });
    return () => {};
  }
  const kind = start.kind;
  const info = FRIENDS[kind];
  const t = timers();
  const current = (): Friend => deps.pets.current ?? start;
  let growLock = false;

  const stage = el('div', 'pet-stage');
  const fx = petFx(stage, t, kind, deps.rng);
  fx.draw(start.stage);

  const line = (text: string) => {
    fx.bubble(text);
    void say(deps, text);
  };

  const balance = el('div', 'stars-badge balance', [], { 'data-testid': 'balance' });
  const growth = el('div', 'growth', [], { 'data-testid': 'growth' });
  const moveSlot = el('div', 'move-slot');

  const paidBtns = CARE_ORDER.map((act) => {
    const c = info.care[act];
    return button(
      [el('span', 'act-icon', [c.icon]), el('small', 'act-label', [c.label])],
      () => paid(act),
      'act-btn',
      { 'data-care': act, 'aria-label': c.label },
    );
  });
  const petBtn = button(
    [el('span', 'act-icon', ['🖐️']), el('small', 'act-label', ['쓰다듬기'])],
    () => {
      fx.pet();
      line(info.pet.line);
    },
    'act-btn',
    { 'data-free': 'pet', 'aria-label': '쓰다듬기' },
  );
  const sleepBtn = button(
    [el('span', 'act-icon', ['😴']), el('small', 'act-label', ['잠자기'])],
    () => {
      if (fx.toggleSleep()) line(SLEEP_LINE);
    },
    'act-btn',
    { 'data-free': 'sleep', 'aria-label': '잠자기' },
  );

  const moveBtn = button(
    '🏡',
    () => {
      deps.pets = moveToRoom(deps.pets);
      deps.savePets(deps.pets);
      deps.announce = MOVED;
      go({ name: 'friendPick' });
    },
    'move-btn',
    { 'data-testid': 'move-btn', 'aria-label': '친구 방으로 이사 가요' },
  );

  const refresh = () => {
    balance.textContent = `⭐ ${starBalance(deps.progress.stars, deps.pets)}`;
    const f = current();
    const prog = careProgress(f);
    if (prog) {
      growth.replaceChildren(
        ...Array.from({ length: prog.total }, (_, i) => el('span', i < prog.done ? 'dot on' : 'dot')),
      );
    } else {
      growth.replaceChildren(el('span', 'crown', ['👑']));
    }
    // 테스트 모드나 다 자란 뒤에는 ⭐가 들지 않으므로 ⭐1 표시를 뗀다.
    const free = deps.testMode || f.stage === 3;
    paidBtns.forEach((b) => {
      b.querySelector('.star-cost')?.remove();
      if (!free) b.append(el('span', 'star-cost', ['⭐1']));
    });
    moveSlot.replaceChildren(...(f.stage === 3 ? [moveBtn] : []));
  };

  function paid(act: CareKind) {
    if (growLock) return;
    const r = paidCare(deps.pets, deps.progress.stars, deps.testMode);
    if (!r.ok) {
      if (r.reason === 'no-stars') {
        shake(balance);
        line(NO_STARS);
      }
      return;
    }
    deps.pets = r.pets;
    deps.savePets(r.pets);
    const c = info.care[act];
    if (!r.grew) {
      fx.care(act, c.icon, () => line(c.line));
      refresh();
      return;
    }
    growLock = true;
    balance.textContent = `⭐ ${starBalance(deps.progress.stars, deps.pets)}`;
    fx.care(act, c.icon, () => {});
    fx.sparkle();
    t.after(GROW_DRAW_MS, () => {
      fx.draw(current().stage);
      fx.grownPop();
      refresh();
      line(grewLine(info.name));
    });
    t.after(GROW_LOCK_MS, () => {
      growLock = false;
    });
  }

  refresh();
  root.append(
    el('section', 'screen friend', [
      topBar(
        null,
        balance,
        button('🏡', () => go({ name: 'friendRoom' }), 'icon-btn room-btn', { 'aria-label': '친구 방' }),
      ),
      el('div', 'friend-main', [
        el('div', 'pet-wrap', [stage]),
        el('div', 'friend-side', [
          el('div', 'growth-row', [growth, moveSlot]),
          el('div', 'act-row', [...paidBtns, petBtn, sleepBtn]),
        ]),
      ]),
    ]),
  );

  fx.bubble(info.hello);
  // 고르기 화면에서 넘어오면 인사가 이미 announce로 예약돼 있다.
  if (!deps.announce) void say(deps, info.hello);

  return () => t.clear();
}
