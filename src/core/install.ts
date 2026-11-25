/**
 * "홈 화면에 추가". 크롬은 설치할 수 있을 때 beforeinstallprompt를 보내 준다.
 * 그 이벤트를 막아 두었다가(자동 배너 대신) 부모 메뉴 버튼을 누를 때 설치 창을 띄운다.
 */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<unknown>;
}

let saved: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const captured = new WeakSet<EventTarget>();

function set(ev: InstallPromptEvent | null) {
  saved = ev;
  listeners.forEach((l) => l());
}

/** 앱 시작 때 한 번. 같은 대상에 여러 번 불러도 한 번만 듣는다. */
export function captureInstallPrompt(win: EventTarget): void {
  if (captured.has(win)) return;
  captured.add(win);
  win.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    set(e as InstallPromptEvent);
  });
  win.addEventListener('appinstalled', () => set(null));
}

export function canInstall(): boolean {
  return saved !== null;
}

/** 설치 창은 이벤트 하나당 한 번만 띄울 수 있다. */
export async function promptInstall(): Promise<void> {
  const ev = saved;
  if (!ev) return;
  set(null);
  try {
    await ev.prompt();
  } catch {
    // 브라우저가 거절하면 그대로 둔다
  }
}

/** 설치 가능 여부가 바뀔 때 알림. 반환: 해제 함수. */
export function onInstallChange(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
