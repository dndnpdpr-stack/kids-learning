import type { WorldId } from '../content';
import { makeCareQuiz } from '../pets/careQuiz';
import { FRIENDS, type CareKind } from '../pets/friends';
import { careProgress, moveToRoom, paidCare, starBalance, type CareResult, type Friend } from '../pets/state';
import { go, type Route } from '../router';
import { button, el, hasBatchim, say, shake, timers, topBar, type Cleanup, type ScreenDeps } from './dom';
import { openCareQuiz } from './careQuiz';
import { petFx } from './petFx';

const SLEEP_LINE = '코오...';
const MOVED = '새 친구를 데려오자!';
/** 반짝이가 퍼진 뒤 새 모습으로 바꾸는 때 */
const GROW_DRAW_MS = 700;
/** 자라는 연출(반짝이 → 새 모습 → 기뻐하기)이 끝날 때까지 */
const GROW_LOCK_MS = 2600;
/** 동작 하나가 끝날 때까지 다른 버튼을 잠그는 시간 (petFx 연출 길이와 맞춘다) */
const ACTION_MS = { eat: 3100, wash: 3100, play: 1700, pet: 2000, sleep: 1000 } as const;
const CARE_ORDER: CareKind[] = ['eat', 'wash', 'play'];

function grewLine(name: string): string {
  return `와! ${name}${hasBatchim(name) ? '이' : '가'} 자랐어!`;
}

export function render(root: HTMLElement, _route: Route, deps: ScreenDeps): Cleanup {
  const start = deps.pets.current;
  if (!start) {
    go({ name: 'friendPick' }, { replace: true });
    return () => {};
  }
  const kind = start.kind;
  const info = FRIENDS[kind];
  const t = timers();
  const current = (): Friend => deps.pets.current ?? start;
  let busy = false;
  /** 떠 있는 퀴즈 창을 조용히 치우는 함수 (없으면 null). */
  let closeQuiz: (() => void) | null = null;
  let lastQuizWorld: WorldId | null = null;

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

  const actRow = el('div', 'act-row');
  /** 한 번에 한 동작만: 연출이 끝날 때까지 모든 행동 버튼을 잠그고 흐리게 보여 준다. */
  const lock = (ms: number) => {
    busy = true;
    actRow.classList.add('busy');
    t.after(ms, () => {
      busy = false;
      actRow.classList.remove('busy');
    });
  };
  const actionMs = (act: CareKind) => (act === 'wash' && kind === 'tree' ? 1900 : ACTION_MS[act]);

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
      if (busy) return;
      lock(ACTION_MS.pet);
      fx.pet();
      line(info.pet.line);
    },
    'act-btn',
    { 'data-free': 'pet', 'aria-label': '쓰다듬기' },
  );
  const sleepBtn = button(
    [el('span', 'act-icon', ['😴']), el('small', 'act-label', ['잠자기'])],
    () => {
      if (busy) return;
      lock(ACTION_MS.sleep);
      if (fx.toggleSleep()) line(SLEEP_LINE);
    },
    'act-btn',
    { 'data-free': 'sleep', 'aria-label': '잠자기' },
  );

  const moveBtn = button(
    '🚚',
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
    if (busy) return;
    const r = paidCare(deps.pets, deps.progress.stars, deps.testMode);
    if (r.ok) {
      care(act, r);
    } else if (r.reason === 'no-stars') {
      shake(balance);
      askQuiz(act);
    }
  }

  /** ⭐가 없으면 배운 것에서 한 문제: 맞히면 ⭐ 없이 그 돌봐주기를 한 번 한다 (성장에도 쳐준다). */
  function askQuiz(act: CareKind) {
    busy = true;
    actRow.classList.add('busy');
    const unlock = () => {
      closeQuiz = null;
      busy = false;
      actRow.classList.remove('busy');
    };
    const quiz = makeCareQuiz(deps.progress, deps.rng, lastQuizWorld);
    lastQuizWorld = quiz.world;
    closeQuiz = openCareQuiz(screen, deps, quiz, {
      face: info.icon,
      onSolved: () => {
        unlock();
        const r = paidCare(deps.pets, deps.progress.stars, true);
        if (r.ok) care(act, r);
      },
      onClose: unlock,
    });
  }

  function care(act: CareKind, r: CareResult) {
    deps.pets = r.pets;
    deps.savePets(r.pets);
    const c = info.care[act];
    if (!r.grew) {
      lock(actionMs(act));
      fx.care(act, c.icon, () => line(c.line));
      refresh();
      return;
    }
    lock(Math.max(actionMs(act), GROW_LOCK_MS));
    balance.textContent = `⭐ ${starBalance(deps.progress.stars, deps.pets)}`;
    fx.care(act, c.icon, () => {});
    fx.sparkle();
    t.after(GROW_DRAW_MS, () => {
      fx.draw(current().stage);
      fx.grownPop();
      refresh();
      line(grewLine(info.name));
    });
  }

  refresh();
  const screen = el('section', 'screen friend', [
    topBar(
      null,
      balance,
      button('🧸', () => go({ name: 'friendRoom' }), 'icon-btn room-btn', {
        'data-testid': 'room-btn',
        'aria-label': '친구 방',
      }),
    ),
    el('div', 'friend-main', [
      el('div', 'pet-wrap', [stage]),
      el('div', 'friend-side', [
        el('div', 'growth-row', [growth, moveSlot]),
        (actRow.append(...paidBtns, petBtn, sleepBtn), actRow),
      ]),
    ]),
  ]);
  root.append(screen);

  fx.bubble(info.hello);
  // 고르기 화면에서 넘어오면 인사가 이미 announce로 예약돼 있다.
  if (!deps.announce) void say(deps, info.hello);

  return () => {
    closeQuiz?.();
    t.clear();
  };
}
