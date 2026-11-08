/** Demo modu: "DEMO/demo" ile giriş yapılınca sunucuya gitmeden örnek veri döner.
 *  Önizleme, mağaza incelemesi ve satış sunumu için. */
const bugun = new Date();
const g = (gun: number) => { const d = new Date(bugun); d.setDate(d.getDate() + gun); return d.toISOString().slice(0, 10); };
const tr = (gun: number, saat: string) => { const d = new Date(bugun); d.setDate(d.getDate() + gun); return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()} ${saat}`; };

const kartlar = [
  { id: 152, musteri: 'Lale Pastanesi', telefon: '05321234567', email: 'info@lalepastanesi.com', tanim: 'Kutu harf tabela 320×80 cm, ışıklı, ön yüz pleksi. Cephe ölçüsü keşifte alınacak.', durum: 'olcu', kaynak: 'WHATSAPP', karti_acan: 'ozkan',
    log_metni: `📱 [${tr(-2, '10:12:04')}] @asistan: WhatsApp'tan talep geldi\n💬 [${tr(-2, '10:40:11')}] @ozkan: Keşif için yarın 11:00 uygun\n🔄 [${tr(-1, '09:05:00')}] @ozkan: Süreç: Keşif / Ölçü`,
    onay_tarihi: null, teslim_tarihi: null, adres_panosu: { adresler: [{ adres: 'Atatürk Cad. No:14', ilce: 'Ümraniye', il: 'İstanbul', lat: 41.0256, lng: 29.0973 }] }, olusturma: g(-2), guncelleme: g(0) },
  { id: 149, musteri: 'Kızıldağ Market', telefon: '05339876543', email: '', tanim: 'Branda baskı 6×1,5 m + montaj, 440 gr dış mekan.', durum: 'uretim', kaynak: 'TELEFON', karti_acan: 'ozkan',
    log_metni: `💬 [${tr(-5, '15:20:00')}] @ozkan: Tasarım onaylandı\n🔄 [${tr(-3, '08:30:00')}] @usta: Süreç: Üretimde`, onay_tarihi: g(-4), teslim_tarihi: g(2), adres_panosu: { adresler: [{ adres: 'Alemdağ Cad. 210', ilce: 'Çekmeköy', il: 'İstanbul' }] }, olusturma: g(-6), guncelleme: g(-1) },
  { id: 146, musteri: 'Erkan Bakan', telefon: '05441112233', email: 'erkan@example.com', tanim: 'Oyma kompozit tabela + P10 kayan yazı.', durum: 'tasarim', kaynak: 'WEB', karti_acan: 'ozkan',
    log_metni: `📧 [${tr(-7, '11:00:00')}] @ozkan: Teklif gönderildi`, onay_tarihi: null, teslim_tarihi: null, adres_panosu: {}, olusturma: g(-9), guncelleme: g(-3) },
  { id: 142, musteri: 'Akın Alkan', telefon: '05051234455', email: '', tanim: 'Neon LED yazı 120 cm, iç mekan.', durum: 'teslim', kaynak: 'INSTAGRAM', karti_acan: 'ozkan',
    log_metni: `🔄 [${tr(-1, '17:45:00')}] @usta: Süreç: Teslime hazır`, onay_tarihi: g(-10), teslim_tarihi: g(0), adres_panosu: { adresler: [{ adres: 'Bağdat Cad. 455', ilce: 'Kadıköy', il: 'İstanbul' }] }, olusturma: g(-12), guncelleme: g(-1) },
];

const gorevler: any[] = [
  { id: 31, kart_id: 152, tur: 'kesif', tur_ad: 'Keşif', durum: 'planlandi', durum_ad: 'Planlandı', tarih: g(0), saat: '11:00', sure_dk: 45, atanan_ad: 'Montaj ekibi 1', musteri: 'Lale Pastanesi', tanim: kartlar[0].tanim, teslim_gerekli: false, adres_panosu: kartlar[0].adres_panosu },
  { id: 32, kart_id: 142, tur: 'montaj', tur_ad: 'Montaj', durum: 'yolda', durum_ad: 'Yolda', tarih: g(0), saat: '14:30', sure_dk: 90, atanan_ad: 'Montaj ekibi 1', musteri: 'Akın Alkan', tanim: kartlar[3].tanim, teslim_gerekli: true, adres_panosu: kartlar[3].adres_panosu },
  { id: 33, kart_id: 149, tur: 'montaj', tur_ad: 'Montaj', durum: 'planlandi', durum_ad: 'Planlandı', tarih: g(2), saat: '10:00', sure_dk: 120, atanan_ad: 'Montaj ekibi 2', musteri: 'Kızıldağ Market', tanim: kartlar[1].tanim, teslim_gerekli: true, adres_panosu: kartlar[1].adres_panosu },
];

