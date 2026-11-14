import { aktifOturum, istek } from './client';
import { sutunlar } from './sutun';

/* ── E-posta (hy-eposta/v1) ── */
export interface EpMesaj {
  id: number; rol: 'gelen' | 'giden'; kimden_ad?: string; kimden?: string; kime?: { ad: string; email: string }[];
  konu: string; ozet?: string; tarih: string; okundu?: number; ek_sayisi?: number; hesap_id?: number; message_id?: string;
  takip?: any;
}
export interface EpMesajTam extends EpMesaj {
  html?: string; text?: string; cc?: { ad: string; email: string }[]; reply_to?: string;
  ekler?: { id: number; ad: string; mime: string; boyut: number; url: string; gor?: string }[];
}
export interface EpHesap { id: number; ad: string; email: string; aktif: number; gonderebilir: number; erisim: string; imza?: string }

export const kartEpostalari = (kartId: number) => istek<{ mesajlar: EpMesaj[] }>(`hy-eposta/v1/kart/${kartId}/mesajlar`);
export const epostaGetir = (id: number) => istek<EpMesajTam>(`hy-eposta/v1/mesaj/${id}`);
export async function epostaHesaplari(): Promise<EpHesap[]> {
  const r = await istek<{ hesaplar?: EpHesap[] }>('hy-eposta/v1/klasorler');
  return (r.hesaplar || []).filter((h) => h.gonderebilir && h.erisim === 'gonder' && h.aktif);
}
/** Web panelinin gönderdiği alanlarla aynı (FormData). Gövde düz metinden HTML'e çevrilir. */
export async function epostaGonder(g: { hesap_id: number; kime: string; cc?: string; konu: string; metin: string; kart_id: number; yanit_id?: number; dosyalar?: { blob: Blob; ad: string }[]; imzaHtml?: string }) {
  const kac = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
  const fd = new FormData();
  fd.append('hesap_id', String(g.hesap_id));
  fd.append('kime', g.kime);
  fd.append('cc', g.cc || '');
  fd.append('bcc', '');
  fd.append('konu', g.konu);
  fd.append('html', kac(g.metin).replace(/\n/g, '<br>') + (g.imzaHtml ? '<br><br>' + g.imzaHtml : ''));
  if (g.yanit_id) fd.append('yanit_id', String(g.yanit_id));
  fd.append('kart_id', String(g.kart_id));
  fd.append('okundu_iste', '1');
  (g.dosyalar || []).forEach((d) => fd.append('dosyalar[]', d.blob, d.ad));
  return istek<any>('hy-eposta/v1/gonder', { govde: fd });
}
/** Hesabın varsayılan imzası (web panelindeki gibi). */
export function hesapImzasi(h?: EpHesap): string {
  if (!h?.imza) return '';
  try { const j = JSON.parse(h.imza); const l = j.liste || []; const v = l.find((x: any) => x.id === j.varsayilan) || l[0]; return v?.html || ''; } catch { return ''; }
}

/* ── Kart içi yazışma (hy-yazisma/v1) ── */
export interface YzMesaj { id: number; yazan?: string; metin: string; tarih?: string; ekler?: { url: string; ad: string; mime?: string }[]; silindi?: boolean }
export async function kartYazismasi(kartId: number): Promise<{ mesajlar: YzMesaj[]; kanalId: number }> {
  try {
    const r = await istek<any>(`hy-yazisma/v1/kart/${kartId}`);
    return { mesajlar: r.mesajlar || [], kanalId: r.kanal?.id || 0 };
  } catch (e: any) {
    if (e?.durum === 404) return { mesajlar: [], kanalId: 0 };
    throw e;
  }
}
export const yazismaGonder = (kartId: number, kanalId: number, metin: string) =>
  istek<any>('hy-yazisma/v1/mesaj', { govde: kanalId ? { metin, ekler: [], yanit_id: 0, kanal_id: kanalId } : { metin, ekler: [], yanit_id: 0, kart_id: kartId } });

/* ── Dosyalar (kart arşiv klasörü) ── */
export interface KartDosya { id: number; ad: string; alt_klasor: string; alt_yol?: string; boyut: number; mime: string; kaynak?: string; durum?: string; yukleyen?: string; tarih: string; url?: string; indir_url?: string; uzak?: boolean }
export const kartDosyalari = (kartId: number) =>
  istek<{ klasor: string; alt_klasorler: string[]; dosyalar: KartDosya[]; yerel_uygulama?: { bagli?: boolean } }>(`hy-erp/v1/arsiv/kart/${kartId}`);

