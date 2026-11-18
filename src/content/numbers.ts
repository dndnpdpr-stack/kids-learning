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
    { id: 'count10', items },
    { id: 'count20', items: [] },
    { id: 'compare', items: [] },
    { id: 'add', items: [] },
  ],
};
