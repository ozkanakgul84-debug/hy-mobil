export interface Oturum {
  token: string;
  kullaniciAdi: string;
  sirketKodu: string;
  sirketAdi: string;
  rol: string;
  unvan?: string;
  aktifModuller?: string[];
  kartGorusYetkileri?: {
    aramaYapabilir?: boolean;
    iletisimGorebilir?: boolean;
    fiyatGorebilir?: boolean;
    waMailKullanabilir?: boolean;
    kameraKullanabilir?: boolean;
  };
  isAkisi?: { sutunlar?: { id: string; ad: string; renk?: string }[] };
  demo?: boolean;
}

export interface Kart {
  id: number;
  musteri: string;
  telefon: string;
  email: string;
  tanim: string;
  durum: string;
  kaynak: string;
  karti_acan: string;
  log_metni: string;
  onay_tarihi: string | null;
  teslim_tarihi: string | null;
  adres_panosu: string | Record<string, unknown> | null;
  olusturma: string;
  guncelleme: string;
}

export type GorevDurum = 'planlandi' | 'yolda' | 'sahada' | 'bitti' | 'iptal';

export interface Gorev {
  id: number;
  kart_id: number;
  tur: string;
  tur_ad: string;
  durum: GorevDurum;
  durum_ad: string;
  tarih: string;
  saat?: string;
  sure_dk: number;
  atanan_ad: string;
  musteri?: string;
  tanim?: string;
  not?: string;
  teslim_gerekli: boolean;
  adres_panosu?: Record<string, unknown>;
}

export interface Bildirim {
  id: number;
  olay: string;
  baslik: string;
  metin: string;
  kart_id: number;
  url: string;
  okundu: number;
  tarih: string;
}

export interface LogSatiri {
  zaman: string;
  metin: string;
  foto?: string;
}
