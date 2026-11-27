import {
  bagOutline, barChartOutline, briefcaseOutline, calculatorOutline, callOutline, cashOutline, constructOutline,
  cubeOutline, documentTextOutline, idCardOutline, listOutline, locationOutline, megaphoneOutline, peopleOutline,
  receiptOutline, scaleOutline, colorPaletteOutline, brushOutline, imagesOutline, sparklesOutline,
} from 'ionicons/icons';
import { istek } from './client';
import type { Oturum } from './types';

/** Sunucunun modül özet servisi (hy-erp/v1/modul-ozet/{mod}); web panelindeki modül ana sayfalarıyla aynı veri. */
export type Satir = { b: string; a?: string; s?: string; r?: string; git?: { kart?: number } | null };
export type Panel =
  | { tip: 'liste'; satir?: Satir[]; bos?: string }
  | { tip: 'dagilim'; dilim?: [string, number, string?][]; adet?: boolean; bos?: string }
  | { tip: 'uyari'; uyari?: [string, string, string?][] }
  | { tip: 'kutu'; kutu?: [string, string, { dugme?: string }, boolean?][] }
  | { tip: 'hub' };
export interface ModulOzet {
  modul: string;
  duzen: { ozet: boolean; kpi: string[]; panel: string[] };
  katalog: { ad: string; ikon?: string; git: string; yakinda?: boolean; kpi: Record<string, [string, string, string]>; panel: Record<string, string> };
  veri: { kpi?: Record<string, [string | number, string]>; panel?: Record<string, Panel>; ozet?: string; yetkisiz?: boolean; yok?: string };
  yonetici?: boolean;
}
export interface AnaOzet {
  kartlar?: { acik: number; haftaYeni: number };
  termin?: { gecen: { id: number; musteri: string; gun?: number }[]; gecenSayi: number; yaklasan: number };
  teklif?: { sayi: number; toplam: number };
  okunmamis?: { wa: number; ep: number };
  mesajlar?: { kid: number; metin: string; tip: string; zaman: string; kanal: 'wa' | 'ep'; musteri: string }[];
  bekleyen?: { id: number; musteri: string; sutun: string; gun: number }[];
  dagilim?: { id: string; ad: string; sayi: number }[];
  fiyatGorebilir?: boolean;
  mesajGorebilir?: boolean;
  crm?: boolean;
}

export const modulOzet = (mod: string) => istek<ModulOzet>(`hy-erp/v1/modul-ozet/${mod}`);
export const anaOzet = () => istek<AnaOzet>('hy-erp/v1/anasayfa/ozet');
export const ozetAyar = () => istek<{ ozet: Record<string, boolean>; yonetici?: boolean }>('hy-erp/v1/modul-ozet-ayar');

/** Web panelindeki bir yeri açmak için tıklanacak öğeler (sırayla). '#btnx' gibi CSS seçicileri. */
export type PanelHedef = string[];

export interface AltBolum { ad: string; acik: string; ikon: string; hedef?: PanelHedef; yol?: string; yakinda?: boolean }
export interface ModulTanim {
  id: string;            // modul-ozet anahtarı (crm için özel)
  ad: string;
  acik: string;
  ikon: string;
  yol?: string;          // uygulamada yerel ekranı varsa
  hedef: PanelHedef;     // panelde açılacak yer
  lisans?: string[];     // aktifModuller anahtarlarından biri gerekir
  alt?: AltBolum[];
}

const hub = (mod: string, i: number): PanelHedef => [`#btn${mod}`, `#p-${mod} .hm-kutu[data-i="${i}"]`];

/** Sol menüyle aynı sıra (özkan 2026-11-12): Pazarlama, CRM, Fiyatlandırma, Tasarım ve Sunumlar, Üretim, Depolama,
 *  Muhasebe (Teklifler, Perakende Satış, Günlük Harcamalar), İK, Saha Takip, IP Santral, Dijital Pazarlama, Listeler. */
