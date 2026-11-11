import { istek } from './client';

const M = 'hy-muhasebe/v1';

export const CARI_TIPLERI: Record<string, string> = {
  musteri: 'Müşteri', tedarikci: 'Tedarikçi (hammadde)', uretici: 'Üretici / dış iş', fason_ekip: 'Fason ekip', yevmiyeci: 'Yevmiyeci', diger: 'Diğer',
};
export const MUSTERI_TIPLERI: Record<string, string> = { kapi: 'Kapı müşterisi', kurumsal: 'Kurumsal firma', mimar: 'Mimar', ajans: 'Reklam ajansı', tabelaci: 'Tabelacı / fason' };
export const BELGE_TIPLERI: Record<string, string> = { satis: 'Satış', alis: 'Alış', satis_iade: 'Satış iadesi', alis_iade: 'Alış iadesi' };
export const BELGE_DURUM: Record<string, string> = { taslak: 'Taslak', kesildi: 'Kesildi', iptal: 'İptal' };
export const ODEME_DURUM: Record<string, string> = { odenmedi: 'Ödenmedi', kismi: 'Kısmi', odendi: 'Ödendi' };

export interface Cari {
  id: number; tip: string; unvan: string; musteri_tipi?: string; grup?: string; efatura_tipi?: string;
  yetkili?: string; telefon?: string; whatsapp?: string; email?: string; vergi_no?: string; vergi_dairesi?: string;
  adres?: string | null; il?: string; ilce?: string; iban?: string; notlar?: string | null; crm_kart_id?: number | null;
  aktif?: number; bakiye?: number; fatura_eksik?: string[];
}

export interface Kalem { aciklama: string; miktar: number | string; birim: string; birim_fiyat: number | string; iskonto_oran: number | string; kdv_oran: number | string; tutar?: number }

export interface Belge {
  id: number; tip: string; durum: string; belge_no?: string; cari_id: number; cari_unvan: string; tarih: string; vade?: string;
  doviz: string; kur?: number; aciklama?: string; kalemler: Kalem[]; ara_toplam: number; iskonto_toplam?: number; kdv_toplam: number;
  genel_toplam: number; genel_toplam_tl?: number; odeme_durumu?: string; odenen?: number; kalan?: number; gecikti?: boolean;
  fatura_eksik?: string[]; kart_id?: number | null;
}

export interface MuOturum {
  yonetici?: boolean;
  yetki: Record<string, boolean>;
  ayarlar: { kdv_oranlari?: string; varsayilan_kdv?: string; varsayilan_vade_gun?: string; cari_gruplari?: Record<string, string[]> };
}

let oturumOnbellek: MuOturum | null = null;
export async function muOturum(): Promise<MuOturum> {
  if (!oturumOnbellek) oturumOnbellek = await istek<MuOturum>(`${M}/oturum`);
  return oturumOnbellek;
}
export function muOturumSifirla() { oturumOnbellek = null; }

export function kdvOranlari(o: MuOturum): number[] {
  const l = (o.ayarlar.kdv_oranlari || '0,1,10,20').split(',').map((x) => Number(x.trim())).filter((x) => !isNaN(x));
  return l.length ? l : [0, 1, 10, 20];
}

export const carilerGetir = () => istek<Cari[]>(`${M}/cariler`);
export const cariKaydet = (c: Partial<Cari>) => istek<Cari>(`${M}/cariler`, { govde: c });
export const cariEkstre = (id: number) => istek<any>(`${M}/cariler/${id}/ekstre`);

export const belgelerGetir = (tip = '') => istek<Belge[]>(`${M}/belgeler`, { sorgu: tip ? { tip } : {} });
export const belgeGetir = (id: number) => istek<Belge>(`${M}/belgeler/${id}`);
export const belgeKes = (id: number) => istek(`${M}/belgeler/${id}/kes`, { govde: {} });

/** Web paneliyle aynı biçim: sayılar virgüllü metin olarak gider. */
const virgul = (n: number | string) => String(n ?? '').replace('.', ',');
export function belgeKaydet(b: { id?: number; tip: string; cari_id: number; tarih: string; vade: string; doviz: string; aciklama: string; kart_id?: number | null; kalemler: Kalem[] }, kes: boolean) {
  const govde: any = {
    ...b, belge_no: '', kur: '',
    kalemler: b.kalemler.map((k) => ({ aciklama: k.aciklama, miktar: virgul(k.miktar), birim: k.birim, birim_fiyat: virgul(k.birim_fiyat), iskonto_oran: virgul(k.iskonto_oran || ''), kdv_oran: String(k.kdv_oran) })),
  };
  if (!b.id) delete govde.id;
  if (!b.kart_id) delete govde.kart_id;
  if (kes) govde.kes = 1;
  return istek<{ id: number; belge_no?: string }>(`${M}/belgeler`, { govde });
}

/** CRM kartından fatura: kartın carisi ve fiyatlandırma dosyasındaki kalemler. */
export const crmKartFatura = (kartId: number) => istek<{ kart: any; cari_id?: number; projeler: any[]; kalemler: Kalem[] }>(`${M}/crm/kart/${kartId}`);
export const crmKartCariAc = (kartId: number) => istek<{ id: number }>(`${M}/crm/kart/${kartId}/cari`, { govde: {} });

export function sayi(v: number | string) {
  if (typeof v === 'number') return v;
  const s = String(v || '').trim().replace(/\s/g, '');
  return Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s) || 0;
}
export const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export function para(n: number, doviz = 'TL') {
  return (Number(n) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + (doviz === 'TL' ? ' ₺' : ' ' + doviz);
}
export function tarihTR(t?: string | null) { return t ? t.slice(0, 10).split('-').reverse().join('.') : ''; }
export function bugunISO() { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); }

export function toplamlar(kalemler: Kalem[]) {
  let ara = 0, isk = 0; const kdv: Record<string, number> = {};
  kalemler.forEach((k) => {
    const brut = r2(sayi(k.miktar) * sayi(k.birim_fiyat));
    const i = r2(brut * Math.min(100, sayi(k.iskonto_oran)) / 100);
    const net = r2(brut - i);
    ara += brut; isk += i;
    const o = String(sayi(k.kdv_oran));
    kdv[o] = (kdv[o] || 0) + r2(net * sayi(k.kdv_oran) / 100);
  });
  const kdvT = Object.values(kdv).reduce((a, b) => a + b, 0);
  return { ara: r2(ara), isk: r2(isk), kdv, kdvT: r2(kdvT), genel: r2(ara - isk + kdvT) };
}
