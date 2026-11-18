import { getWorld, type Group, type WorldId } from '../content';
import { isGroupUnlocked } from '../core/progress';
import { go, type Activity, type Route } from '../router';
import { button, el, say, topBar, type Cleanup, type ScreenDeps } from './dom';
import { cardLabel, hasMeet, traceItems } from './groupItems';

const ACTIVITY_ICON: Record<Activity, string> = { meet: '👀', find: '🔍', trace: '✏️' };

function activitiesFor(group: Group): Activity[] {
  const list: Activity[] = [];
  if (hasMeet(group)) list.push('meet');
  list.push('find');
  if (traceItems(group).length > 0) list.push('trace');
  return list;
}

export function render(root: HTMLElement, route: Route, deps: ScreenDeps): Cleanup {
  if (route.name !== 'world') return () => {};
  const worldId: WorldId = route.world;
  const world = getWorld(worldId);

  const panel = el('div', 'activity-panel');
  panel.hidden = true;

  const cards = world.groups.map((group, index) => {
    const unlocked = isGroupUnlocked(deps.progress, world, index);
    const card = button(
      [
        el('span', 'card-glyph', [cardLabel(group)]),
        ...(unlocked ? [] : [el('span', 'card-lock', ['🔒'])]),
      ],
      () => {
        if (!unlocked) {
          void say(deps, '조금 더 하면 열려!');
          return;
        }
        cards.forEach((c) => c.classList.toggle('selected', c === card));
        showActivities(group);
      },
      `group-card${unlocked ? '' : ' locked'}`,
      { 'data-group': group.id, 'data-locked': String(!unlocked) },
    );
    return card;
  });

  function showActivities(group: Group) {
    panel.replaceChildren(
      ...activitiesFor(group).map((a) =>
        button(ACTIVITY_ICON[a], () => go({ name: a, world: worldId, group: group.id }), 'activity-btn', {
          'data-activity': a,
        }),
      ),
    );
    panel.hidden = false;
  }

  root.append(
    el('section', `screen world world-${worldId}`, [
      topBar(null, el('span', 'world-mascot', [world.mascot])),
      el('div', 'group-grid', cards),
      panel,
    ]),
  );

  return () => {};
}
