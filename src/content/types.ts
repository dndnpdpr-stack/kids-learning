export type WorldId = 'hangul' | 'numbers' | 'abc';

export interface LearnItem {
  id: string;
  glyph: string;
  name: string;
  word: string;
  emoji: string;
  lang: 'ko-KR' | 'en-US';
}

export interface Group {
  id: string;
  items: LearnItem[];
}

export interface World {
  id: WorldId;
  title: string;
  mascot: string;
  groups: Group[];
}
