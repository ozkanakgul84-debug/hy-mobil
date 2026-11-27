import { istek } from './client';

/* Takvim (hy-erp/v1/takvim): web panelindeki takvimle aynı servis. */
export interface Randevu {
  id: number; tur: string; tur_ad?: string; baslik?: string; tarih: string; saat?: string; sure_dk?: number; yer?: string; kisi?: string; telefon?: string;
  kart_id?: number; musteri?: string; durum?: string; notlar?: string; duzenleyebilir?: boolean; olusturan?: string; katilimcilar?: string[];
}
export interface SahaOlay { id: number; kart_id: number; musteri?: string; tur: string; tur_ad?: string; tarih: string; saat?: string; sure_dk?: number; atanan_ad?: string; durum: string; durum_ad?: string }
export interface TerminOlay { tip: 'uretim' | 'teslim' | string; kart_id: number; musteri?: string; tarih: string; tanim?: string; hazir?: boolean }
export interface TakvimVeri {
  bas: string; bit: string; bugun: string;
  randevular: Randevu[]; saha: SahaOlay[]; terminler: TerminOlay[];
  turler: Record<string, string>; durumlar: Record<string, string>; personel: string[]; ben: string; yonetici?: boolean; planlayici?: boolean;
  ayar?: { gunluk_montaj?: number; uretim_gun?: number; mesai_bas?: string; mesai_bit?: string };
  sonuc_bekleyen?: Randevu[];
}

export const takvimGetir = (bas: string, bit: string) => istek<TakvimVeri>('hy-erp/v1/takvim', { sorgu: { bas, bit } });
export const randevuKaydet = (g: Partial<Randevu> & { hatirlat_dk?: number; ozel?: number; musteri_bildir?: number }, id?: number) =>
  istek<any>('hy-erp/v1/takvim/randevu' + (id ? '/' + id : ''), { govde: g });
export const randevuDurum = (id: number, durum: string) => istek<any>(`hy-erp/v1/takvim/randevu/${id}`, { govde: { kismi: 1, durum } });
export const randevuSil = (id: number) => istek<any>(`hy-erp/v1/takvim/randevu/${id}`, { metot: 'DELETE' });
export const kartAra = (q: string) => istek<{ kartlar: { id: number; musteri: string; telefon?: string; email?: string }[] }>('hy-erp/v1/takvim/kart-ara', { sorgu: { q } });
export const terminHesapla = (gun: number) =>
  istek<{ hazir: string; kapasite: number; gunler: { tarih: string; dolu: number }[]; secenekler: { tarih: string; bos: number }[] }>('hy-erp/v1/takvim/termin', { sorgu: { gun } });

export type Olay = { k: 'r' | 's' | 't'; id: string; tarih: string; saat: string; baslik: string; alt: string; renk: string; bitti?: boolean; soluk?: boolean; kartId?: number; ham: any };

const RENK: Record<string, string> = { randevu: '#3b82f6', kesif: '#f59e0b', toplanti: '#8b5cf6', diger: '#64748b', montaj: '#16a34a', saha: '#06b6d4', termin: '#ef4444' };

/** Panelin olaylar() fonksiyonuyla aynı birleştirme: randevular + saha görevleri + terminler, tarih ve saate göre. */
export function olaylar(v: TakvimVeri): Olay[] {
  const o: Olay[] = [];
  (v.randevular || []).forEach((r) => o.push({
    k: 'r', id: 'r' + r.id, tarih: r.tarih, saat: r.saat || '', renk: RENK[r.tur] || RENK.diger,
    baslik: r.baslik || r.kisi || r.musteri || r.tur_ad || v.turler?.[r.tur] || r.tur,
    alt: [(v.turler?.[r.tur] || r.tur_ad || r.tur), r.kart_id ? 'TR-' + r.kart_id + (r.musteri ? ' ' + r.musteri : '') : '', r.yer].filter(Boolean).join(' · '),
    bitti: r.durum === 'yapildi', soluk: r.durum === 'iptal' || r.durum === 'ertelendi', kartId: r.kart_id, ham: r,
  }));
  (v.saha || []).forEach((g) => o.push({
    k: 's', id: 's' + g.id, tarih: g.tarih, saat: g.saat || '', renk: g.tur === 'montaj' || g.tur === 'sokum' ? RENK.montaj : g.tur === 'kesif' ? RENK.kesif : RENK.saha,
    baslik: (g.tur_ad || g.tur) + ' · TR-' + g.kart_id + (g.musteri ? ' ' + g.musteri : ''),
    alt: [g.atanan_ad, g.durum_ad].filter(Boolean).join(' · '), bitti: g.durum === 'bitti', kartId: g.kart_id, ham: g,
  }));
  (v.terminler || []).forEach((t) => o.push({
    k: 't', id: 't' + t.tip + t.kart_id, tarih: t.tarih, saat: '', renk: RENK.termin,
    baslik: (t.tip === 'uretim' ? 'Üretim termini' : 'Teslim termini') + ' · TR-' + t.kart_id + (t.musteri ? ' ' + t.musteri : ''),
    alt: t.tanim || '', bitti: !!t.hazir, kartId: t.kart_id, ham: t,
  }));
  const dk = (s: string) => { const [a, b] = s.split(':').map(Number); return a * 60 + (b || 0); };
  return o.sort((a, b) => (a.tarih !== b.tarih ? (a.tarih < b.tarih ? -1 : 1) : (a.saat ? dk(a.saat) : -1) - (b.saat ? dk(b.saat) : -1)));
}

export const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const trGun = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
