import { getWorld, type LearnItem, type WorldId } from '../content';
import { recordCorrect } from '../core/progress';
import { makeFindQuestion, makeNumberQuestion } from '../core/quiz';
import { go, type Route } from '../router';
import { CELEBRATE_BIG_MS, CELEBRATE_SMALL_MS, celebrate } from './celebrate';
import { button, el, objectJosa, say, shake, timers, topBar, type Cleanup, type ScreenDeps } from './dom';
import { COMPOSE_GROUP, composePool, findGroup } from './groupItems';
import { renderNumberQuestion } from './numbers';

export const ROUND_SIZE = 5;

type NumberKind = Parameters<typeof makeNumberQuestion>[0];
const NUMBER_KINDS: readonly string[] = ['count10', 'count20', 'compare', 'add'] satisfies NumberKind[];

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
  let replay: () => void = () => {};
  // 새 말 순서를 시작할 때마다 올린다. 끊긴 말의 .then은 값이 바뀌었으면 이어 말하지 않는다.
  let speechSeq = 0;

  const pool: LearnItem[] = groupId === COMPOSE_GROUP ? composePool() : group.items;
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
    const q = makeNumberQuestion(groupId as NumberKind, deps.rng);
    stage.replaceChildren(renderNumberQuestion(q, (choice, node) => answer(choice === q.answer, node, id)));
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

  function answer(ok: boolean, node: HTMLElement, id: number) {
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
    speechSeq++;
    deps.progress = recordCorrect(deps.progress, world, groupId);
    deps.save(deps.progress);
    node.classList.add('correct');
    dots[solved]?.classList.add('done');
    solved++;
    if (solved >= ROUND_SIZE) {
      celebrations.push(celebrate(screen, { big: true, mascot: getWorld(world).mascot }));
      void say(deps, '잘했어!');
      t.after(CELEBRATE_BIG_MS, () => go({ name: 'world', world }));
    } else {
      celebrations.push(celebrate(screen));
      void say(deps, '맞았어!');
      t.after(CELEBRATE_SMALL_MS, next);
    }
  }

  next();

  return () => {
    disposed = true;
    t.clear();
    celebrations.forEach((stop) => stop());
  };
}
