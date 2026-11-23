import { describe, expect, it, vi } from 'vitest';
import { setupOffline, type OfflineEnv } from '../../src/core/offline';

function env(over: Partial<OfflineEnv> & { regs?: number } = {}) {
  const unregister = vi.fn(async () => true);
  const regs = Array.from({ length: over.regs ?? 0 }, () => ({ unregister }));
  const e: OfflineEnv = {
    isNative: false,
    sw: {
      register: vi.fn(async () => undefined),
      getRegistrations: vi.fn(async () => regs),
    },
    caches: { keys: vi.fn(async () => ['workbox-precache-v2', 'other']), delete: vi.fn(async () => true) },
    reload: vi.fn(),
    ...over,
  };
  return { e, unregister };
}

describe('setupOffline', () => {
  it('in the browser, registers the offline cache', async () => {
    const { e } = env();
    await setupOffline(e);
    expect(e.sw!.register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
    expect(e.reload).not.toHaveBeenCalled();
  });

  it('in the app, removes an old offline cache and reloads once so the installed version shows', async () => {
    const { e, unregister } = env({ isNative: true, regs: 1 });
    await setupOffline(e);
    expect(e.sw!.register).not.toHaveBeenCalled();
    expect(unregister).toHaveBeenCalledTimes(1);
    expect(e.caches!.delete).toHaveBeenCalledWith('workbox-precache-v2');
    expect(e.caches!.delete).toHaveBeenCalledWith('other');
    expect(e.reload).toHaveBeenCalledTimes(1);
  });

  it('in the app with nothing cached, does nothing (no reload loop)', async () => {
    const { e } = env({ isNative: true, regs: 0 });
    await setupOffline(e);
    expect(e.sw!.register).not.toHaveBeenCalled();
    expect(e.caches!.delete).not.toHaveBeenCalled();
    expect(e.reload).not.toHaveBeenCalled();
  });

  it('without service worker support, does nothing', async () => {
    const { e } = env({ sw: undefined });
    await expect(setupOffline(e)).resolves.toBeUndefined();
  });
});
