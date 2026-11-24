import { istek } from './client';
import type { Bildirim, Gorev, GorevDurum, Kart, LogSatiri, WaYazisma } from './types';

export async function kartlariGetir(): Promise<Kart[]> {
  const v = await istek<{ kartlar: Kart[] }>('hy-erp/v1/crm/kartlar');
  return v.kartlar || [];
}

export async function kartGetir(id: number): Promise<Kart> {
  const v = await istek<any>(`hy-erp/v1/crm/kartlar/${id}`);
  return (v.kart || v) as Kart;
}

export type KartAlanlari = Partial<Pick<Kart, 'musteri' | 'telefon' | 'email' | 'tanim' | 'durum'>>;

export async function kartGuncelle(id: number, alanlar: KartAlanlari) {
  return istek(`hy-erp/v1/crm/kartlar/${id}`, { metot: 'PATCH', govde: alanlar });
}

/** Kişi bilgileri (ad/telefon/e-posta) ayrı uçtan güncellenir; değişiklik karta log olarak düşer. */
export async function kisiGuncelle(id: number, v: { musteri: string; telefon: string; email: string }) {
  return istek(`hy-erp/v1/crm/kartlar/${id}/kisi`, { metot: 'PATCH', govde: v });
}

export async function kartAc(alanlar: { musteri: string; telefon: string; email: string; kaynak: string; tanim: string; musteri_kategori?: string }): Promise<number | undefined> {
  const r = await istek<any>('hy-erp/v1/crm/kartlar', { govde: alanlar });
  const k = r?.yeniKart || r?.kart || r;
  return Number(k?.id || k?.ID || k?.kart_id) || undefined;
}

/** Süreç adımını işaretler/kaldırır (web panelindeki kart üstü adımlar ile aynı uç). */
export async function surecIsaretle(id: number, govde: { adim: string; deger: boolean; hedefSutun: string; adimEtiketi: string; onayTarihi: string | null; teslimTarihi: string | null }) {
  return istek(`hy-erp/v1/crm/kartlar/${id}/surec`, { metot: 'PATCH', govde });
}

export async function waGetir(id: number, degisim = ''): Promise<WaYazisma> {
  return istek<WaYazisma>(`hy-erp/v1/crm/kartlar/${id}/whatsapp`, { sorgu: degisim ? { degisim } : {} });
}

export async function waGonder(id: number, mesaj: string, dosya?: { blob: Blob; ad: string }, kime = '') {
  const fd = new FormData();
  if (mesaj) fd.append('mesaj', mesaj);
  if (kime) fd.append('kime', kime);
  if (dosya) fd.append('dosya', dosya.blob, dosya.ad);
  return istek(`hy-erp/v1/crm/kartlar/${id}/whatsapp`, { govde: fd });
}

/** WhatsApp 📎 menüsü: firma (cari) bilgileri, banka hesapları, konum. Web paneliyle aynı uç. */
export interface WaAtacBilgi { firma: { unvan?: string; vergi_no?: string; vergi_dairesi?: string; adres?: string; telefon?: string; email?: string; web?: string; konum?: string }; hesaplar: { ad?: string; banka?: string; iban?: string; doviz?: string; sahip?: string }[] }
export const waAtacBilgi = () => istek<WaAtacBilgi>('hy-erp/v1/wa/atac-bilgi');

/** Kartın ek numaraları ("Kime" seçimi). pencere: son 24 saatte yazdı mı. */
export const waEkNumara = (id: number) => istek<{ numaralar: { telefon: string; ad?: string; pencere?: boolean }[]; ana_pencere?: boolean }>(`hy-erp/v1/crm/kartlar/${id}/ek-numara`);

/** Panelin hy-wa-atac metin biçimleri. */
export function cariMetni(f: WaAtacBilgi['firma']) {
  const v = [f.vergi_dairesi, f.vergi_no].filter(Boolean).join(' / ');
  return ['*Firma bilgilerimiz*', f.unvan && 'Ünvan: ' + f.unvan, v && 'Vergi dairesi / no: ' + v, f.adres && 'Adres: ' + f.adres, f.telefon && 'Telefon: ' + f.telefon, f.email && 'E-posta: ' + f.email].filter(Boolean).join('\n');
}
export function ibanMetni(b: WaAtacBilgi) {
  const h = (b.hesaplar || []).filter((x) => x.iban);
  if (!h.length) return '';
  return '*Banka hesap bilgilerimiz*\n' + h.map((x) => [
    'Hesap adı: ' + (x.sahip || x.ad || b.firma.unvan || ''),
    'Banka: ' + (x.banka || '') + (x.doviz && x.doviz !== 'TL' ? ` (${x.doviz} hesabı)` : ''),
    'IBAN: ' + x.iban,
  ].join('\n')).join('\n\n');
}
export function konumMetni(f: WaAtacBilgi['firma']) {
  const url = f.konum || 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent([f.unvan, f.adres].filter(Boolean).join(' '));
  return ['📍 *Konumumuz*', f.unvan && '*' + f.unvan + '*', f.adres, url].filter(Boolean).join('\n');
}

