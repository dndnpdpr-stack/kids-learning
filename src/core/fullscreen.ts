/**
 * 폰 브라우저에서 주소창·상태 표시줄을 치우는 전체화면.
 * 브라우저는 사용자가 누른 순간에만 켜게 해 주므로, 아이가 처음 누를 때(그리고 풀린 뒤 다시 누를 때) 켠다.
 * 앱(APK), 홈 화면에 설치한 앱, PC, 지원하지 않는 브라우저(아이폰 사파리)에서는 아무것도 안 한다.
 */
export interface FsEnv {
  requestFullscreen?: (opts?: FullscreenOptions) => Promise<void>;
  enabled: boolean;
  isFullscreen: () => boolean;
  matches: (query: string) => boolean;
}

export function browserEnv(): FsEnv {
  const root = document.documentElement;
  return {
    requestFullscreen: root.requestFullscreen ? (o) => root.requestFullscreen(o) : undefined,
    enabled: document.fullscreenEnabled !== false,
    isFullscreen: () => !!document.fullscreenElement,
    matches: (q) => {
      try {
        return matchMedia(q).matches;
      } catch {
        return false;
      }
    },
  };
}

export function shouldAutoFullscreen(env: FsEnv, isNative: boolean): boolean {
  if (isNative || !env.requestFullscreen || !env.enabled || env.isFullscreen()) return false;
  const installed = env.matches('(display-mode: standalone)') || env.matches('(display-mode: fullscreen)');
  return !installed && env.matches('(pointer: coarse)');
}

/**
 * 누를 때마다(pointerup — 터치에서도 사용자 동작으로 인정됨) 필요하면 전체화면을 켠다.
 * skip()이 참이면(부모 메뉴) 켜지 않는다. 반환: 해제 함수.
 */
export function installAutoFullscreen(
  target: EventTarget,
  opts: { isNative: boolean; skip: () => boolean; env?: FsEnv },
): () => void {
  const env = opts.env ?? browserEnv();
  const onUp = () => {
    if (opts.skip() || !shouldAutoFullscreen(env, opts.isNative)) return;
    env.requestFullscreen!({ navigationUI: 'hide' }).catch(() => {
      // 거절되면 그대로 둔다
    });
  };
  target.addEventListener('pointerup', onUp, { capture: true });
  return () => target.removeEventListener('pointerup', onUp, { capture: true });
}
