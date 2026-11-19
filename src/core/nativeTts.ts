import { Capacitor } from '@capacitor/core';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { setNativeTts } from './audio';

/**
 * Android/iOS 앱으로 실행될 때만 휴대폰 자체 음성 엔진(Google 음성 등)으로 말하게 한다.
 * 브라우저(PWA)에서는 아무것도 하지 않고 기존 speechSynthesis를 쓴다.
 */
export function useNativeTtsInApp(): void {
  if (!Capacitor.isNativePlatform()) return;
  setNativeTts({
    speak: ({ text, lang, rate, pitch, volume }) =>
      TextToSpeech.speak({ text, lang, rate, pitch, volume, category: 'playback' }),
    stop: () => TextToSpeech.stop(),
  });
}
