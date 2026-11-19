import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setClipResolver, speak, stopSpeaking } from '../../src/core/audio';

class FakeUtterance {
  lang = '';
  rate = 1;
  pitch = 1;
  volume = 1;
  voice: unknown = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public text: string) {}
}

let synth: {
  speak: ReturnType<typeof vi.fn>;
  cancel: ReturnType<typeof vi.fn>;
  getVoices: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.useFakeTimers();
  synth = { speak: vi.fn(), cancel: vi.fn(), getVoices: vi.fn(() => []) };
  vi.stubGlobal('speechSynthesis', synth);
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  setClipResolver(() => null);
});

afterEach(() => {
  stopSpeaking();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const lastUtterance = () => synth.speak.mock.calls.at(-1)![0] as FakeUtterance;

describe('speak (TTS)', () => {
  it('uses ko-KR with rate 0.9 and resolves on end', async () => {
    const p = speak('기역', { lang: 'ko-KR' });
    const u = lastUtterance();
    expect(u.lang).toBe('ko-KR');
    expect(u.rate).toBe(0.9);
    expect(u.volume).toBe(1);
    u.onend!();
    await expect(p).resolves.toBeUndefined();
  });

  it('uses en-US default rate 0.85 and custom volume', () => {
    void speak('A', { lang: 'en-US', volume: 0.4 });
    const u = lastUtterance();
    expect(u.rate).toBe(0.85);
    expect(u.volume).toBe(0.4);
  });

  it('sets pitch 1.1', () => {
    void speak('가', { lang: 'ko-KR' });
    expect(lastUtterance().pitch).toBe(1.1);
  });

  it('prefers natural/online voices and matches ko_KR underscore', () => {
    const plain = { lang: 'ko-KR', name: 'Plain' };
    const nat = { lang: 'ko-KR', name: 'Microsoft SunHi Online (Natural)' };
    synth.getVoices.mockReturnValue([plain, nat]);
    void speak('가', { lang: 'ko-KR' });
    expect(lastUtterance().voice).toBe(nat);
    const us = { lang: 'ko_KR', name: 'Underscore' };
    synth.getVoices.mockReturnValue([{ lang: 'en-US', name: 'e' }, us]);
    void speak('가', { lang: 'ko-KR' });
    expect(lastUtterance().voice).toBe(us);
  });

  it('picks the first voice matching lang, else none', () => {
    const v = { lang: 'ko-KR', name: 'k' };
    synth.getVoices.mockReturnValue([{ lang: 'en-US' }, v]);
    void speak('가', { lang: 'ko-KR' });
    expect(lastUtterance().voice).toBe(v);
    void speak('A', { lang: 'en-US' });
    expect(lastUtterance().voice).toEqual({ lang: 'en-US' });
    synth.getVoices.mockReturnValue([]);
    void speak('B', { lang: 'en-US' });
    expect(lastUtterance().voice).toBeNull();
  });

  it('cancels the previous utterance and still resolves its promise', async () => {
    const first = speak('가', { lang: 'ko-KR' });
    synth.cancel.mockClear();
    void speak('나', { lang: 'ko-KR' });
    expect(synth.cancel).toHaveBeenCalled();
    expect(synth.cancel.mock.invocationCallOrder[0]).toBeLessThan(
      synth.speak.mock.invocationCallOrder[1],
    );
    await expect(first).resolves.toBeUndefined();
  });

  it('resolves when speechSynthesis is missing', async () => {
    vi.stubGlobal('speechSynthesis', undefined);
    await expect(speak('가', { lang: 'ko-KR' })).resolves.toBeUndefined();
  });

  it('resolves on utterance error', async () => {
    const p = speak('가', { lang: 'ko-KR' });
    lastUtterance().onerror!();
    await expect(p).resolves.toBeUndefined();
  });

  it('resolves if synth.speak throws', async () => {
    synth.speak.mockImplementation(() => {
      throw new Error('x');
    });
    await expect(speak('가', { lang: 'ko-KR' })).resolves.toBeUndefined();
  });

  it('resolves after safety timeout (chars*300 + 1500) when no events', async () => {
    let done = false;
    void speak('기역', { lang: 'ko-KR' }).then(() => (done = true));
    await vi.advanceTimersByTimeAsync(2 * 300 + 1500 - 1);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(done).toBe(true);
  });

  it('stopSpeaking cancels and resolves pending', async () => {
    const p = speak('가', { lang: 'ko-KR' });
    synth.cancel.mockClear();
    stopSpeaking();
    expect(synth.cancel).toHaveBeenCalled();
    await expect(p).resolves.toBeUndefined();
  });
});

describe('clip resolver', () => {
  let audios: FakeAudio[];
  class FakeAudio {
    volume = 1;
    onended: (() => void) | null = null;
    onerror: (() => void) | null = null;
    play = vi.fn(() => Promise.resolve());
    pause = vi.fn();
    constructor(public url: string) {
      audios.push(this);
    }
  }
  beforeEach(() => {
    audios = [];
    vi.stubGlobal('Audio', FakeAudio);
    setClipResolver((text, lang) => (text === '가' ? `/clips/${lang}/ga.mp3` : null));
  });

  it('plays the clip instead of TTS and resolves on ended', async () => {
    const p = speak('가', { lang: 'ko-KR', volume: 0.5 });
    expect(audios).toHaveLength(1);
    expect(audios[0].url).toBe('/clips/ko-KR/ga.mp3');
    expect(audios[0].volume).toBe(0.5);
    expect(audios[0].play).toHaveBeenCalled();
    expect(synth.speak).not.toHaveBeenCalled();
    audios[0].onended!();
    await expect(p).resolves.toBeUndefined();
  });

  it('falls back to TTS when play() is rejected', async () => {
    vi.stubGlobal(
      'Audio',
      class extends FakeAudio {
        play = vi.fn(() => Promise.reject(new Error('blocked')));
      },
    );
    const p = speak('가', { lang: 'ko-KR' });
    await vi.advanceTimersByTimeAsync(0);
    expect(synth.speak).toHaveBeenCalledTimes(1);
    lastUtterance().onend!();
    await expect(p).resolves.toBeUndefined();
  });

  describe('clip failure falls back to TTS exactly once', () => {
    let rejectPlay: () => void;
    beforeEach(() => {
      vi.stubGlobal(
        'Audio',
        class extends FakeAudio {
          play = vi.fn(
            () => new Promise<void>((_, rej) => (rejectPlay = () => rej(new Error('blocked')))),
          );
        },
      );
    });

    it('error event before play() rejects', async () => {
      let done = false;
      void speak('가', { lang: 'ko-KR' }).then(() => (done = true));
      audios[0].onerror!();
      rejectPlay();
      await vi.advanceTimersByTimeAsync(0);
      expect(synth.speak).toHaveBeenCalledTimes(1);
      expect(done).toBe(false);
      lastUtterance().onend!();
      await vi.advanceTimersByTimeAsync(0);
      expect(done).toBe(true);
    });

    it('play() rejects, then error event fires', async () => {
      let done = false;
      void speak('가', { lang: 'ko-KR' }).then(() => (done = true));
      rejectPlay();
      await vi.advanceTimersByTimeAsync(0);
      expect(synth.speak).toHaveBeenCalledTimes(1);
      expect(audios[0].onerror).toBeNull();
      audios[0].onerror?.();
      audios[0].onended?.();
      await vi.advanceTimersByTimeAsync(0);
      expect(synth.speak).toHaveBeenCalledTimes(1);
      expect(done).toBe(false);
      lastUtterance().onend!();
      await vi.advanceTimersByTimeAsync(0);
      expect(done).toBe(true);
    });
  });

  it('stopSpeaking pauses the clip and resolves', async () => {
    const p = speak('가', { lang: 'ko-KR' });
    stopSpeaking();
    expect(audios[0].pause).toHaveBeenCalled();
    await expect(p).resolves.toBeUndefined();
  });

  it('uses TTS when resolver returns null', () => {
    void speak('나', { lang: 'ko-KR' });
    expect(audios).toHaveLength(0);
    expect(synth.speak).toHaveBeenCalled();
  });
});

import { setNativeTts, type NativeTts } from '../../src/core/audio';

describe('native TTS engine (Android app)', () => {
  let engine: { speak: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> };
  let resolvers: Array<() => void>;

  beforeEach(() => {
    resolvers = [];
    engine = {
      speak: vi.fn(() => new Promise<void>((r) => resolvers.push(r))),
      stop: vi.fn(() => Promise.resolve()),
    };
    setNativeTts(engine as unknown as NativeTts);
  });
  afterEach(() => setNativeTts(null));

  it('speaks through the native engine instead of speechSynthesis', async () => {
    let done = false;
    void speak('기역', { lang: 'ko-KR', volume: 0.5 }).then(() => (done = true));
    expect(engine.speak).toHaveBeenCalledWith({ text: '기역', lang: 'ko-KR', rate: 0.9, pitch: 1.1, volume: 0.5 });
    expect(synth.speak).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(done).toBe(false);
    resolvers[0]();
    await vi.waitFor(() => expect(done).toBe(true));
  });

  it('resolves (never rejects) when the engine fails', async () => {
    engine.speak.mockImplementationOnce(() => Promise.reject(new Error('no korean voice')));
    await expect(speak('가', { lang: 'ko-KR' })).resolves.toBeUndefined();
  });

  it('a new speak resolves the previous one without calling stop (engine flushes itself)', async () => {
    let first = false;
    void speak('하나', { lang: 'ko-KR' }).then(() => (first = true));
    void speak('둘', { lang: 'ko-KR' });
    await vi.waitFor(() => expect(first).toBe(true));
    expect(engine.stop).not.toHaveBeenCalled();
    expect(engine.speak).toHaveBeenCalledTimes(2);
  });

  it('stopSpeaking stops the native engine', () => {
    void speak('셋', { lang: 'ko-KR' });
    stopSpeaking();
    expect(engine.stop).toHaveBeenCalled();
  });

  it('still falls back to the safety timer if the engine never finishes', async () => {
    let done = false;
    void speak('넷', { lang: 'ko-KR' }).then(() => (done = true));
    vi.advanceTimersByTime('넷'.length * 300 + 1500);
    await vi.waitFor(() => expect(done).toBe(true));
  });
});
