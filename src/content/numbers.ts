import type { LearnItem, World } from './types';

const readings = ['하나', '둘', '셋', '넷', '다섯', '여섯', '일곱', '여덟', '아홉', '열'];

const items: LearnItem[] = readings.map((name, i) => ({
  id: `num-${i + 1}`,
  glyph: String(i + 1),
  name,
  word: `사과 ${name}`,
  emoji: '🍎',
  lang: 'ko-KR',
}));

export const numbers: World = {
  id: 'numbers',
  title: '숫자',
  mascot: '🐰',
  groups: [
    // 쉬운 것부터: 1~10 세기 → 1~10 비교 → 합이 10 이하인 더하기 → 11~20 세기
    { id: 'count10', items },
    { id: 'compare', items: [] },
    { id: 'add', items: [] },
    { id: 'count20', items: [] },
  ],
};
