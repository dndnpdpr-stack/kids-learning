import type { Group, LearnItem, World } from './types';

type Row = [glyph: string, name: string, word: string, emoji: string];

const item = ([glyph, name, word, emoji]: Row): LearnItem => ({
  id: `hangul-${glyph}`,
  glyph,
  name,
  word,
  emoji,
  lang: 'ko-KR',
});

const group = (id: string, rows: Row[]): Group => ({ id, items: rows.map(item) });

export const hangul: World = {
  id: 'hangul',
  title: '한글',
  mascot: '🐻',
  groups: [
    group('c1', [
      ['ㄱ', '기역', '기차', '🚂'],
      ['ㄴ', '니은', '나비', '🦋'],
      ['ㄷ', '디귿', '다리', '🌉'],
      ['ㄹ', '리을', '라면', '🍜'],
    ]),
    group('c2', [
      ['ㅁ', '미음', '모자', '👒'],
      ['ㅂ', '비읍', '바나나', '🍌'],
      ['ㅅ', '시옷', '사과', '🍎'],
      ['ㅇ', '이응', '우산', '☂️'],
    ]),
    group('c3', [
      ['ㅈ', '지읒', '조개', '🐚'],
      ['ㅊ', '치읓', '치즈', '🧀'],
      ['ㅋ', '키읔', '코끼리', '🐘'],
    ]),
    group('c4', [
      ['ㅌ', '티읕', '토끼', '🐰'],
      ['ㅍ', '피읖', '펭귄', '🐧'],
      ['ㅎ', '히읗', '하마', '🦛'],
    ]),
    group('v1', [
      ['ㅏ', '아', '아기', '👶'],
      ['ㅑ', '야', '야구', '⚾'],
      ['ㅓ', '어', '어묵', '🍢'],
      ['ㅕ', '여', '여우', '🦊'],
    ]),
    group('v2', [
      ['ㅗ', '오', '오이', '🥒'],
      ['ㅛ', '요', '요요', '🪀'],
      ['ㅜ', '우', '우유', '🥛'],
    ]),
    group('v3', [
      ['ㅠ', '유', '유령', '👻'],
      ['ㅡ', '으', '으르렁', '🐯'],
      ['ㅣ', '이', '이빨', '🦷'],
    ]),
    { id: 'compose', items: [] },
  ],
};
