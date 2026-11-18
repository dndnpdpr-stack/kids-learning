import { describe, expect, it } from 'vitest';
import { loadChildName, normalizeName, PROFILE_KEY, saveChildName } from '../../src/core/profile';

function memStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, String(v)),
  };
}

const throwing = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
} as unknown as Storage;

describe('normalizeName', () => {
  it('trims and collapses spaces', () => {
    expect(normalizeName('  하  늘 ')).toBe('하 늘');
  });
  it('returns null for empty', () => {
    expect(normalizeName('   ')).toBeNull();
  });
  it('cuts to 10 characters', () => {
    expect(normalizeName('가나다라마바사아자차카')).toBe('가나다라마바사아자차');
  });
});

describe('child name storage', () => {
  it('is null when nothing saved', () => {
    expect(loadChildName(memStorage())).toBeNull();
  });
  it('round-trips under its own key', () => {
    const s = memStorage();
    saveChildName(' 하늘 ', s);
    expect(s.getItem(PROFILE_KEY)).not.toBeNull();
    expect(loadChildName(s)).toBe('하늘');
  });
  it('ignores corrupt JSON', () => {
    const s = memStorage();
    s.setItem(PROFILE_KEY, '{oops');
    expect(loadChildName(s)).toBeNull();
  });
  it('never throws when storage is blocked or missing', () => {
    expect(loadChildName(throwing)).toBeNull();
    expect(() => saveChildName('하늘', throwing)).not.toThrow();
    expect(loadChildName(null)).toBeNull();
  });
});