const bildirimListe = [
  { id: 901, olay: 'wa_mesaj', baslik: 'Yeni WhatsApp mesajı', metin: 'Lale Pastanesi: "Yarın 11:00 uygun mu?"', kart_id: 152, url: '', okundu: 0, tarih: tr(0, '09:12') },
  { id: 900, olay: 'gorev', baslik: 'Size saha görevi atandı', metin: 'Montaj · Akın Alkan · bugün 14:30', kart_id: 142, url: '', okundu: 0, tarih: tr(0, '08:30') },
  { id: 899, olay: 'surec', baslik: 'Kart süreci değişti', metin: 'Kızıldağ Market → Üretimde', kart_id: 149, url: '', okundu: 1, tarih: tr(-3, '08:30') },
];

const bekle = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(JSON.parse(JSON.stringify(v))), 250));

export async function demoIstek(yol: string, s: { metot?: string; govde?: any; sorgu?: Record<string, string | number> }): Promise<any> {
  let m: RegExpMatchArray | null;
  if (yol === 'hy-erp/v1/crm/kartlar') return bekle({ durum: 'basarili', kartlar });
  if ((m = yol.match(/crm\/kartlar\/(\d+)\/log$/))) {
    const k = kartlar.find((x) => x.id === +m![1])!;
    k.log_metni += `\n💬 [${tr(0, new Date().toTimeString().slice(0, 8))}] @demo: ${s.govde?.yorum}`;
    return bekle({ durum: 'basarili' });
  }
  if ((m = yol.match(/crm\/kartlar\/(\d+)$/))) return bekle({ durum: 'basarili', kart: kartlar.find((x) => x.id === +m![1]) });
  if (yol === 'hy-erp/v1/saha/gorevler') {
    const a = s.sorgu?.aralik;
    return bekle({ durum: 'basarili', gorevler: gorevler.filter((x) => a === 'bugun' ? x.tarih === g(0) : true) });
  }
  if ((m = yol.match(/saha\/gorevler\/(\d+)\/durum$/))) {
    const x = gorevler.find((y) => y.id === +m![1]);
    x.durum = s.govde.durum; x.durum_ad = ({ planlandi: 'Planlandı', yolda: 'Yolda', sahada: 'Sahada', bitti: 'Bitti' } as any)[x.durum];
    return bekle({ durum: 'basarili' });
  }
  if ((m = yol.match(/saha\/gorevler\/(\d+)$/))) { const x = gorevler.find((y) => y.id === +m![1]); return bekle({ durum: 'basarili', gorev: { ...x, tanim_tam: x.tanim } }); }
  if ((m = yol.match(/saha\/kartlar\/(\d+)\/medya$/))) {
    const k = kartlar.find((x) => x.id === +m![1])!;
    const ad = s.govde.kategori === 'teslim' ? 'Teslim fotoğrafı' : 'Keşif / Ölçü fotoğrafı';
    k.log_metni += `\n📷 [${tr(0, new Date().toTimeString().slice(0, 8))}] @demo: ${ad} [FOTO:data:image/jpeg;base64,${s.govde.dosya}]`;
    return bekle({ durum: 'basarili', url: '' });
  }
  if (yol === 'hy-bildirim/v1/ozet') return bekle({ okunmamis: bildirimListe.filter((b) => !b.okundu).length, liste: bildirimListe });
  if (yol === 'hy-bildirim/v1/okundu') { bildirimListe.forEach((b) => { if (!s.govde.id || b.id === s.govde.id) b.okundu = 1; }); return bekle({ okunmamis: 0 }); }
  return bekle({ durum: 'basarili' });
}
