import { istek } from './client';

export const MUSTERI_TIPLERI: [string, string, string][] = [
  // [dna anahtarı, sunucu sonucu anahtarı, ad]
  ['sonkullanici', 'sonKullanici', 'Son kullanıcı'],
  ['mimar', 'mimar', 'Mimar'],
  ['tabelaci', 'tabelaci', 'Tabelacı'],
  ['fason', 'fason', 'Fason'],
];

export type Satis = Record<string, number>;
export interface FiyatYetki { yonetici?: boolean; maliyetGor?: boolean; musteriTipleri?: string[]; kesimTeknikleri?: string[] }
export interface Malzeme { id: number; urunAdi: string; urunKodu?: string; kategori?: string; altBaslik?: string; birim?: string }
export interface Urun { id: string; urun_kodu: string; urun_adi: string; kategori?: string; modul?: string }

export interface KabartmaSatir { malzeme: string; en: string; boy: string; plaka: string; kesimTeknik: string }
export interface KabartmaSonuc { satirlar: { alan: number; satis: Satis; maliyet?: number; fiyat_eksik?: boolean }[]; toplam: { satis: Satis; maliyet?: number } }

export interface ZeminParca { ad: string; en: number; boy: number; adet: number }
export interface ZeminSonuc {
  satis: Satis; maliyet?: number; fiyat_eksik?: boolean; uyarilar?: string[];
  ozet: { plaka_adet: number; net_m2: number; kesim_m2: number; fire_m2: number; musteriye_m2: number };
  plaka?: { en: number; boy: number };
}

export interface SepetKalem { modulId: string; modulAdi: string; baslik: string; ozetBilgi: string; fiyat: number; dna: any }
export interface SepetGrup { id: string; ad: string; kalemler: SepetKalem[] }

export const fiyatYetki = () => istek<FiyatYetki>('hy/v1/fiyat/yetki');
export const malzemeler = () => istek<Malzeme[]>('erp/v1/malzemeler');
export const urunler = () => istek<Urun[]>('erp/v1/urunler');

export const kabartmaHesapla = (urun_kodu: string, satirlar: KabartmaSatir[]) =>
  istek<KabartmaSonuc>('hy/v1/fiyat/kabartma', { govde: { urun_kodu, satirlar } });

export const zeminHesapla = (g: { malzeme: string; donus_cm: number | ''; parcalar: ZeminParca[] }) =>
  istek<ZeminSonuc>('hy/v1/fiyat/zemin', { govde: { malzeme: g.malzeme, plaka_en: '', plaka_boy: '', donus_cm: g.donus_cm, parcalar: g.parcalar, fire_haric: [], iscilik: {}, urun_kodu: '' } });

/** Kartın en son fiyatlandırma projesini sepet olarak getirir (yoksa boş). Web paneliyle aynı yapı. */
export async function kartSepeti(kartId: number): Promise<{ projeId: number; projeAdi: string; sepet: SepetGrup[] }> {
  const liste = await istek<any[]>('hy/v1/fiyatlandirma/projeler', { sorgu: { kart_id: kartId } });
  if (!Array.isArray(liste) || !liste.length) return { projeId: 0, projeAdi: '', sepet: [] };
  liste.sort((a, b) => String(b.guncelleme || b.tarih || '').localeCompare(String(a.guncelleme || a.tarih || '')));
  const p = await istek<any>(`hy/v1/fiyatlandirma/proje/${liste[0].id}`);
  const gruplar: Record<string, SepetGrup> = {};
  const sepet: SepetGrup[] = [];
  (p.kalemler || []).forEach((k: any, i: number) => {
    const ad = k.grup_adi || 'Genel';
    if (!gruplar[ad]) { gruplar[ad] = { id: 'grup_' + Date.now() + '_' + i, ad, kalemler: [] }; sepet.push(gruplar[ad]); }
    gruplar[ad].kalemler.push({
      modulId: k.modul_id, modulAdi: ({ kabartma: 'Kabartma Harf', cizimli: 'Çizimli Hesap', zemin: 'Zemin' } as any)[k.modul_id] || k.modul_id,
      baslik: k.baslik, ozetBilgi: k.ozet_bilgi, fiyat: parseFloat(k.fiyat) || 0, dna: k.dna || {},
    });
  });
  return { projeId: p.id, projeAdi: p.proje_adi || '', sepet };
}

/** Sepeti kartın projesine yazar (proje yoksa yeni açılır). */
export async function sepetiKaydet(kartId: number, projeId: number, projeAdi: string, sepet: SepetGrup[]) {
  const toplam = sepet.reduce((t, g) => t + g.kalemler.reduce((a, k) => a + (Number(k.fiyat) || 0), 0), 0);
  const fd = new FormData();
  fd.append('musteri_id', String(kartId));
  fd.append('proje_id', String(projeId || 0));
  fd.append('proje_adi', projeAdi);
  fd.append('genel_toplam', String(Math.round(toplam * 100) / 100));
  fd.append('sepet', JSON.stringify(sepet));
  const r = await istek<any>('hy/v1/fiyatlandirma/kaydet', { govde: fd });
  if (r && r.success === false) throw new Error(r.mesaj || 'Kaydedilemedi');
  return r as { success: boolean; proje_id: number; proje_adi: string };
}

export const tl = (n?: number) => (n && n > 0 ? n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺' : '—');
