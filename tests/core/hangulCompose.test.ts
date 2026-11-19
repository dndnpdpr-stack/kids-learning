import { describe, expect, it } from 'vitest';
import { composeSyllable } from '../../src/core/hangulCompose';

describe('composeSyllable', () => {
  it('composes basic consonant + basic vowel into a syllable', () => {
    expect(composeSyllable('ㄱ', 'ㅏ')).toBe('가');
    expect(composeSyllable('ㄴ', 'ㅓ')).toBe('너');
    expect(composeSyllable('ㅎ', 'ㅣ')).toBe('히');
    expect(composeSyllable('ㅇ', 'ㅠ')).toBe('유');
  });

  it('returns null for non-basic consonants or vowels', () => {
    expect(composeSyllable('ㄲ', 'ㅏ')).toBeNull();
    expect(composeSyllable('ㄱ', 'ㄴ')).toBeNull();
  });

  it('returns null for non-jamo input', () => {
    expect(composeSyllable('a', 'ㅏ')).toBeNull();
  });
});

import { decomposeSyllable } from '../../src/core/hangulCompose';

describe('decomposeSyllable', () => {
  it('splits a no-batchim syllable into basic consonant + vowel', () => {
    expect(decomposeSyllable('가')).toEqual(['ㄱ', 'ㅏ']);
    expect(decomposeSyllable('나')).toEqual(['ㄴ', 'ㅏ']);
    expect(decomposeSyllable('히')).toEqual(['ㅎ', 'ㅣ']);
    expect(decomposeSyllable('유')).toEqual(['ㅇ', 'ㅠ']);
  });
  it('returns null for jamo, batchim syllables, double consonants, latin', () => {
    expect(decomposeSyllable('ㄱ')).toBeNull();
    expect(decomposeSyllable('각')).toBeNull();
    expect(decomposeSyllable('까')).toBeNull();
    expect(decomposeSyllable('A')).toBeNull();
  });
});
