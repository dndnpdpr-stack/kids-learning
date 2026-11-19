export interface SpeakOptions {
  lang: 'ko-KR' | 'en-US';
  rate?: number;
  volume?: number;
}

type ClipResolver = (text: string, lang: string) => string | null;

const DEFAULT_RATE = { 'ko-KR': 0.9, 'en-US': 0.85 } as const;

/**
 * 앱(Capacitor) 안에서는 WebView의 speechSynthesis가 소리를 내지 않는 경우가 많아,
 * 휴대폰 자체 음성 엔진을 쓰는 플러그인을 연결한다. speak는 다 읽으면 resolve,
 * 새 요청이 오면 엔진이 스스로 앞의 발화를 끊는다(flush).
 */
export interface NativeTts {
  speak(o: { text: string; lang: string; rate: number; pitch: number; volume: number }): Promise<void>;
  stop(): Promise<void>;
}

let clipResolver: ClipResolver = () => null;
let nativeTts: NativeTts | null = null;

export function setNativeTts(engine: NativeTts | null): void {
  nativeTts = engine;
}
// Tears down the in-flight utterance/clip and resolves its promise.
let cancelCurrent: (() => void) | null = null;

export function setClipResolver(fn: ClipResolver): void {
  clipResolver = fn;
}

/** 진행 중인 발화의 promise를 끝내고 브라우저 음성을 멈춘다. */
function cancelPrevious(): void {
  cancelCurrent?.();
  cancelCurrent = null;
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* ignore */
  }
}

export function stopSpeaking(): void {
  cancelPrevious();
  try {
    void nativeTts?.stop().catch(() => {});
  } catch {
    /* ignore */
  }
}

const VOICE_KEYWORDS = ['natural', 'neural', 'online', 'google', 'premium', 'enhanced'];

export function pickVoice(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | undefined {
  const prefix = lang.slice(0, 2).toLowerCase();
  const matches = voices.filter((v) => (v.lang ?? '').replace('_', '-').toLowerCase().split('-')[0] === prefix);
  for (const k of VOICE_KEYWORDS) {
    const hit = matches.find((v) => (v.name ?? '').toLowerCase().includes(k));
    if (hit) return hit;
  }
  return matches[0];
}

export function speak(text: string, opts: SpeakOptions): Promise<void> {
  // 네이티브 엔진은 새 요청에서 스스로 앞 발화를 끊으므로 stop을 부르지 않는다
  // (비동기 stop이 늦게 도착해 새 발화를 끊는 일을 막는다).
  cancelPrevious();
  return new Promise<void>((resolve) => {
    let finished = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let audio: HTMLAudioElement | null = null;

    const finish = () => {
      if (finished) return;
      finished = true;
      if (timer !== undefined) clearTimeout(timer);
      if (audio) {
        try {
          audio.pause();
        } catch {
          /* ignore */
        }
      }
      if (cancelCurrent === finish) cancelCurrent = null;
      resolve();
    };
    cancelCurrent = finish;

    const volume = opts.volume ?? 1;

    const speakTts = () => {
      if (nativeTts) {
        try {
          nativeTts
            .speak({ text, lang: opts.lang, rate: opts.rate ?? DEFAULT_RATE[opts.lang], pitch: 1.1, volume })
            .then(finish, finish);
          timer = setTimeout(finish, text.length * 300 + 1500);
        } catch {
          finish();
        }
        return;
      }
      const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
      if (!synth || typeof SpeechSynthesisUtterance === 'undefined') {
        finish();
        return;
      }
      try {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = opts.lang;
        u.rate = opts.rate ?? DEFAULT_RATE[opts.lang];
        u.volume = volume;
        u.pitch = 1.1;
        const voice = pickVoice(synth.getVoices(), opts.lang);
        if (voice) u.voice = voice;
        u.onend = finish;
        u.onerror = finish;
        synth.speak(u);
        timer = setTimeout(finish, text.length * 300 + 1500);
      } catch {
        finish();
      }
    };

    let url: string | null = null;
    try {
      url = clipResolver(text, opts.lang);
    } catch {
      url = null;
    }
    if (!url || typeof Audio === 'undefined') {
      speakTts();
      return;
    }

    let clipFailed = false;
    const clipFail = () => {
      if (clipFailed || finished) return;
      clipFailed = true;
      if (audio) {
        audio.onended = null;
        audio.onerror = null;
        try {
          audio.pause();
        } catch {
          /* ignore */
        }
        audio = null;
      }
      speakTts();
    };

    try {
      audio = new Audio(url);
      audio.volume = volume;
      audio.onended = finish;
      audio.onerror = clipFail;
      audio.play().catch(clipFail);
    } catch {
      clipFail();
    }
  });
}
