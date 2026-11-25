import { afterEach, describe, expect, it, vi } from 'vitest';
import { installAutoFullscreen, shouldAutoFullscreen, type FsEnv } from '../../src/core/fullscreen';
import { canInstall, captureInstallPrompt, onInstallChange, promptInstall } from '../../src/core/install';

function env(over: Partial<FsEnv> = {}): FsEnv & { request: ReturnType<typeof vi.fn> } {
  const request = vi.fn(() => Promise.resolve());
  return {
    request,
    enabled: true,
    isFullscreen: () => false,
    matches: (q) => q === '(pointer: coarse)',
    requestFullscreen: request,
    ...over,
  };
}

describe('auto fullscreen', () => {
  it('wants fullscreen on a touch phone browser', () => {
    expect(shouldAutoFullscreen(env(), false)).toBe(true);
  });

  it('does nothing in the app, an installed web app, on a PC, unsupported, or already fullscreen', () => {
    expect(shouldAutoFullscreen(env(), true)).toBe(false);
    expect(shouldAutoFullscreen(env({ matches: (q) => q !== '(display-mode: browser)' }), false)).toBe(false);
    expect(shouldAutoFullscreen(env({ matches: () => false }), false)).toBe(false);
    expect(shouldAutoFullscreen(env({ enabled: false }), false)).toBe(false);
    expect(shouldAutoFullscreen(env({ requestFullscreen: undefined }), false)).toBe(false);
    expect(shouldAutoFullscreen(env({ isFullscreen: () => true }), false)).toBe(false);
  });

  it('enters on the first tap and again after it was left, but not while skipped', () => {
    const target = new EventTarget();
    const e = env();
    let skip = false;
    const stop = installAutoFullscreen(target, { isNative: false, skip: () => skip, env: e });
    target.dispatchEvent(new Event('pointerup'));
    expect(e.request).toHaveBeenCalledTimes(1);
    target.dispatchEvent(new Event('pointerup'));
    expect(e.request).toHaveBeenCalledTimes(2);
    skip = true;
    target.dispatchEvent(new Event('pointerup'));
    expect(e.request).toHaveBeenCalledTimes(2);
    skip = false;
    stop();
    target.dispatchEvent(new Event('pointerup'));
    expect(e.request).toHaveBeenCalledTimes(2);
  });

  it('a refused request does not throw', async () => {
    const target = new EventTarget();
    const e = env({ requestFullscreen: vi.fn(() => Promise.reject(new Error('no'))) });
    installAutoFullscreen(target, { isNative: false, skip: () => false, env: e });
    expect(() => target.dispatchEvent(new Event('pointerup'))).not.toThrow();
    await Promise.resolve();
  });
});

describe('install prompt', () => {
  const win = new EventTarget();
  captureInstallPrompt(win);
  afterEach(() => win.dispatchEvent(new Event('appinstalled')));

  function offer() {
    const ev = new Event('beforeinstallprompt', { cancelable: true }) as Event & { prompt: () => Promise<void> };
    ev.prompt = vi.fn(() => Promise.resolve());
    win.dispatchEvent(ev);
    return ev;
  }

  it('is unavailable until the browser offers it', () => {
    expect(canInstall()).toBe(false);
    const ev = offer();
    expect(ev.defaultPrevented).toBe(true);
    expect(canInstall()).toBe(true);
  });

  it('shows the saved prompt once and notifies listeners', async () => {
    const seen: boolean[] = [];
    const off = onInstallChange(() => seen.push(canInstall()));
    const ev = offer();
    await promptInstall();
    expect(ev.prompt).toHaveBeenCalledTimes(1);
    expect(canInstall()).toBe(false);
    expect(seen).toEqual([true, false]);
    off();
  });

  it('promptInstall without an offer does nothing', async () => {
    await expect(promptInstall()).resolves.toBeUndefined();
  });
});
