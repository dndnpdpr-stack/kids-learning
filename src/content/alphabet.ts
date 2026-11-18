import type { Group, LearnItem, World } from './types';

type Row = [letter: string, word: string, emoji: string];

const item = ([letter, word, emoji]: Row): LearnItem => ({
  id: `abc-${letter}`,
  glyph: letter,
  name: letter,
  word,
  emoji,
  lang: 'en-US',
});

const rows: Row[] = [
  ['A', 'apple', '🍎'], ['B', 'ball', '⚽'], ['C', 'cat', '🐱'], ['D', 'dog', '🐶'],
  ['E', 'egg', '🥚'], ['F', 'fish', '🐟'], ['G', 'grape', '🍇'], ['H', 'hat', '🎩'],
  ['I', 'ice cream', '🍦'], ['J', 'juice', '🧃'], ['K', 'kite', '🪁'], ['L', 'lion', '🦁'],
  ['M', 'moon', '🌙'], ['N', 'nose', '👃'], ['O', 'orange', '🍊'], ['P', 'pig', '🐷'],
  ['Q', 'queen', '👸'], ['R', 'rabbit', '🐰'], ['S', 'sun', '☀️'], ['T', 'tree', '🌳'],
  ['U', 'umbrella', '☂️'], ['V', 'violin', '🎻'], ['W', 'watch', '⌚'], ['X', 'xylophone', '🎼'],
  ['Y', 'yo-yo', '🪀'], ['Z', 'zebra', '🦓'],
];

// 26 letters in groups of 5,5,4,4,4,4
const sizes = [5, 5, 4, 4, 4, 4];

const groups: Group[] = [];
let start = 0;
sizes.forEach((n, idx) => {
  groups.push({ id: `abc${idx + 1}`, items: rows.slice(start, start + n).map(item) });
  start += n;
});

export const alphabet: World = { id: 'abc', title: 'ABC', mascot: '🦊', groups };
