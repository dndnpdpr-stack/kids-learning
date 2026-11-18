export interface SpeakOptions {
  lang: 'ko-KR' | 'en-US';
  rate?: number;
  volume?: number;
}

type ClipResolver = (text: string, lang: string) => string | null;

const DEFAULT_RATE = { 'ko-KR': 0.9, 'en-US': 0.85 } as const;

let clipResolver: ClipResolver = () => null;
// Tears down the in-flight utterance/clip and resolves its promise.
let cancelCurrent: (() => void) | null = null;

export function setClipResolver(fn: ClipResolver): void {
  clipResolver = fn;
}

export function stopSpeaking(): void {
  cancelCurrent?.();
  cancelCurrent = null;
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* ignore */
  }
}

export function speak(text: string, opts: SpeakOptions): Promise<void> {
  stopSpeaking();
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
        const voice = synth.getVoices().find((v) => v.lang === opts.lang);
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

    try {
      audio = new Audio(url);
      audio.volume = volume;
      audio.onended = finish;
      audio.onerror = finish;
      audio.play().catch(() => {
        if (finished) return;
        audio = null;
        speakTts();
      });
    } catch {
      audio = null;
      speakTts();
    }
  });
}
