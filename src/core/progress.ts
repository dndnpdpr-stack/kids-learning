import type { World, WorldId } from '../content';

export interface Progress {
  stars: number;
  /** key = `${worldId}/${groupId}` */
  correct: Record<string, number>;
  volume: number;
}

export const STORAGE_KEY = 'kidsgame.progress.v1';
export const UNLOCK_THRESHOLD = 3;

function defaults(): Progress {
  return { stars: 0, correct: {}, volume: 1 };
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

function isProgress(v: unknown): v is Progress {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  if (typeof o.stars !== 'number' || !Number.isFinite(o.stars)) return false;
  if (typeof o.volume !== 'number' || !(o.volume >= 0 && o.volume <= 1)) return false;
  const c = o.correct;
  if (typeof c !== 'object' || c === null || Array.isArray(c)) return false;
  return Object.values(c).every((n) => typeof n === 'number' && Number.isFinite(n));
}

export function loadProgress(storage?: Storage | null): Progress {
  try {
    const raw = resolve(storage)?.getItem(STORAGE_KEY);
    if (!raw) return defaults();
    const parsed: unknown = JSON.parse(raw);
    return isProgress(parsed) ? parsed : defaults();
  } catch {
    return defaults();
  }
}

export function saveProgress(p: Progress, storage?: Storage | null): void {
  try {
    resolve(storage)?.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    // ignore storage failures
  }
}

export function recordCorrect(p: Progress, worldId: WorldId, groupId: string): Progress {
  const key = `${worldId}/${groupId}`;
  return {
    ...p,
    stars: p.stars + 1,
    correct: { ...p.correct, [key]: (p.correct[key] ?? 0) + 1 },
  };
}

export function isGroupUnlocked(p: Progress, world: World, groupIndex: number): boolean {
  if (groupIndex === 0) return true;
  const prev = world.groups[groupIndex - 1];
  if (!prev) return false;
  return (p.correct[`${world.id}/${prev.id}`] ?? 0) >= UNLOCK_THRESHOLD;
}

export function resetProgress(storage?: Storage | null): Progress {
  try {
    resolve(storage)?.removeItem(STORAGE_KEY);
  } catch {
    // ignore storage failures
  }
  return defaults();
}
