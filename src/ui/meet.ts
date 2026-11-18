import type { LearnItem, WorldId } from '../content';
import { composeSyllable } from '../core/hangulCompose';
import type { Rng } from '../core/rng';
import type { Route } from '../router';
import { button, el, say, timers, topBar, type Cleanup, type ScreenDeps } from './dom';
import { COMPOSE_GROUP, findGroup, hangulConsonants, hangulVowels } from './groupItems';
import { emojiGroup } from './numbers';

const MERGE_MS = 800;

function pick<T>(items: T[], rng: Rng): T {
  return items[Math.floor(rng() * items.length)];
}

export function render(root: HTMLElement, route: Route, deps: ScreenDeps): Cleanup {
  if (route.name !== 'meet') return () => {};
  const world: WorldId = route.world;
  const group = findGroup(world, route.group);
  if (!group) return () => {};

  const t = timers();
  const spotlight = el('div', 'spotlight');
  const body = el('div', 'meet-body', [spotlight]);
  root.append(el('section', `screen meet world-${world}`, [topBar(world), body]));

  if (group.id === COMPOSE_GROUP) {
    renderCompose();
  } else {
    renderItems(group.items);
  }

  function renderItems(items: LearnItem[]) {
    const tiles = items.map((item) =>
      button(item.glyph, () => show(item), 'item-tile', { 'data-item': item.id }),
    );
    body.append(el('div', 'item-grid', tiles));

    function show(item: LearnItem) {
      tiles.forEach((tile) => tile.classList.toggle('selected', tile.dataset.item === item.id));
      const picture =
        world === 'numbers' ? emojiGroup(item.emoji, Number(item.glyph)) : el('div', 'big-emoji', [item.emoji]);
      spotlight.replaceChildren(el('div', 'big-glyph pop', [item.glyph]), picture);
      void say(deps, world === 'numbers' ? `${item.name}!` : `${item.name}, ${item.word}!`, item.lang);
    }

    if (items[0]) show(items[0]);
  }

  function renderCompose() {
    const consonants = hangulConsonants();
    const vowels = hangulVowels();
    body.append(button('▶', nextSyllable, 'next-btn', { 'aria-label': '다음' }));

    function nextSyllable() {
      t.clear();
      const c = pick(consonants, deps.rng);
      const v = pick(vowels, deps.rng);
      const syllable = composeSyllable(c.glyph, v.glyph) ?? '';
      const row = el('div', 'compose-row', [
        el('span', 'jamo jamo-left', [c.glyph]),
        el('span', 'jamo jamo-right', [v.glyph]),
      ]);
      spotlight.replaceChildren(row);
      t.after(MERGE_MS, () => {
        spotlight.replaceChildren(el('div', 'big-glyph pop', [syllable]));
        void say(deps, syllable);
      });
    }

    nextSyllable();
  }

  return () => t.clear();
}
