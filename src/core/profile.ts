/** 아이 이름. 기기(localStorage)에만 저장하고 밖으로 보내지 않는다. */
export const PROFILE_KEY = 'kidsgame.profile.v1';
export const NAME_MAX = 10;

function resolve(storage?: Storage | null): Storage | null {
  if (storage !== undefined) return storage;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** 앞뒤 공백 제거, 연속 공백 하나로, 최대 NAME_MAX 글자. 비면 null. */
export function normalizeName(raw: string): string | null {
  const s = Array.from(raw.trim().replace(/\s+/g, ' ')).slice(0, NAME_MAX).join('').trim();
  return s ? s : null;
}

export function loadChildName(storage?: Storage | null): string | null {
  try {
    const raw = resolve(storage)?.getItem(PROFILE_KEY);
    if (!raw) return null;
    const v: unknown = JSON.parse(raw);
    if (typeof v !== 'object' || v === null) return null;
    const name = (v as { name?: unknown }).name;
    return typeof name === 'string' ? normalizeName(name) : null;
  } catch {
    return null;
  }
}

export function saveChildName(name: string, storage?: Storage | null): void {
  const n = normalizeName(name);
  if (!n) return;
  try {
    resolve(storage)?.setItem(PROFILE_KEY, JSON.stringify({ name: n }));
  } catch {
    /* 저장 불가(사생활 보호 모드 등) — 이번 실행 동안만 유지 */
  }
}
