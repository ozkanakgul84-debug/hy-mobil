import { istek } from './client';

/* Departman Panoları (hy-erp/v1/pano, web 26.11 hy-panolar). Web panelindeki panolar.js ile aynı uçlar ve alanlar. */
export interface PanoSutun { id: string; ad: string; tur?: 'giris' | 'ara' | 'disarida' | 'bitis' | string }
export interface PanoBolum { id: string; ad: string; disAdimlar?: string[]; sutunlar: PanoSutun[]; gorenler?: string[]; yonetenler?: string[] }
export interface Pano { id: string; ad: string; ikon?: string; tur: 'crm' | 'is'; gonderen?: string; bitinceGonder?: string; bolumler?: PanoBolum[] }
export interface PanoYapi { panolar: Pano[]; disPano?: string; sablon?: string }
export interface PanoBen { kullanici: string; yonetici?: boolean; gorur: string[]; yonetir: string[]; tedarikGorur?: boolean }
export interface DisAdim { id: number | string; adim: string; durum: 'planli' | 'istendi' | 'onaylandi' | 'gonderildi' | 'geldi' | string; not?: string; tedarikci?: string; donus?: string }
export interface IsKarti { id: number; kod?: string; pano: string; bolum: string; sutun: string; baslik: string; aciklama?: string; kart_id: number; musteri?: string; kart_tanim?: string; dis?: DisAdim[]; log?: string; meta?: any }

export const panoYapi = () => istek<{ yapi: PanoYapi; ben: PanoBen; personel?: any[] }>('hy-erp/v1/pano/yapi');
export const panoIsler = () => istek<{ isler: IsKarti[]; bekleyen?: IsKarti[] }>('hy-erp/v1/pano/isler');
export const kartIsleri = (kartId: number) => istek<{ isler: IsKarti[]; gonderebilir?: string[] }>(`hy-erp/v1/pano/kart/${kartId}`);
export const isEmriVer = (kartId: number, kalemler: { pano: string; bolum: string; baslik: string; aciklama: string; dis: string[] }[]) =>
  istek<any>('hy-erp/v1/pano/is', { govde: { kart_id: kartId, kalemler } });
export const isIslem = (id: number, govde: Record<string, any>) => istek<any>(`hy-erp/v1/pano/is/${id}`, { govde });
export const disIslem = (id: number, govde: Record<string, any>) => istek<any>(`hy-erp/v1/pano/is/${id}/dis`, { govde });

export const DIS_DURUM: Record<string, string> = { planli: 'Planlı', istendi: 'Onay bekliyor', onaylandi: 'Onaylandı, satınalmada', gonderildi: 'Dışarıda', geldi: 'Geldi' };
export const panoBul = (y: PanoYapi | null, id: string) => y?.panolar.find((p) => p.id === id);
export const bolumBul = (p: Pano | undefined, id: string) => p?.bolumler?.find((b) => b.id === id) || p?.bolumler?.[0];
export const gorur = (ben: PanoBen | null, p: Pano, b?: PanoBolum) => !!ben && (ben.yonetici || (b ? ben.gorur.includes(`${p.id}/${b.id}`) : ben.gorur.some((g) => g.startsWith(p.id + '/'))));
export const yonetir = (ben: PanoBen | null, p: Pano, b?: PanoBolum) => !!ben && (ben.yonetici || (b ? ben.yonetir.includes(`${p.id}/${b.id}`) : ben.yonetir.some((g) => g.startsWith(p.id + '/'))));
