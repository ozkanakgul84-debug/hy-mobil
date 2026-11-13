import { SUNUCU } from './api/client';

export const SURUM = '0.6.2';

function kucuk(a: string, b: string) {
  const x = a.split('.').map(Number), y = b.split('.').map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) < (y[i] || 0); }
  return false;
}

/** Sitedeki indirme sayfasında yazan sürüm bu uygulamadan yeniyse onu döndürür (yoksa null). */
export async function yeniSurum(): Promise<string | null> {
  try {
    const r = await fetch(SUNUCU + '/uygulama/?s=' + Date.now());
    const m = /S[üu]r[üu]m\s*([\d]+\.[\d]+(?:\.[\d]+)?)/i.exec(await r.text());
    return m && kucuk(SURUM, m[1]) ? m[1] : null;
  } catch { return null; }
}
