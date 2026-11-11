import { aktifOturum } from './client';

const VARSAYILAN = [
  { id: 'gelen', ad: '📥 Gelen Talepler', renk: '#4ea8de' },
  { id: 'olcu', ad: '📐 Ölçü & Onay', renk: '#f9ca24' },
  { id: 'tasarim', ad: '🎨 Tasarım', renk: '#a29bfe' },
  { id: 'uretim', ad: '🔧 Üretim', renk: '#fd79a8' },
  { id: 'teslim', ad: '🚚 Teslim', renk: '#00b894' },
  { id: 'arsiv', ad: '📁 Arşiv', renk: '#636e72' },
];

export type Sutun = { id: string; ad: string; renk: string; arsiv?: boolean };

/** Sunucu sütunları: firmanın eklediklerinde ad "etiket" alanında, sırası "sira"da. */
export function sutunlar(): Sutun[] {
  const s = aktifOturum()?.isAkisi?.sutunlar as any[] | undefined;
  if (!s || !s.length) return VARSAYILAN;
  return s.slice().sort((a, b) => (a.sira || 0) - (b.sira || 0))
    .map((x) => ({ id: x.id, ad: x.ad || x.etiket || x.id, renk: x.renk || '#8a94a6', arsiv: !!x.arsiv || x.id === 'arsiv' }));
}

export type SurecAdimi = { key: string; etiket: string; hedefSutun?: string | null; aksiyon?: string; sira?: number };

/** Kartın üstündeki süreç adımları (iş akışı). Yalnız işaretlenebilen (aksiyonsuz / peşinat / teslim) adımlar. */
export function surecAdimlari(): SurecAdimi[] {
  const o = aktifOturum();
  const ia: any = o?.isAkisi || {};
  const ham: any[] = ia.surecAdimlari || ia.surec_adimlari || [];
  const yetki: any = (o as any)?.surecButonYetkileri;
  const izin = (k: string) => o?.rol === 'YONETICI' || !yetki || yetki[k] === undefined || !!yetki[k];
  return ham.map((a, i) => ({ ...a, etiket: (a.etiket || a.ad || a.key).trim(), sira: a.sira ?? i }))
    .filter((a) => ['yok', 'pesinatAlindi', 'teslimEdildi', undefined, null, ''].includes(a.aksiyon) && izin(a.key))
    .sort((a, b) => (a.sira || 0) - (b.sira || 0));
}

export function sutun(id: string) {
  return sutunlar().find((x) => x.id === id) || { id, ad: id, renk: '#8a94a6' };
}
