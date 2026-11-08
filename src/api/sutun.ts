import { aktifOturum } from './client';

const VARSAYILAN = [
  { id: 'gelen', ad: '📥 Gelen Talepler', renk: '#4ea8de' },
  { id: 'olcu', ad: '📐 Ölçü & Onay', renk: '#f9ca24' },
  { id: 'tasarim', ad: '🎨 Tasarım', renk: '#a29bfe' },
  { id: 'uretim', ad: '🔧 Üretim', renk: '#fd79a8' },
  { id: 'teslim', ad: '🚚 Teslim', renk: '#00b894' },
  { id: 'arsiv', ad: '📁 Arşiv', renk: '#636e72' },
];

export function sutunlar() {
  const s = aktifOturum()?.isAkisi?.sutunlar;
  return s && s.length ? s : VARSAYILAN;
}

export function sutun(id: string) {
  return sutunlar().find((x) => x.id === id) || { id, ad: id, renk: '#8a94a6' };
}
