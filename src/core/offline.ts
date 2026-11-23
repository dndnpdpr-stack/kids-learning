/**
 * 오프라인 캐시(서비스 워커)는 브라우저(PWA)에서만 쓴다.
 * 앱(APK) 안에서는 파일이 이미 앱에 들어 있어서 필요 없고, 오히려 예전 화면을 붙잡아
 * 새 APK를 깔아도 옛 버전이 보이게 한다. 그래서 앱에서는 남아 있는 캐시를 지우고 한 번 새로 고친다.
 */
export interface OfflineEnv {
  isNative: boolean;
  sw?: {
    register(url: string, opts: { scope: string }): Promise<unknown>;
    getRegistrations(): Promise<readonly { unregister(): Promise<boolean> }[]>;
  };
  caches?: { keys(): Promise<string[]>; delete(name: string): Promise<boolean> };
  reload(): void;
}

export async function setupOffline(env: OfflineEnv): Promise<void> {
  if (!env.sw) return;
  if (!env.isNative) {
    await env.sw.register('/sw.js', { scope: '/' });
    return;
  }
  const regs = await env.sw.getRegistrations();
  if (!regs.length) return;
  await Promise.all(regs.map((r) => r.unregister()));
  if (env.caches) {
    const names = await env.caches.keys();
    await Promise.all(names.map((n) => env.caches!.delete(n)));
  }
  env.reload();
}