/* ── Sipariş no, müşteriye takip linki, hızlı iş (hy-siparis/v1) ── */
export interface Siparis { aktif: boolean; siparis: null | { no: string; hizli: number; link?: string; wa?: string; eposta?: string; son_gonderim?: string | null; gonderim?: number }; no?: string }
export const siparisGetir = (kartId: number) => istek<Siparis>(`hy-siparis/v1/kart/${kartId}`);
export const siparisOlustur = (kartId: number) => istek<Siparis>(`hy-siparis/v1/kart/${kartId}/olustur`, { govde: {} });
export const siparisLinkGonder = (kartId: number) => istek<{ sonuc: { wa?: string; eposta?: string }; siparis: Siparis['siparis'] }>(`hy-siparis/v1/kart/${kartId}/gonder`, { govde: {} });
export const hizliIs = (kartId: number, deger: boolean) => istek<Siparis>(`hy-siparis/v1/kart/${kartId}/hizli`, { govde: { deger } });

/* ── Nereden geldi (hy-pazarlama/v1) ── */
export const neredenGetir = (kartId: number) => istek<{ nereden: string; kim?: string; secenekler: string[] }>(`hy-pazarlama/v1/kart/${kartId}/nereden`);
export const neredenKaydet = (kartId: number, nereden: string) => istek<any>(`hy-pazarlama/v1/kart/${kartId}/nereden`, { govde: { nereden } });

/* ── Saha görevleri ── */
export interface SahaGorevi { id: number; tur: string; tur_ad?: string; durum: string; durum_ad?: string; tarih: string; saat?: string; atanan?: string; atanan_ad?: string; notlar?: string }
export interface SahaSecenek { turler: Record<string, string>; personel: { kullanici_adi: string; unvan?: string; saha_rolu?: string }[]; ekipler?: { id: string | number; ad: string }[]; [k: string]: any }
export const kartSahaGorevleri = (kartId: number) =>
  istek<{ gorevler: SahaGorevi[]; atayabilir: boolean; secenekler: SahaSecenek }>(`hy-erp/v1/saha/kartlar/${kartId}/gorevler`);
export const sahaGoreviVer = (g: { kart_id: number; tur: string; tarih: string; saat: string; sure_dk: number; atanan_tip: string; atanan: string; notlar: string }) =>
  istek<any>('hy-erp/v1/saha/gorevler', { govde: g });

/* ── Teklifler (hy-teklif/v1) ── */
export interface Teklif { id: number; teklif_no: string; durum: string; kart_id: number; genel_toplam?: number | string; toplam?: number | string; tarih?: string; olusturma?: string; olusturan?: string }
export async function kartTeklifleri(kartId: number): Promise<Teklif[]> {
  const r = await istek<any>('hy-teklif/v1/teklifler', { sorgu: { kart_id: kartId } });
  return Array.isArray(r) ? r : r?.teklifler || [];
}

/* ── Arşivle (web panelindeki sebep penceresiyle aynı alanlar) ── */
export const ARSIV_SEBEPLERI: [string, string][] = [
  ['fiyat', '💰 Fiyat pahalı geldi'], ['termin', '⏳ Termin uzun geldi'], ['vazgecti', '🙅 Müşteri vazgeçti'],
  ['rakip', '🏁 Rakip aldı'], ['diger', '✏️ Diğer'],
];
export function arsivSutunId() {
  const s = (aktifOturum()?.isAkisi?.sutunlar as any[] | undefined)?.find((x) => x.arsiv);
  return s?.id || sutunlar().find((x) => x.arsiv)?.id || 'ARSIV';
}
export const kartiArsivle = (kartId: number, sebep?: { arsivSebep: string; arsivAciklama: string }) =>
  istek<any>(`hy-erp/v1/crm/kartlar/${kartId}`, { metot: 'PATCH', govde: { durum: arsivSutunId(), ...(sebep || {}) } });

/* ── Ses kaydı ve adres ── */
export const medyaYukle = (kartId: number, tip: 'ses' | 'foto', dataUrl: string, uzanti: string, sure = '') =>
  istek<{ logTam?: string }>(`hy-erp/v1/crm/kartlar/${kartId}/medya`, { govde: { tip, dosya: dataUrl, uzanti, sure, kisi: aktifOturum()?.kullaniciAdi || 'Mobil' } });
export const adresEkle = (kartId: number, deger: string) =>
  istek<{ adres_panosu?: any }>(`hy-erp/v1/crm/kartlar/${kartId}/adres-ekle`, { govde: { deger } });

export function boyutYaz(b: number) {
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return Math.round(b / 1024) + ' KB';
  return (b / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB';
}

/* ── Tasarım (hy-tasarim/v1): karta bağlı 2D/3D tasarım projeleri ── */
export interface TasarimProje { id: number; ad: string; rev: number; kart_id?: number; tarih?: string; onizleme?: string }
export async function kartTasarimlari(kartId: number): Promise<TasarimProje[]> {
  const l = await istek<TasarimProje[]>('hy-tasarim/v1/projeler', { sorgu: { kart_id: kartId, son: 50 } });
  return (Array.isArray(l) ? l : []).filter((p) => !p.kart_id || +p.kart_id === kartId);
}