export const MODULLER: ModulTanim[] = [
  { id: 'pazarlama', ad: 'Pazarlama', acik: 'Aranacaklar, temaslar, kaynaklar', ikon: megaphoneOutline, hedef: ['#btnpazarlama'], lisans: ['pazarlama'] },
  { id: 'crm', ad: 'CRM', acik: 'Müşteri kartları ve yazışmalar', ikon: peopleOutline, yol: '/kartlar', hedef: ['#btncrm'], lisans: ['crm'] },
  {
    id: 'fiyatlama', ad: 'Fiyatlandırma', acik: 'İşin fiyatını çıkar', ikon: calculatorOutline, yol: '/fiyat', hedef: ['#btnfiyatlama'], lisans: ['fiyatlandirma', 'fiyatlama'],
    alt: [{ ad: 'Fiyat hesapla', acik: 'Kabartma harf ve zemin', ikon: calculatorOutline, yol: '/fiyat' }, { ad: 'Panelde fiyatlandırma', acik: 'Tüm hesap modülleri', ikon: barChartOutline, hedef: ['#btnfiyatlama'] }],
  },
  {
    id: 'teklifhub', ad: 'Tasarım ve Sunumlar', acik: '2D / 3D tasarım, görsel sunum ve teklif', ikon: colorPaletteOutline, hedef: ['#btnteklifhub'], lisans: ['teklif'],
    alt: [
      { ad: '2D Tasarım', acik: 'Cam giydirme, roll-up, araç kaplama; her kayıt karta revizyon', ikon: brushOutline, hedef: hub('teklifhub', 0) },
      { ad: '3D Tasarım', acik: 'Harf ve zemin, malzeme ve ışık, gerçekçi render', ikon: cubeOutline, hedef: hub('teklifhub', 1) },
      { ad: 'Görsel Sunum Hazırla', acik: 'Hazır şablonlarla 3D görselli sunum', ikon: imagesOutline, hedef: hub('teklifhub', 2), yakinda: true },
      { ad: 'Görsel Teklif Oluştur', acik: 'Gündüz ve gece görselli teklif', ikon: sparklesOutline, hedef: hub('teklifhub', 3), yakinda: true },
    ],
  },
  {
    id: 'uretimhub', ad: 'Üretim', acik: 'Takip, reçeteler, yapılış föyü, saha takvimi', ikon: constructOutline, hedef: ['#btnuretimhub'], lisans: ['uretimModulu', 'uretimTakip', 'urunRecetesi'],
    alt: [
      { ad: 'Üretim Takip', acik: 'İş emirleri, istasyonlar, QR', ikon: listOutline, hedef: hub('uretimhub', 0) },
      { ad: 'Ürün Reçeteleri', acik: 'Malzeme ağacı ve maliyet', ikon: cubeOutline, hedef: hub('uretimhub', 1) },
      { ad: 'Yapılış Föyü', acik: 'Görsel şemalı üretim föyü', ikon: documentTextOutline, hedef: hub('uretimhub', 2) },
      { ad: 'Saha Takvimi', acik: 'Montaj ve saha görevleri', ikon: locationOutline, hedef: hub('uretimhub', 3) },
    ],
  },
  { id: 'depo', ad: 'Depolama', acik: 'Stok, hareketler, fire', ikon: bagOutline, hedef: ['#btndepo'], lisans: ['muhasebeStok', 'depo'] },
  {
    id: 'muhasebe', ad: 'Muhasebe', acik: 'Fatura, cari, teklif, perakende, harcama', ikon: scaleOutline, yol: '/muhasebe', hedef: ['#btnmuhasebe'], lisans: ['muhasebe', 'muhasebeStok'],
    alt: [
      { ad: 'Faturalar ve cariler', acik: 'Fatura kes, cari ekle', ikon: receiptOutline, yol: '/muhasebe' },
      { ad: 'Teklif Listesi', acik: 'Verilen teklifler, durumları ve PDF', ikon: documentTextOutline, hedef: ['#btnteklif'] },
      { ad: 'Perakende Satış', acik: 'Kasadan hızlı satış', ikon: cashOutline, hedef: ['#btnperakende'] },
      { ad: 'Günlük Harcamalar', acik: 'Nakit kasadan harcama girişi', ikon: receiptOutline, hedef: ['#btnhizliharcama'] },
    ],
  },
  {
    id: 'ikhub', ad: 'İnsan Kaynakları', acik: 'Talepler, izinler, başvurular', ikon: idCardOutline, hedef: ['#btnikhub'],
    alt: ['Talepler', 'İzin Takvimi', 'Giriş/Çıkış (Perkotek)', 'İş Başvuruları', 'Sözleşmeler', 'Ayarlar'].map((ad, i) => ({ ad, acik: '', ikon: idCardOutline, hedef: hub('ikhub', i), yakinda: i === 2 })),
  },
  {
    id: 'sahahub', ad: 'Saha Takip', acik: 'Saha ekibi ve araçlar', ikon: locationOutline, hedef: ['#btnsahahub'], lisans: ['saha', 'personelTakip'],
    alt: [
      { ad: 'Saha görevlerim', acik: 'Uygulamadaki saha ekranı', ikon: locationOutline, yol: '/saha' },
      { ad: 'Saha Personeli Takip', acik: 'Ekibin konumu ve görev durumu', ikon: peopleOutline, hedef: hub('sahahub', 0) },
      { ad: 'Taşıt Takip', acik: 'Araçların konumu ve kullanımı', ikon: briefcaseOutline, hedef: hub('sahahub', 1) },
    ],
  },
  { id: 'ipsantral', ad: 'IP Santral', acik: 'Çağrılar', ikon: callOutline, hedef: ['#btnipsantral'], lisans: ['ipSantral'] },
  { id: 'dijital', ad: 'Dijital Pazarlama', acik: 'Site talepleri, paketler', ikon: barChartOutline, hedef: ['#btndijital'], lisans: ['dijitalReklam'] },
  {
    id: 'listeler', ad: 'Listeler', acik: 'Malzeme, cari, personel', ikon: listOutline, hedef: ['#btnlisteler'],
    alt: [{ ad: 'Listeleri aç', acik: 'Ortak listeler', ikon: listOutline, hedef: ['#btnlisteler'] }, { ad: 'Teknik Kütüphane', acik: '', ikon: documentTextOutline, hedef: ['#ktUstDugme'] }],
  },
];

