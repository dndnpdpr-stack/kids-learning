// Basic consonants (14) and vowels (10) as Hangul Compatibility Jamo,
// mapped to their Unicode 초성 / 중성 indices.
const CHO_INDEX: ReadonlyMap<string, number> = new Map([
  ['ㄱ', 0], // ㄱ
  ['ㄴ', 2], // ㄴ
  ['ㄷ', 3], // ㄷ
  ['ㄹ', 5], // ㄹ
  ['ㅁ', 6], // ㅁ
  ['ㅂ', 7], // ㅂ
  ['ㅅ', 9], // ㅅ
  ['ㅇ', 11], // ㅇ
  ['ㅈ', 12], // ㅈ
  ['ㅊ', 14], // ㅊ
  ['ㅋ', 15], // ㅋ
  ['ㅌ', 16], // ㅌ
  ['ㅍ', 17], // ㅍ
  ['ㅎ', 18], // ㅎ
]);

const JUNG_INDEX: ReadonlyMap<string, number> = new Map([
  ['ㅏ', 0], // ㅏ
  ['ㅑ', 2], // ㅑ
  ['ㅓ', 4], // ㅓ
  ['ㅕ', 6], // ㅕ
  ['ㅗ', 8], // ㅗ
  ['ㅛ', 12], // ㅛ
  ['ㅜ', 13], // ㅜ
  ['ㅠ', 17], // ㅠ
  ['ㅡ', 18], // ㅡ
  ['ㅣ', 20], // ㅣ
]);

const SYLLABLE_BASE = 0xac00;
const JUNG_COUNT = 21;
const JONG_COUNT = 28;

/**
 * Composes a basic consonant (초성) and basic vowel (중성) into one syllable.
 * Only the 14 basic consonants and 10 basic vowels are supported; anything else returns null.
 */
export function composeSyllable(cho: string, jung: string): string | null {
  const choIndex = CHO_INDEX.get(cho);
  const jungIndex = JUNG_INDEX.get(jung);
  if (choIndex === undefined || jungIndex === undefined) return null;
  return String.fromCharCode(SYLLABLE_BASE + (choIndex * JUNG_COUNT + jungIndex) * JONG_COUNT);
}

/**
 * Splits a syllable without 받침 back into [basic consonant, basic vowel] (가 → ['ㄱ','ㅏ']).
 * Returns null for anything composeSyllable could not have produced.
 */
export function decomposeSyllable(syllable: string): [string, string] | null {
  if (syllable.length !== 1) return null;
  const offset = syllable.charCodeAt(0) - SYLLABLE_BASE;
  if (offset < 0 || offset >= 19 * JUNG_COUNT * JONG_COUNT || offset % JONG_COUNT !== 0) return null;
  const choIndex = Math.floor(offset / (JUNG_COUNT * JONG_COUNT));
  const jungIndex = (offset / JONG_COUNT) % JUNG_COUNT;
  const cho = [...CHO_INDEX].find(([, i]) => i === choIndex)?.[0];
  const jung = [...JUNG_INDEX].find(([, i]) => i === jungIndex)?.[0];
  return cho && jung ? [cho, jung] : null;
}
