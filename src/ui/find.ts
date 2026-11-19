import { getWorld, type LearnItem, type WorldId } from '../content';
import { splitTen } from '../core/koreanNumber';
import { recordCorrect } from '../core/progress';
import { makeFindQuestion, makeNumberQuestion, type NumberKind, type NumberQuestion } from '../core/quiz';
import { go, type Route } from '../router';
import { CELEBRATE_BIG_MS, CELEBRATE_SMALL_MS, celebrate } from './celebrate';
import { button, el, objectJosa, say, shake, timers, topBar, type Cleanup, type ScreenDeps } from './dom';
import { findGroup } from './groupItems';
import { renderNumberQuestion } from './numbers';

export const ROUND_SIZE = 5;

const NUMBER_KINDS: readonly string[] = [
  'count5', 'count10', 'compare5', 'oneMore', 'sequence', 'add5', 'mix10', 'count20',
] satisfies NumberKind[];

/** 같은 묶음에서 이만큼 맞히면 문제가 한 단계 어려워진다 (level 1). */
const LEVEL_UP_CORRECT = 3;

export function render(root: HTMLElement, route: Route, deps: ScreenDeps): Cleanup {
  if (route.name !== 'find') return () => {};
  const world: WorldId = route.world;
  const groupId = route.group;
  const group = findGroup(world, groupId);
  if (!group) return () => {};

  const t = timers();
  const celebrations: (() => void)[] = [];
  let disposed = false;
  let locked = false;
  let solved = 0;
  let questionId = 0;
  let lastTarget: string | null = null;
  let lastNumberKind: NumberQuestion['kind'] | null = null;
  let replay: () => void = () => {};
  // 새 말 순서를 시작할 때마다 올린다. 끊긴 말의 .then은 값이 바뀌었으면 이어 말하지 않는다.
  let speechSeq = 0;

  const pool: LearnItem[] = group.items;
  const isNumberGroup = world === 'numbers' && NUMBER_KINDS.includes(groupId);

  const stage = el('div', 'find-stage');
  const dots = Array.from({ length: ROUND_SIZE }, () => el('span', 'round-dot'));
  const screen = el('section', `screen find world-${world}`, [
    topBar(world, button('🔊', () => replay(), 'icon-btn replay-btn', { 'aria-label': '다시 듣기' })),
    el('div', 'round-dots', dots),
    stage,
  ]);
  root.append(screen);

  function current(id: number) {
    return !disposed && id === questionId && !locked;
  }

  function promptLetter(item: LearnItem, id: number) {
    const seq = ++speechSeq;
    if (item.lang === 'en-US') {
      void say(deps, item.name, 'en-US').then(() => {
        if (current(id) && seq === speechSeq) void say(deps, '찾아봐!');
      });
    } else {
      void say(deps, `${objectJosa(item.name)} 찾아봐!`);
    }
  }

  function nextLetterQuestion(id: number) {
    let q = makeFindQuestion(pool, deps.rng, 3);
    for (let i = 0; i < 5 && pool.length > 1 && q.target.id === lastTarget; i++) {
      q = makeFindQuestion(pool, deps.rng, 3);
    }
    lastTarget = q.target.id;
    const choices = q.choices.map((c) => {
      const b = button(c.glyph, () => answer(c.id === q.target.id, b, id), 'choice-btn glyph-choice', {
        'data-choice': c.id,
      });
      return b;
    });
    stage.replaceChildren(el('div', 'choices', choices));
    replay = () => promptLetter(q.target, id);
    replay();
  }

  function nextNumberQuestion(id: number) {
    const kind = groupId as NumberKind;
    const level = (deps.progress.correct[`numbers/${groupId}`] ?? 0) >= LEVEL_UP_CORRECT ? 1 : 0;
    let q = makeNumberQuestion(kind, deps.rng, level);
    // mix10: 비교와 더하기를 번갈아 낸다.
    for (let i = 0; i < 10 && kind === 'mix10' && q.kind === lastNumberKind; i++) {
      q = makeNumberQuestion(kind, deps.rng, level);
    }
    lastNumberKind = q.kind;
    // 20까지 세기: 맞히면 "열셋! 열하고 셋!"처럼 10과 나머지로 나눠 말해 준다.
    const followUp = kind === 'count20' ? splitTen(q.answer) : undefined;
    stage.replaceChildren(
      renderNumberQuestion(q, (choice, node) => answer(choice === q.answer, node, id, followUp)),
    );
    replay = () => {
      speechSeq++;
      void say(deps, q.prompt);
    };
    replay();
  }

  function next() {
    locked = false;
    const id = ++questionId;
    if (isNumberGroup) nextNumberQuestion(id);
    else nextLetterQuestion(id);
  }

  /**
   * 칭찬을 말하고 ms 뒤에 then을 부른다. followUp이 있으면 칭찬 다음에 이어 말하고,
   * 그 말이 끝날 때까지도 기다려서 다음 문제 안내가 말을 끊지 않게 한다.
   */
  function praise(text: string, followUp: string | undefined, ms: number, then: () => void) {
    const seq = ++speechSeq;
    const spoken = say(deps, text);
    if (followUp === undefined) {
      t.after(ms, then);
      return;
    }
    let timeUp = false;
    let speechDone = false;
    const proceed = () => {
      if (timeUp && speechDone && !disposed) then();
    };
    t.after(ms, () => {
      timeUp = true;
      proceed();
    });
    void spoken
      .then(() => (!disposed && seq === speechSeq ? say(deps, followUp) : undefined))
      .then(() => {
        speechDone = true;
        proceed();
      });
  }

  function answer(ok: boolean, node: HTMLElement, id: number, followUp?: string) {
    if (!current(id)) return;
    if (!ok) {
      shake(node);
      const seq = ++speechSeq;
      void say(deps, '다시 들어볼까?').then(() => {
        if (current(id) && seq === speechSeq) replay();
      });
      return;
    }
    locked = true;
    deps.progress = recordCorrect(deps.progress, world, groupId);
    deps.save(deps.progress);
    node.classList.add('correct');
    dots[solved]?.classList.add('done');
    solved++;
    if (solved >= ROUND_SIZE) {
      celebrations.push(celebrate(screen, { big: true, mascot: getWorld(world).mascot }));
      praise('잘했어!', followUp, CELEBRATE_BIG_MS, () => go({ name: 'world', world }));
    } else {
      celebrations.push(celebrate(screen));
      praise('맞았어!', followUp, CELEBRATE_SMALL_MS, next);
    }
  }

  next();

  return () => {
    disposed = true;
    t.clear();
    celebrations.forEach((stop) => stop());
  };
}