export function modulBul(id: string) { return MODULLER.find((m) => m.id === id); }

/** Lisans: yönetici veya modül listesi yoksa hepsi görünür; aksi halde ilgili anahtar gerekir. */
export function modulAcik(m: ModulTanim, o: Oturum | null) {
  const am = o?.aktifModuller || [];
  if (!m.lisans || !am.length) return true;
  return m.lisans.some((l) => am.includes(l));
}

/** "Bugün <b>3 iş</b> var" → parçalar (kalın kısımlar işaretli). HTML olarak basmayız. */
export function kalinParcala(metin = ''): { t: string; k: boolean }[] {
  return metin.replace(/<br\s*\/?>/gi, ' ').split(/(<b>.*?<\/b>)/i).filter(Boolean).map((p) => {
    const k = /^<b>/i.test(p);
    return { t: p.replace(/<[^>]+>/g, ''), k };
  });
}

export function once(z?: string) {
  if (!z || !/^\d{4}-\d\d-\d\d/.test(z)) return z || '';
  const t = new Date(z.replace(' ', 'T'));
  if (isNaN(+t)) return z;
  const dk = Math.round((Date.now() - +t) / 60000);
  if (dk < 0) return t.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  if (dk < 1) return 'şimdi';
  if (dk < 60) return dk + ' dk';
  if (dk < 1440) return Math.round(dk / 60) + ' sa';
  if (dk < 60 * 24 * 60) return Math.round(dk / 1440) + ' gün';
  return t.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
}
