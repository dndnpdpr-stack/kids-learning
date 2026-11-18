import { describe, expect, it } from 'vitest';
import { loadTestMode, saveTestMode, SETTINGS_KEY } from '../../src/core/settings';

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

describe('test mode setting', () => {
  it('is off by default', () => {
    expect(loadTestMode(memStorage())).toBe(false);
  });
  it('round-trips under its own key', () => {
    const s = memStorage();
    saveTestMode(true, s);
    expect(s.getItem(SETTINGS_KEY)).not.toBeNull();
    expect(loadTestMode(s)).toBe(true);
    saveTestMode(false, s);
    expect(loadTestMode(s)).toBe(false);
  });
  it('treats corrupt or blocked storage as off without throwing', () => {
    const s = memStorage();
    s.setItem(SETTINGS_KEY, '{oops');
    expect(loadTestMode(s)).toBe(false);
    const blocked = {
      getItem: () => {
        throw new Error('x');
      },
      setItem: () => {
        throw new Error('x');
      },
    } as unknown as Storage;
    expect(loadTestMode(blocked)).toBe(false);
    expect(() => saveTestMode(true, blocked)).not.toThrow();
  });
});
