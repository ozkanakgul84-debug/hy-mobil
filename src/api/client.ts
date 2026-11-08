import { Preferences } from '@capacitor/preferences';
import type { Oturum } from './types';
import { demoIstek } from './demo';

export const SUNUCU = 'https://hesaplayonet.com';
const ANAHTAR = 'hy_oturum';

let oturum: Oturum | null = null;
let cikisDinleyici: (() => void) | null = null;

export class ApiHatasi extends Error {
  constructor(mesaj: string, public durum = 0, public kod = '') { super(mesaj); }
}

export async function oturumYukle(): Promise<Oturum | null> {
  const { value } = await Preferences.get({ key: ANAHTAR });
  oturum = value ? (JSON.parse(value) as Oturum) : null;
  return oturum;
}

export function aktifOturum() { return oturum; }
export function cikisaAbone(fn: () => void) { cikisDinleyici = fn; }

async function oturumKaydet(o: Oturum | null) {
  oturum = o;
  if (o) await Preferences.set({ key: ANAHTAR, value: JSON.stringify(o) });
  else await Preferences.remove({ key: ANAHTAR });
}

/** Tüm HY isteklerinin tek kapısı. Token X-HY-Token başlığıyla gider.
 *  Uygulamada CapacitorHttp açık olduğundan fetch yerel HTTP'den geçer (CORS gerekmez). */
export async function istek<T = any>(yol: string, secenek: { metot?: string; govde?: unknown; sorgu?: Record<string, string | number> } = {}): Promise<T> {
  if (oturum?.demo) return demoIstek(yol, secenek) as Promise<T>;
  const url = new URL(SUNUCU + '/wp-json/' + yol.replace(/^\//, ''));
  Object.entries(secenek.sorgu || {}).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const basliklar: Record<string, string> = { Accept: 'application/json' };
  if (secenek.govde !== undefined) basliklar['Content-Type'] = 'application/json';
  if (oturum?.token) basliklar['X-HY-Token'] = oturum.token;

  let yanit: Response;
  try {
    yanit = await fetch(url.toString(), {
      method: secenek.metot || (secenek.govde !== undefined ? 'POST' : 'GET'),
      headers: basliklar,
      body: secenek.govde !== undefined ? JSON.stringify(secenek.govde) : undefined,
    });
  } catch {
    throw new ApiHatasi('Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.');
  }
  let veri: any = null;
  try { veri = await yanit.json(); } catch { /* boş gövde */ }
  if (yanit.status === 401 && oturum) {
    await oturumKaydet(null);
    cikisDinleyici?.();
    throw new ApiHatasi('Oturum süreniz doldu, yeniden giriş yapın.', 401);
  }
  if (!yanit.ok) throw new ApiHatasi(veri?.message || `Hata (${yanit.status})`, yanit.status, veri?.code || veri?.data?.kod || '');
  if (veri && veri.durum === 'hata') throw new ApiHatasi(veri.mesaj || 'İşlem başarısız.');
  return veri as T;
}

export async function girisYap(kadi: string, sifre: string): Promise<Oturum> {
  if (kadi.trim().toUpperCase() === 'DEMO/DEMO') {
    const o: Oturum = { token: 'demo', kullaniciAdi: 'demo', sirketKodu: 'DEMO', sirketAdi: 'Demo Reklam', rol: 'YONETICI', unvan: 'Şirket Yöneticisi', demo: true,
      kartGorusYetkileri: { aramaYapabilir: true, iletisimGorebilir: true, waMailKullanabilir: true, kameraKullanabilir: true } };
    await oturumKaydet(o);
    return o;
  }
  oturum = null;
  const v = await istek<any>('erp/v1/giris', { govde: { kadi: kadi.trim(), sifre } });
  if (!v?.token) throw new ApiHatasi(v?.mesaj || 'Giriş başarısız.');
  const o: Oturum = {
    token: v.token, kullaniciAdi: v.kullaniciAdi, sirketKodu: v.sirketKodu, sirketAdi: v.sirketAdi,
    rol: v.rol, unvan: v.unvan, aktifModuller: v.aktifModuller, kartGorusYetkileri: v.kartGorusYetkileri, isAkisi: v.isAkisi,
  };
  await oturumKaydet(o);
  return o;
}

export async function cikisYap() {
  try { if (oturum && !oturum.demo) await istek('hy-erp/v1/saha/cikis', { govde: {} }); } catch { /* yoksay */ }
  await oturumKaydet(null);
}
