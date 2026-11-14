import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

/** Konuşmayı Türkçe yazıya çevirir (telefonun konuşma tanıması). Web panelindeki 🎤 Sesle yaz ile aynı amaç. */
export async function sesleYaz(): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    const { available } = await SpeechRecognition.available();
    if (!available) throw new Error('Bu telefonda konuşma tanıma yok (Google uygulaması gerekir).');
    const izin = await SpeechRecognition.requestPermissions();
    if (izin.speechRecognition !== 'granted') throw new Error('Mikrofon izni verilmedi.');
    const r = await SpeechRecognition.start({ language: 'tr-TR', maxResults: 1, partialResults: false, popup: true, prompt: 'Konuşun…' });
    return (r?.matches?.[0] || '').trim();
  }
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) throw new Error('Bu tarayıcı sesle yazmayı desteklemiyor.');
  return new Promise((coz, ret) => {
    const r = new SR(); r.lang = 'tr-TR'; r.interimResults = false; r.maxAlternatives = 1;
    r.onresult = (e: any) => coz(String(e.results?.[0]?.[0]?.transcript || '').trim());
    r.onerror = (e: any) => ret(new Error('Ses anlaşılamadı (' + (e.error || 'hata') + ')'));
    r.start();
  });
}