export async function logEkle(id: number, metin: string) {
  return istek(`hy-erp/v1/crm/kartlar/${id}/log`, { govde: { yorum: metin, tip: 'yorum' } });
}

export async function gorevleriGetir(aralik: 'bugun' | 'hafta' | 'tumu'): Promise<Gorev[]> {
  const v = await istek<{ gorevler: Gorev[] }>('hy-erp/v1/saha/gorevler', { sorgu: { aralik } });
  return v.gorevler || [];
}

export async function gorevGetir(id: number): Promise<Gorev & { tanim_tam?: string }> {
  const v = await istek<any>(`hy-erp/v1/saha/gorevler/${id}`);
  return (v.gorev || v) as Gorev;
}

export async function gorevDurum(id: number, durum: GorevDurum, ek: { lat?: number; lng?: number; teslim_alan?: string } = {}) {
  return istek(`hy-erp/v1/saha/gorevler/${id}/durum`, { govde: { durum, ...ek } });
}

export async function fotoYukle(kartId: number, base64: string, uzanti: string, kategori: 'kesif' | 'teslim', not = '') {
  const istemci_id = 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  return istek<{ url: string }>(`hy-erp/v1/saha/kartlar/${kartId}/medya`, {
    govde: { dosya: base64, uzanti, tip: 'foto', kategori, not, istemci_id },
  });
}

export async function bildirimler(): Promise<{ okunmamis: number; liste: Bildirim[] }> {
  const v = await istek<any>('hy-bildirim/v1/ozet', { sorgu: { liste: 1 } });
  return { okunmamis: v.okunmamis || 0, liste: v.liste || [] };
}

export async function bildirimOkundu(id?: number) {
  return istek('hy-bildirim/v1/okundu', { govde: id ? { id } : { tumu: 1 } });
}

/** Push cihaz kaydı. NOT: sunucudaki /cihaz şu an yalnız Web Push aboneliği kabul ediyor;
 *  FCM token'ı için hesaplayonet-bildirim'e küçük bir ek gerekecek (Firebase kurulunca). */
export async function cihazKaydet(token: string, platform: string) {
  return istek('hy-bildirim/v1/cihaz-fcm', { govde: { token, platform } });
}

/** Kartın log metnini satırlara böler: "[tarih] metin [FOTO:url]" */
export function logCoz(metin: string): LogSatiri[] {
  return (metin || '').split('\n').filter(Boolean).map((s) => {
    // Biçim: "💬 [08.11.2026 14:05:12] @kisi: metin [FOTO:url]"
    const m = s.match(/\[([0-9]{2}\.[0-9]{2}\.[0-9]{4}[^\]]*)\]\s*(.*)$/);
    const foto = s.match(/\[FOTO:([^\]|]+)/)?.[1];
    const zaman = m ? m[1].trim() : '';
    const govde = (m ? m[2] : s).replace(/\[(FOTO|VIDEO|SES):[^\]]*\]/g, '').replace(/\{[a-z0-9_-]+\}/gi, '').replace(/^:\s*/, '').trim();
    return { zaman, metin: govde, foto };
  }).reverse();
}

export function adresMetni(p: Kart['adres_panosu'] | Gorev['adres_panosu']): { metin: string; lat?: number; lng?: number } {
  let o: any = p;
  if (typeof p === 'string') { try { o = JSON.parse(p); } catch { o = {}; } }
  if (!o) return { metin: '' };
  const ilk = Array.isArray(o.adresler) ? o.adresler[0] : o;
  const metin = [ilk?.adres, ilk?.mahalle, ilk?.ilce, ilk?.il].filter(Boolean).join(', ') || ilk?.metin || '';
  const lat = Number(ilk?.lat || ilk?.enlem) || undefined;
  const lng = Number(ilk?.lng || ilk?.boylam) || undefined;
  return { metin, lat, lng };
}

/* ── Müşteri kategorisi (web 23.11, hy-musteri-kategori) ── */
export type MusteriKategori = 'fason' | 'ajans' | 'mimar' | 'son';
export const MUSTERI_KATEGORILERI: [MusteriKategori, string][] = [['fason', 'Fason'], ['ajans', 'Ajans'], ['mimar', 'Mimar'], ['son', 'Son kullanıcı']];
/** Cari musteri_tipi değerinden kategori. */
export const tiptenKategori = (t?: string): MusteriKategori | '' =>
  t === 'tabelaci' || t === 'fason' ? 'fason' : t === 'ajans' ? 'ajans' : t === 'mimar' ? 'mimar' : t === 'kapi' || t === 'kurumsal' || t === 'son' ? 'son' : '';
export const kartKategorisi = (kartId: number) => istek<{ kart_id: number; cari?: boolean; kategori: MusteriKategori | ''; ad?: string; fiyat_tipi?: string }>(`hy-erp/v1/musteri-kategori/kart/${kartId}`);
export const cariKategoriKaydet = (cariId: number, kategori: MusteriKategori) => istek<any>(`hy-erp/v1/musteri-kategori/cari/${cariId}`, { govde: { kategori } });
