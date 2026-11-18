import { getWorld, type Group, type LearnItem, type WorldId } from '../content';
import { composeSyllable } from '../core/hangulCompose';
import { getStrokes } from '../core/trace';

export const COMPOSE_GROUP = 'compose';

export function findGroup(world: WorldId, groupId: string): Group | undefined {
  return getWorld(world).groups.find((g) => g.id === groupId);
}

const hangulItems = () => getWorld('hangul').groups.flatMap((g) => g.items);
const isVowel = (i: LearnItem) => i.glyph >= 'ㅏ' && i.glyph <= 'ㅣ';

export function hangulConsonants(): LearnItem[] {
  return hangulItems().filter((i) => !isVowel(i));
}

export function hangulVowels(): LearnItem[] {
  return hangulItems().filter(isVowel);
}

function syllableItem(s: string): LearnItem {
  return { id: `syl-${s}`, glyph: s, name: s, word: s, emoji: '🔤', lang: 'ko-KR' };
}

/** 기본 자음 × 기본 모음으로 만든 음절 전부(찾기용). */
export function composePool(): LearnItem[] {
  const out: LearnItem[] = [];
  for (const c of hangulConsonants()) {
    for (const v of hangulVowels()) {
      const s = composeSyllable(c.glyph, v.glyph);
      if (s) out.push(syllableItem(s));
    }
  }
  return out;
}

/** 따라 쓰기 할 수 있는(획 데이터가 있는) 항목. */
export function traceItems(group: Group): LearnItem[] {
  return group.items.filter((i) => getStrokes(i.glyph).length > 0);
}

export function hasMeet(group: Group): boolean {
  return group.items.length > 0 || group.id === COMPOSE_GROUP;
}

const NUMBER_CARD: Record<string, string> = { count20: '🍓🍓', compare: '⚖️', add: '➕' };

/** 세계 화면 카드에 보여 줄 짧은 그림. */
export function cardLabel(group: Group): string {
  if (group.id === COMPOSE_GROUP) return '가';
  if (group.items.length === 0) return NUMBER_CARD[group.id] ?? '⭐';
  return group.items
    .slice(0, 3)
    .map((i) => i.glyph)
    .join(' ');
}
