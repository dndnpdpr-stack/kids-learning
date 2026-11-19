export type FriendKind = 'dog' | 'cat' | 'chick' | 'tree';
export type Stage = 0 | 1 | 2 | 3;
/** care = 현재 단계에서 쌓인 돌봐 주기 */
export interface Friend { kind: FriendKind; stage: Stage; care: number }
export interface PetsState { spent: number; current: Friend | null; room: { kind: FriendKind }[] }

export const PETS_KEY = 'kidsgame.pets.v1';
export const CARE_STEPS = [3, 5, 7] as const;

const KINDS: readonly FriendKind[] = ['dog', 'cat', 'chick', 'tree'];

export function defaultPets(): PetsState {
  return { spent: 0, current: null, room: [] };
}

function defaultStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function resolve(storage?: Storage | null): Storage | null {
  return storage === undefined ? defaultStorage() : storage;
}

function isCount(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 0;
}

function isKind(k: unknown): k is FriendKind {
  return typeof k === 'string' && (KINDS as readonly string[]).includes(k);
}

function isFriend(v: unknown): v is Friend {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return isKind(o.kind) && isCount(o.stage) && o.stage <= 3 && isCount(o.care);
}

function isPets(v: unknown): v is PetsState {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  if (!isCount(o.spent)) return false;
  if (o.current !== null && !isFriend(o.current)) return false;
  if (!Array.isArray(o.room)) return false;
  return o.room.every((r) => typeof r === 'object' && r !== null && isKind((r as Record<string, unknown>).kind));
}

export function loadPets(storage?: Storage | null): PetsState {
  try {
    const raw = resolve(storage)?.getItem(PETS_KEY);
    if (!raw) return defaultPets();
    const parsed: unknown = JSON.parse(raw);
    return isPets(parsed) ? parsed : defaultPets();
  } catch {
    return defaultPets();
  }
}

export function savePets(p: PetsState, storage?: Storage | null): void {
  try {
    resolve(storage)?.setItem(PETS_KEY, JSON.stringify(p));
  } catch {
    // ignore storage failures
  }
}

export function starBalance(starsEarned: number, p: PetsState): number {
  return Math.max(0, starsEarned - p.spent);
}

export function startFriend(p: PetsState, kind: FriendKind): PetsState {
  return { ...p, current: { kind, stage: 0, care: 0 } };
}

export type CareResult = { pets: PetsState; ok: boolean; grew: boolean; reason?: 'no-stars' | 'no-friend' };

export function paidCare(p: PetsState, starsEarned: number, free: boolean): CareResult {
  const f = p.current;
  if (!f) return { pets: p, ok: false, grew: false, reason: 'no-friend' };
  if (f.stage === 3) return { pets: p, ok: true, grew: false };
  if (!free && starBalance(starsEarned, p) < 1) {
    return { pets: p, ok: false, grew: false, reason: 'no-stars' };
  }
  const care = f.care + 1;
  const grew = care >= CARE_STEPS[f.stage];
  const next: Friend = grew
    ? { kind: f.kind, stage: (f.stage + 1) as Stage, care: 0 }
    : { ...f, care };
  return { pets: { ...p, spent: free ? p.spent : p.spent + 1, current: next }, ok: true, grew };
}

export function moveToRoom(p: PetsState): PetsState {
  const f = p.current;
  if (!f || f.stage !== 3) return p;
  return { ...p, current: null, room: [...p.room, { kind: f.kind }] };
}

export function careProgress(f: Friend): { done: number; total: number } | null {
  if (f.stage === 3) return null;
  return { done: f.care, total: CARE_STEPS[f.stage] };
}
