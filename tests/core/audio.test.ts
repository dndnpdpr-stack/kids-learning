import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setClipResolver, speak, stopSpeaking } from '../../src/core/audio';

class FakeUtterance {
  lang = '';
  rate = 1;
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

  it('resolves on clip error', async () => {
    const p = speak('가', { lang: 'ko-KR' });
    audios[0].onerror!();
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
