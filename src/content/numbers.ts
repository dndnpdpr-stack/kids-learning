import { koreanCount } from '../core/koreanNumber';
import type { LearnItem, World } from './types';

function numberItem(n: number): LearnItem {
  const name = koreanCount(n);
  return { id: `num-${n}`, glyph: String(n), name, word: `사과 ${name}`, emoji: '🍎', lang: 'ko-KR' };
}

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => numberItem(from + i));

export const numbers: World = {
  id: 'numbers',
  title: '숫자',
  mascot: '🐰',
  groups: [
    // 잘게 나눈 순서 (= 잠금 해제 순서). docs/superpowers/specs/2026-11-19-numbers-curriculum-design.md
    { id: 'count5', items: range(1, 5) },
    { id: 'count10', items: range(6, 10) },
    { id: 'compare5', items: [] },
    { id: 'oneMore', items: [] },
    { id: 'sequence', items: [] },
    { id: 'add5', items: [] },
    { id: 'mix10', items: [] },
    { id: 'count20', items: [] },
  ],
};
