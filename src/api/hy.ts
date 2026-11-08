import { istek } from './client';
import type { Bildirim, Gorev, GorevDurum, Kart, LogSatiri } from './types';

export async function kartlariGetir(): Promise<Kart[]> {
  const v = await istek<{ kartlar: Kart[] }>('hy-erp/v1/crm/kartlar');
  return v.kartlar || [];
}

export async function kartGetir(id: number): Promise<Kart> {
  const v = await istek<any>(`hy-erp/v1/crm/kartlar/${id}`);
  return (v.kart || v) as Kart;
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
    const govde = (m ? m[2] : s).replace(/\[(FOTO|VIDEO|SES):[^\]]*\]/g, '').replace(/\{[a-z0-9_-]+\}/gi, '').trim();
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
