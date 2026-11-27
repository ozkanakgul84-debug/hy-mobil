import { useEffect, useState } from 'react';
import { kartGetir, waGetir } from './api/hy';
import { kartDosyalari, kartEpostalari } from './api/kart';

/* Kartı "aşağı indir" (web panelindeki hy-kart-kucult ile aynı fikir): kart alt şeride iner, başka ekranlara geçilebilir.
 * Küçükken kartta değişiklik olursa (WhatsApp, e-posta, log/not, dosya, kart bilgisi) şerit yeşil yanıp söner. */
export interface KucukKart { id: number; musteri: string; imza?: Imza; degisen?: string[] }
type Imza = { kart: string; log: number; wa: number; ep: number; dosya: number };

const ANAHTAR = 'hy_kucuk_kartlar';
let liste: KucukKart[] = (() => { try { return JSON.parse(localStorage.getItem(ANAHTAR) || '[]'); } catch { return []; } })();
const dinleyenler = new Set<(l: KucukKart[]) => void>();
const yay = () => { try { localStorage.setItem(ANAHTAR, JSON.stringify(liste)); } catch { /* yok say */ } dinleyenler.forEach((f) => f(liste)); };

export const kucukKartlar = () => liste;
export function useKucukKartlar() {
  const [l, setL] = useState(liste);
  useEffect(() => { dinleyenler.add(setL); return () => { dinleyenler.delete(setL); }; }, []);
  return l;
}

async function imzaAl(id: number): Promise<Imza> {
  const [k, wa, ep, ds] = await Promise.all([
    kartGetir(id),
    waGetir(id).then((r) => (r.mesajlar || []).length).catch(() => -1),
    kartEpostalari(id).then((r) => (r.mesajlar || []).length).catch(() => -1),
    kartDosyalari(id).then((r) => (r.dosyalar || []).length).catch(() => -1),
  ]);
  return { kart: [k.musteri, k.telefon, k.email, k.tanim, k.durum, k.guncelleme].join('|'), log: (k.log_metni || '').length, wa, ep, dosya: ds };
}

export async function asagiIndir(id: number, musteri: string) {
  if (!liste.some((x) => x.id === id)) liste = [...liste, { id, musteri }];
  yay();
  try { const imza = await imzaAl(id); liste = liste.map((x) => (x.id === id ? { ...x, imza, degisen: [] } : x)); yay(); } catch { /* sonraki turda alınır */ }
}
export function kucukKaldir(id: number) { liste = liste.filter((x) => x.id !== id); yay(); }

/** Alt şeritteki kartları yoklar; değişen varsa ne değiştiğini yazar. */
export async function kucukYokla() {
  for (const k of liste) {
    try {
      const yeni = await imzaAl(k.id);
      if (!k.imza) { liste = liste.map((x) => (x.id === k.id ? { ...x, imza: yeni } : x)); continue; }
      const d: string[] = [];
      if (yeni.wa > k.imza.wa && k.imza.wa >= 0) d.push('yeni WhatsApp');
      if (yeni.ep > k.imza.ep && k.imza.ep >= 0) d.push('yeni e-posta');
      if (yeni.log > k.imza.log) d.push('yeni log / not');
      if (yeni.dosya > k.imza.dosya && k.imza.dosya >= 0) d.push('yeni dosya');
      if (yeni.kart !== k.imza.kart && !d.length) d.push('kart bilgisi değişti');
      if (d.length) liste = liste.map((x) => (x.id === k.id ? { ...x, imza: yeni, degisen: [...new Set([...(x.degisen || []), ...d])] } : x));
    } catch { /* ağ yoksa sonra */ }
  }
  yay();
}
