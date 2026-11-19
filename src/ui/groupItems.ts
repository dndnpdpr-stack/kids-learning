import { getWorld, type Group, type LearnItem, type WorldId } from '../content';
import { getStrokes } from '../core/trace';

export function findGroup(world: WorldId, groupId: string): Group | undefined {
  return getWorld(world).groups.find((g) => g.id === groupId);
}

/** 따라 쓰기 할 수 있는(획 데이터가 있는) 항목. */
export function traceItems(group: Group): LearnItem[] {
  return group.items.filter((i) => getStrokes(i.glyph).length > 0);
}

export function hasMeet(group: Group): boolean {
  return group.items.length > 0;
}

const NUMBER_CARD: Record<string, string> = {
  compare5: '⚖️',
  oneMore: '➕1',
  sequence: '1 2 ?',
  add5: '➕',
  mix10: '🔟',
  count20: '🍓🍓',
};

/** 세계 화면 카드에 보여 줄 짧은 그림. */
export function cardLabel(group: Group): string {
  if (group.items.length === 0) return NUMBER_CARD[group.id] ?? '⭐';
  return group.items
    .slice(0, 3)
    .map((i) => i.glyph)
    .join(' ');
}
