import type { LearnItem, WorldId } from '../content';
import { decomposeSyllable } from '../core/hangulCompose';
import type { Route } from '../router';
import { button, el, say, timers, topBar, type Cleanup, type ScreenDeps } from './dom';
import { findGroup } from './groupItems';
import { emojiGroup } from './numbers';

const MERGE_MS = 800;

export function render(root: HTMLElement, route: Route, deps: ScreenDeps): Cleanup {
  if (route.name !== 'meet') return () => {};
  const world: WorldId = route.world;
  const group = findGroup(world, route.group);
  if (!group) return () => {};

  const t = timers();
  const spotlight = el('div', 'spotlight');
  const body = el('div', 'meet-body', [spotlight]);
  root.append(el('section', `screen meet world-${world}`, [topBar(world), body]));

  renderItems(group.items);

  function renderItems(items: LearnItem[]) {
    const tiles = items.map((item) =>
      button(item.glyph, () => show(item), 'item-tile', { 'data-item': item.id }),
    );
    // 스크롤 없이 한 화면에 들어가도록 거의 정사각형 격자로 배치한다 (10개 → 4×3).
    const cols = Math.max(1, Math.ceil(Math.sqrt(items.length)));
    const rows = Math.max(1, Math.ceil(items.length / cols));
    body.append(el('div', 'item-grid', tiles, { style: `--cols:${cols};--rows:${rows}` }));

    function show(item: LearnItem) {
      t.clear();
      tiles.forEach((tile) => tile.classList.toggle('selected', tile.dataset.item === item.id));
      const picture =
        world === 'numbers' ? emojiGroup(item.emoji, Number(item.glyph)) : el('div', 'big-emoji', [item.emoji]);
      const reveal = () => {
        spotlight.replaceChildren(el('div', 'big-glyph pop', [item.glyph]), picture);
        void say(deps, world === 'numbers' ? `${item.name}!` : `${item.name}, ${item.word}!`, item.lang);
      };
      // 가~하 글자: 자음과 모음이 양쪽에서 와서 합쳐진 뒤 글자가 나온다 (ㄴ + ㅏ → 나).
      const jamo = decomposeSyllable(item.glyph);
      if (!jamo) return reveal();
      spotlight.replaceChildren(
        el('div', 'compose-row', [
          el('span', 'jamo jamo-left', [jamo[0]]),
          el('span', 'jamo jamo-right', [jamo[1]]),
        ]),
      );
      t.after(MERGE_MS, reveal);
    }

    if (items[0]) show(items[0]);
  }

  return () => t.clear();
}
