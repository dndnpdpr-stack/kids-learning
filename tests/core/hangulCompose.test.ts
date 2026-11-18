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
