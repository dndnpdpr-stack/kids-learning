/** 부모가 켜는 설정. 기기(localStorage)에만 저장한다. */
export const SETTINGS_KEY = 'kidsgame.settings.v1';

function resolve(storage?: Storage | null): Storage | null {
  if (storage !== undefined) return storage;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** 테스트 모드: 모든 묶음 열림 + 부모 메뉴 한 번 눌러 열기. 실제 진도 기록은 건드리지 않는다. */
export function loadTestMode(storage?: Storage | null): boolean {
  try {
    const raw = resolve(storage)?.getItem(SETTINGS_KEY);
    if (!raw) return false;
    const v: unknown = JSON.parse(raw);
    return typeof v === 'object' && v !== null && (v as { testMode?: unknown }).testMode === true;
  } catch {
    return false;
  }
}

export function saveTestMode(on: boolean, storage?: Storage | null): void {
  try {
    resolve(storage)?.setItem(SETTINGS_KEY, JSON.stringify({ testMode: on }));
  } catch {
    /* 저장 불가 — 이번 실행 동안만 유지 */
  }
}
