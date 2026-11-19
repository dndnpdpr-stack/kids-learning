import { describe, it, expect } from 'vitest';
import {
  PETS_KEY, CARE_STEPS, defaultPets, loadPets, savePets, starBalance,
  startFriend, paidCare, moveToRoom, careProgress,
  type PetsState,
} from '../../src/pets/state';

function memStorage(init: Record<string, string> = {}): Storage {
  const m = new Map(Object.entries(init));
  return {
    get length() { return m.size; },
    clear: () => m.clear(),
    getItem: (k: string) => m.get(k) ?? null,
    key: (i: number) => [...m.keys()][i] ?? null,
    removeItem: (k: string) => { m.delete(k); },
    setItem: (k: string, v: string) => { m.set(k, v); },
  };
}

function grown(times: number, stars = 100, free = false): PetsState {
  let p = startFriend(defaultPets(), 'dog');
  for (let i = 0; i < times; i++) p = paidCare(p, stars, free).pets;
  return p;
}

describe('pets state', () => {
  it('has defaults', () => {
    expect(defaultPets()).toEqual({ spent: 0, current: null, room: [] });
    expect(PETS_KEY).toBe('kidsgame.pets.v1');
    expect(CARE_STEPS).toEqual([3, 5, 7]);
  });

  it('round-trips through storage', () => {
    const s = memStorage();
    const p: PetsState = { spent: 4, current: { kind: 'cat', stage: 1, care: 2 }, room: [{ kind: 'dog' }] };
    savePets(p, s);
    expect(loadPets(s)).toEqual(p);
  });

  it('falls back to defaults on broken or invalid data', () => {
    const bad = [
      '{not json',
      JSON.stringify({ spent: -1, current: null, room: [] }),
      JSON.stringify({ spent: 1.5, current: null, room: [] }),
      JSON.stringify({ spent: 0, current: { kind: 'cow', stage: 0, care: 0 }, room: [] }),
      JSON.stringify({ spent: 0, current: { kind: 'dog', stage: 4, care: 0 }, room: [] }),
      JSON.stringify({ spent: 0, current: { kind: 'dog', stage: 0, care: -1 }, room: [] }),
      JSON.stringify({ spent: 0, current: null, room: 'x' }),
      JSON.stringify({ spent: 0, current: null, room: [{ kind: 'cow' }] }),
      'null',
    ];
    for (const raw of bad) {
      expect(loadPets(memStorage({ [PETS_KEY]: raw }))).toEqual(defaultPets());
    }
  });

  it('never throws when storage throws', () => {
    const boom = {
      getItem() { throw new Error('x'); },
      setItem() { throw new Error('x'); },
    } as unknown as Storage;
    expect(loadPets(boom)).toEqual(defaultPets());
    expect(() => savePets(defaultPets(), boom)).not.toThrow();
    expect(loadPets(null)).toEqual(defaultPets());
  });

  it('starBalance never goes negative', () => {
    expect(starBalance(5, { ...defaultPets(), spent: 7 })).toBe(0);
    expect(starBalance(9, { ...defaultPets(), spent: 4 })).toBe(5);
  });

  it('paidCare without stars is a no-op', () => {
    const p = startFriend(defaultPets(), 'dog');
    const r = paidCare(p, 0, false);
    expect(r).toMatchObject({ ok: false, reason: 'no-stars' });
    expect(r.pets).toEqual(p);
  });

  it('paidCare without friend', () => {
    const r = paidCare(defaultPets(), 5, false);
    expect(r).toMatchObject({ ok: false, reason: 'no-friend' });
  });

  it('grows 0 -> 1 on the third care', () => {
    let p = startFriend(defaultPets(), 'dog');
    const grews: boolean[] = [];
    for (let i = 0; i < 3; i++) {
      const r = paidCare(p, 10, false);
      expect(r.ok).toBe(true);
      grews.push(r.grew);
      p = r.pets;
    }
    expect(grews).toEqual([false, false, true]);
    expect(p.current).toEqual({ kind: 'dog', stage: 1, care: 0 });
    expect(p.spent).toBe(3);
  });

  it('free care does not spend stars, even with zero balance', () => {
    const r = paidCare(startFriend(defaultPets(), 'dog'), 0, true);
    expect(r.ok).toBe(true);
    expect(r.pets.spent).toBe(0);
    expect(r.pets.current?.care).toBe(1);
  });

  it('reaches stage 3 after 15 cares then stops spending', () => {
    const p = grown(15);
    expect(p.current?.stage).toBe(3);
    expect(p.spent).toBe(15);
    const r = paidCare(p, 100, false);
    expect(r.ok).toBe(true);
    expect(r.grew).toBe(false);
    expect(r.pets.spent).toBe(15);
    expect(r.pets.current).toEqual(p.current);
  });

  it('moveToRoom only at stage 3', () => {
    const done = moveToRoom(grown(15));
    expect(done.room).toEqual([{ kind: 'dog' }]);
    expect(done.current).toBeNull();
    const mid = grown(8);
    expect(moveToRoom(mid)).toEqual(mid);
  });

  it('careProgress', () => {
    expect(careProgress({ kind: 'dog', stage: 1, care: 2 })).toEqual({ done: 2, total: 5 });
    expect(careProgress({ kind: 'dog', stage: 3, care: 0 })).toBeNull();
  });
});
