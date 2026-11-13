import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonPage, IonTitle, IonToolbar, IonSpinner, IonTextarea, IonRefresher, IonRefresherContent, useIonToast, useIonActionSheet, useIonAlert, useIonRouter } from '@ionic/react';
import { callOutline, logoWhatsapp, cameraOutline, navigateOutline, sendOutline, createOutline, chevronDownOutline, checkmarkCircle, ellipseOutline, mailOutline, chatbubblesOutline, folderOpenOutline, ellipsisVertical, openOutline, archiveOutline, flashOutline, linkOutline, locationOutline, micOutline, receiptOutline, calculatorOutline, documentTextOutline, cubeOutline, pricetagOutline } from 'ionicons/icons';
import { adresMetni, fotoYukle, kartGetir, kartGuncelle, logCoz, logEkle, surecIsaretle } from '../api/hy';
import { aktifOturum } from '../api/client';
import { islemAdimlari, sutun, sutunlar, surecAdimlari, type SurecAdimi } from '../api/sutun';
import { adresEkle, ARSIV_SEBEPLERI, hizliIs, kartiArsivle, neredenGetir, neredenKaydet, siparisGetir, siparisLinkGonder, type Siparis } from '../api/kart';
import { usePanel } from '../panelKanca';
import { SahaBolumu, SesKaydi, TeklifBolumu } from './KartEkler';
import KartFormu from './KartFormu';
import FaturaFormu, { type FaturaBaslangic } from './muhasebe/FaturaFormu';
import { crmKartCariAc, crmKartFatura } from '../api/muhasebe';
import type { Kart } from '../api/types';
import { fotoCek } from '../foto';
import { yolTarifiUrl } from '../konum';

export function waNumara(tel: string) {
  const d = (tel || '').replace(/\D/g, '');
  return d.startsWith('0') ? '9' + d : d.startsWith('90') ? d : '90' + d;
}

export default function KartDetay() {
  const { id } = useParams();
  const [kart, setKart] = useState<Kart | null>(null);
  const [hata, setHata] = useState('');
  const [yorum, setYorum] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [toast] = useIonToast();
  const [menu] = useIonActionSheet();
  const [alert] = useIonAlert();
  const router = useIonRouter();
  const [duzenle, setDuzenle] = useState(false);
  const [fatura, setFatura] = useState<FaturaBaslangic | null>(null);
  const oturum = aktifOturum();
  const modulVar = (m: string) => oturum?.rol === 'YONETICI' || !(oturum?.aktifModuller || []).length || (oturum?.aktifModuller || []).includes(m);
  const y = aktifOturum()?.kartGorusYetkileri || {};
  const panel = usePanel();
  const [siparis, setSiparis] = useState<Siparis | null>(null);
  const [nereden, setNereden] = useState<{ nereden: string; secenekler: string[] } | null>(null);
  const [ses, setSes] = useState(false);

  const yukle = useCallback(async () => {
    try { setKart(await kartGetir(Number(id))); } catch (e: any) { setHata(e.message); }
  }, [id]);
  useEffect(() => {
    yukle();
    siparisGetir(Number(id)).then(setSiparis).catch(() => setSiparis(null));
    neredenGetir(Number(id)).then(setNereden).catch(() => setNereden(null));
  }, [yukle]);

  const panelde = (...adim: string[]) => panel.ac([`kart:${id}`, ...adim]);

  /* ── Sipariş no / müşteriye takip linki / hızlı iş ── */
  const siparisMenu = () => {
    const sp = siparis?.siparis; if (!sp) return;
    menu({
      header: 'Sipariş ' + sp.no,
      subHeader: sp.son_gonderim ? `Son gönderim: ${sp.son_gonderim} · WhatsApp: ${sp.wa || '-'} · E-posta: ${sp.eposta || '-'}` : 'Takip linki müşteriye henüz gönderilmedi.',
      buttons: [
        { text: '📨 Müşteriye takip linki gönder', handler: () => { linkGonder(); } },
        ...(sp.link ? [{ text: '🔗 Takip sayfasını aç', handler: () => { window.open(sp.link, '_blank'); } }] : []),
        { text: 'Vazgeç', role: 'cancel' },
      ],
    });
  };
  const linkGonder = () => alert({
    header: 'Takip linki gönderilsin mi?', message: 'Sipariş takip linki müşteriye WhatsApp ve e-posta ile gönderilir.',
    buttons: [{ text: 'Vazgeç', role: 'cancel' }, { text: 'Gönder', handler: async () => {
      try { const r = await siparisLinkGonder(Number(id)); setSiparis((x) => x && { ...x, siparis: r.siparis }); toast({ message: `WhatsApp: ${r.sonuc.wa || '-'} · E-posta: ${r.sonuc.eposta || '-'}`, duration: 3000 }); yukle(); }
      catch (e: any) { toast({ message: e.message, duration: 3000, color: 'danger' }); }
    } }],
  });
  const hizliDegistir = async () => {
    const sp = siparis?.siparis; if (!sp) return;
    try { const r = await hizliIs(Number(id), !sp.hizli); setSiparis(r); toast({ message: r.siparis?.hizli ? 'Hızlı iş: link gönderilmeyecek' : 'Hızlı iş kaldırıldı', duration: 1800 }); }
    catch (e: any) { toast({ message: e.message, duration: 2500, color: 'danger' }); }
  };

  /* ── Nereden geldi ── */
  const neredenSec = () => {
    if (!nereden) return;
    menu({
      header: 'Müşteri nereden geldi?',
      buttons: [...nereden.secenekler.map((x) => ({ text: (x === nereden.nereden ? '● ' : '') + x, handler: () => {
        neredenKaydet(Number(id), x).then(() => { setNereden({ ...nereden, nereden: x }); toast({ message: 'Kaydedildi', duration: 1200 }); }).catch((e) => toast({ message: e.message, duration: 2500, color: 'danger' }));
      } })), { text: 'Vazgeç', role: 'cancel' }],
    });
  };

  /* ── Arşivle (sebep sorulur; web paneliyle aynı sebepler) ── */
  const arsivle = () => {
    if (!kart) return;
    menu({
      header: 'Kart neden arşivleniyor?',
      subHeader: '#' + kart.id + ' ' + kart.musteri,
      buttons: [
        ...ARSIV_SEBEPLERI.map(([kod, ad]) => ({ text: ad, handler: () => {
          if (kod === 'diger') {
            alert({ header: 'Arşivleme sebebi', inputs: [{ name: 'a', type: 'textarea', placeholder: 'Açıklama' }], buttons: [{ text: 'Vazgeç', role: 'cancel' }, { text: 'Arşivle', handler: (v) => { arsivleGonder(kod, String(v?.a || '').trim()); } }] });
          } else arsivleGonder(kod, '');
        } })),
        { text: 'Vazgeç', role: 'cancel' },
      ],
    });
  };
  const arsivleGonder = async (kod: string, aciklama: string) => {
    try { await kartiArsivle(Number(id), { arsivSebep: kod, arsivAciklama: aciklama }); toast({ message: 'Kart arşivlendi', duration: 1800, color: 'success' }); router.goBack(); }
    catch (e: any) { toast({ message: e.message, duration: 3000, color: 'danger' }); }
  };

  /* ── Adres ── */
  const adresMenu = () => {
    const a = kart ? adresMetni(kart.adres_panosu) : { metin: '' };
    menu({
      header: 'Adres', subHeader: a.metin || 'Kartta adres yok.',
      buttons: [
        ...(a.metin ? [{ text: '🧭 Yol tarifi', handler: () => { window.open(yolTarifiUrl(a.metin, a.lat, a.lng), '_blank'); } }] : []),
        { text: '➕ Adres / konum ekle', handler: () => { adresSor(); } },
        { text: 'Vazgeç', role: 'cancel' },
      ],
    });
  };
  const adresSor = () => alert({
    header: 'Adres ekle', message: 'Açık adres, Google Haritalar linki ya da koordinat yazabilirsiniz.',
    inputs: [{ name: 'd', type: 'textarea', placeholder: 'Adres veya konum linki' }],
    buttons: [{ text: 'Vazgeç', role: 'cancel' }, { text: 'Ekle', handler: async (v) => {
      const d = String(v?.d || '').trim(); if (!d) return;
      try { await adresEkle(Number(id), d); toast({ message: 'Adres eklendi', duration: 1500, color: 'success' }); yukle(); }
      catch (e: any) { toast({ message: e.message, duration: 2500, color: 'danger' }); }
    } }],
  });

  /* ── Alt satır işlem düğmeleri (iş akışından) ── */
  const islemCalistir = async (a: SurecAdimi) => {
    if (!kart) return;
    if (a.hedefSutun && a.hedefSutun !== kart.durum && a.aksiyon !== 'teklifHazirla') {
      try { await kartGuncelle(kart.id, { durum: a.hedefSutun }); setKart({ ...kart, durum: a.hedefSutun }); } catch { /* panel de sessiz geçiyor */ }
    }
    switch (a.aksiyon) {
      case 'faturaKes': faturaKes(); break;
      case 'adreseGit': adresMenu(); break;
      case 'kameraAc': foto(); break;
      case 'sesliNot': setSes(true); break;
      case 'klasorAc': router.push(`/kartlar/${kart.id}/dosyalar`); break;
      case 'fiyatHesapla': router.push(`/fiyat?kart=${kart.id}`); break;
      case 'teklifHazirla': panelde('metin:Teklif Hazırla'); break;
      default: panelde('metin:' + a.etiket);
    }
  };
  const ISLEM_IKON: Record<string, string> = { faturaKes: receiptOutline, adreseGit: locationOutline, kameraAc: cameraOutline, sesliNot: micOutline, klasorAc: folderOpenOutline, fiyatHesapla: calculatorOutline, teklifHazirla: documentTextOutline };

  const digerMenu = () => menu({
    header: '#' + id,
    buttons: [
      { text: '🖥️ Kartı web panelinde aç (tüm butonlar)', handler: () => { panelde(); } },
      { text: '📦 Teslim ekranı', handler: () => { panelde('metin:Teslim ekranı'); } },
      { text: '🏷️ Etiket bas', handler: () => { panelde('metin:Etiket bas'); } },
      { text: '🗃️ Arşivle', role: 'destructive', handler: () => { arsivle(); } },
      { text: 'Vazgeç', role: 'cancel' },
    ],
  });

  const yorumGonder = async () => {
    if (!yorum.trim()) return;
    setGonderiliyor(true);
    try { await logEkle(Number(id), yorum.trim()); setYorum(''); await yukle(); }
    catch (e: any) { toast({ message: e.message, duration: 2500, color: 'danger' }); }
    finally { setGonderiliyor(false); }
  };

  const foto = () => menu({
    header: 'Fotoğraf türü',
    buttons: [
      { text: '📐 Keşif / Ölçü', handler: () => { fotoAl('kesif'); } },
      { text: '✅ Teslim', handler: () => { fotoAl('teslim'); } },
      { text: 'Vazgeç', role: 'cancel' },
    ],
  });

  const fotoAl = async (kategori: 'kesif' | 'teslim') => {
    try {
      const f = await fotoCek(); if (!f) return;
      toast({ message: 'Fotoğraf yükleniyor…', duration: 1200 });
      await fotoYukle(Number(id), f.base64, f.uzanti, kategori);
      toast({ message: 'Fotoğraf karta eklendi', duration: 1800, color: 'success' });
      yukle();
    } catch (e: any) { toast({ message: e.message || 'Fotoğraf yüklenemedi', duration: 2500, color: 'danger' }); }
  };

  const asamaSec = () => {
    if (!kart) return;
    menu({
      header: 'Kartı taşı',
      buttons: [
        ...sutunlar().map((x) => ({ text: (x.id === kart.durum ? '● ' : '') + x.ad, handler: () => { asamaTasi(x.id); } })),
        { text: 'Vazgeç', role: 'cancel' },
      ],
    });
  };

  const asamaTasi = async (hedef: string) => {
    if (!kart || hedef === kart.durum) return;
    const eski = kart.durum;
    setKart({ ...kart, durum: hedef });
    try { await kartGuncelle(kart.id, { durum: hedef }); toast({ message: 'Taşındı: ' + sutun(hedef).ad, duration: 1500 }); yukle(); }
    catch (e: any) { setKart((k) => k && { ...k, durum: eski }); toast({ message: e.message, duration: 2500, color: 'danger' }); }
  };

  const tarihSor = (baslik: string) => new Promise<string | null>((coz) => {
    alert({
      header: baslik,
      inputs: [{ name: 't', type: 'date' }],
      buttons: [{ text: 'Atla', role: 'cancel', handler: () => coz(null) }, { text: 'Tamam', handler: (v) => coz(v?.t ? String(v.t).split('-').reverse().join('.') : null) }],
      onDidDismiss: () => coz(null),
    });
  });

  const surecTikla = async (a: SurecAdimi) => {
    if (!kart) return;
    const deger = !(kart.surecler || {})[a.key];
    const bugun = new Date().toLocaleDateString('tr-TR');
    let onayTarihi: string | null = null, teslimTarihi: string | null = null;
    if (deger && a.aksiyon === 'pesinatAlindi') { onayTarihi = bugun; teslimTarihi = await tarihSor('Teslim tarihi'); }
    if (deger && a.aksiyon === 'teslimEdildi') teslimTarihi = bugun;
    const hedefSutun = deger && a.hedefSutun ? a.hedefSutun : '';
    const onceki = kart;
    setKart({ ...kart, surecler: { ...(kart.surecler || {}), [a.key]: deger }, durum: hedefSutun || kart.durum });
    try {
      await surecIsaretle(kart.id, { adim: a.key, deger, hedefSutun, adimEtiketi: a.etiket, onayTarihi, teslimTarihi });
      yukle();
    } catch (e: any) { setKart(onceki); toast({ message: e.message, duration: 2500, color: 'danger' }); }
  };

  /** CRM kartından fatura: carisi yoksa oluşturulur, fiyatlandırma dosyasındaki kalemler gelir. */
  const faturaKes = async () => {
    if (!kart) return;
    try {
      const d = await crmKartFatura(kart.id);
      let cariId = d.cari_id;
      if (!cariId) {
        const evet = await new Promise<boolean>((coz) => alert({
          header: 'Cari oluşturulsun mu?', message: 'Bu müşterinin muhasebede carisi yok. Kart bilgileriyle oluşturulacak.',
          buttons: [{ text: 'Vazgeç', role: 'cancel', handler: () => coz(false) }, { text: 'Oluştur', handler: () => coz(true) }], onDidDismiss: () => coz(false),
        }));
        if (!evet) return;
        cariId = (await crmKartCariAc(kart.id)).id;
      }
      const p = (d.projeler || []).find((x: any) => x.id === d.kart?.proje_id);
      setFatura({ tip: 'satis', cari_id: cariId, kart_id: kart.id, kart_no: d.kart?.kart_no, kalemler: d.kalemler, aciklama: p?.proje_adi || '' });
    } catch (e: any) { toast({ message: e.message, duration: 3000, color: 'danger' }); }
  };

  const s = kart ? sutun(kart.durum) : null;
  const adimlar = surecAdimlari();
  const adr = kart ? adresMetni(kart.adres_panosu) : { metin: '' };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/kartlar" text="Kartlar" /></IonButtons>
          <IonTitle>#{id}</IonTitle>
          {kart && <IonButtons slot="end">
            <IonButton onClick={() => setDuzenle(true)} aria-label="Düzenle"><IonIcon icon={createOutline} /></IonButton>
            <IonButton onClick={digerMenu} aria-label="Diğer"><IonIcon icon={ellipsisVertical} /></IonButton>
          </IonButtons>}
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={async (e) => { await yukle(); e.detail.complete(); }}><IonRefresherContent /></IonRefresher>
        {!kart && !hata && <div className="hy-bos"><IonSpinner /></div>}
        {hata && <div className="hy-bos">{hata}</div>}
        {kart && s && (
          <>
            <div style={{ padding: '16px 16px 8px' }}>
              <button className="hy-etiket hy-asama" onClick={asamaSec} style={{ background: s.renk + '22', color: s.renk, border: 0 }}>{s.ad} <IonIcon icon={chevronDownOutline} /></button>
              <h1 style={{ margin: '8px 0 4px', fontSize: 24, fontWeight: 800 }}>{kart.musteri}</h1>
              <div className="hy-soluk">{kart.kaynak} · açan @{kart.karti_acan}</div>
              <div className="hy-cipler">
                {siparis?.siparis && <button className="hy-cip turuncu" onClick={siparisMenu}><IonIcon icon={linkOutline} />{siparis.siparis.no}</button>}
                {siparis?.siparis && <button className={'hy-cip' + (siparis.siparis.hizli ? ' secili' : '')} onClick={hizliDegistir}><IonIcon icon={flashOutline} />Hızlı iş{siparis.siparis.hizli ? ' ✓' : ''}</button>}
                {nereden && <button className="hy-cip" onClick={neredenSec}><IonIcon icon={pricetagOutline} />{nereden.nereden ? 'Nereden: ' + nereden.nereden : 'Nereden geldi? ✎'}</button>}
              </div>
            </div>

            <div className="hy-eylemler">
              {y.iletisimGorebilir !== false && kart.telefon && (
                <IonButton fill="solid" color="secondary" href={`tel:${kart.telefon}`}><IonIcon icon={callOutline} slot="start" />Ara</IonButton>
              )}
              {y.iletisimGorebilir !== false && kart.telefon && (
                <IonButton fill="solid" color="success" onClick={() => y.waMailKullanabilir === false ? window.open(`https://wa.me/${waNumara(kart.telefon)}`, '_blank') : router.push(`/kartlar/${kart.id}/whatsapp`)}><IonIcon icon={logoWhatsapp} slot="start" />WhatsApp</IonButton>
              )}
              {y.kameraKullanabilir !== false && (
                <IonButton fill="solid" onClick={foto}><IonIcon icon={cameraOutline} slot="start" />Fotoğraf</IonButton>
              )}
            </div>
            <div className="hy-sekmeler">
              <button onClick={() => router.push(`/kartlar/${kart.id}/eposta`)}><IonIcon icon={mailOutline} />E-posta</button>
              <button onClick={() => router.push(`/kartlar/${kart.id}/yazisma`)}><IonIcon icon={chatbubblesOutline} />Yazışma</button>
              <button onClick={() => router.push(`/kartlar/${kart.id}/dosyalar`)}><IonIcon icon={folderOpenOutline} />Dosyalar</button>
              <button onClick={() => panelde()}><IonIcon icon={openOutline} />Panelde</button>
            </div>

            {adimlar.length > 0 && (
              <>
                <div className="hy-bolum">Süreç</div>
                <div className="hy-surec">
                  {adimlar.map((a) => {
                    const ok = !!(kart.surecler || {})[a.key];
                    return (
                      <button key={a.key} className={'hy-surec-adim' + (ok ? ' ok' : '')} onClick={() => surecTikla(a)}>
                        <IonIcon icon={ok ? checkmarkCircle : ellipseOutline} /> {a.etiket}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <div className="hy-bolum">İşlemler</div>
            <div className="hy-islemler">
              {(islemAdimlari().length ? islemAdimlari() : [
                { key: 'f', etiket: 'Fatura kes', aksiyon: 'faturaKes' }, { key: 'a', etiket: 'Adres', aksiyon: 'adreseGit' },
                { key: 'k', etiket: 'Kamera', aksiyon: 'kameraAc' }, { key: 's', etiket: 'Ses kaydet', aksiyon: 'sesliNot' },
                { key: 'd', etiket: 'Klasörler', aksiyon: 'klasorAc' }, { key: 'h', etiket: 'Fiyat hesapla', aksiyon: 'fiyatHesapla' },
              ] as SurecAdimi[]).map((a) => (
                <button key={a.key} onClick={() => islemCalistir(a)}><IonIcon icon={ISLEM_IKON[a.aksiyon || ''] || cubeOutline} />{a.etiket}</button>
              ))}
              {modulVar('teklif') && <button onClick={() => islemCalistir({ key: 'tk', etiket: 'Teklif Hazırla', aksiyon: 'teklifHazirla' })}><IonIcon icon={documentTextOutline} />Teklif hazırla</button>}
              <button onClick={() => panelde('metin:Teslim ekranı')}><IonIcon icon={cubeOutline} />Teslim ekranı</button>
              <button onClick={() => panelde('metin:Etiket bas')}><IonIcon icon={pricetagOutline} />Etiket bas</button>
              <button className="kirmizi" onClick={arsivle}><IonIcon icon={archiveOutline} />Arşivle</button>
            </div>

            <div className="hy-bolum">İş tanımı</div>
            <div className="hy-kutu" style={{ whiteSpace: 'pre-wrap' }}>{kart.tanim || '—'}</div>

            {adr.metin && (
              <>
                <div className="hy-bolum">Adres</div>
                <div className="hy-kutu hy-satir" style={{ justifyContent: 'space-between' }}>
                  <span>{adr.metin}</span>
                  <IonButton size="small" href={yolTarifiUrl(adr.metin, adr.lat, adr.lng)} target="_blank"><IonIcon icon={navigateOutline} slot="start" />Yol tarifi</IonButton>
                </div>
              </>
            )}

            {(kart.onay_tarihi || kart.teslim_tarihi) && (
              <>
                <div className="hy-bolum">Tarihler</div>
                <div className="hy-kutu">
                  {kart.onay_tarihi && <div>Onay: {kart.onay_tarihi.slice(0, 10).split('-').reverse().join('.')}</div>}
                  {kart.teslim_tarihi && <div>Teslim: {kart.teslim_tarihi.slice(0, 10).split('-').reverse().join('.')}</div>}
                </div>
              </>
            )}

            {modulVar('teklif') && <TeklifBolumu kartId={kart.id} />}
            <SahaBolumu kartId={kart.id} />

            <div className="hy-bolum">Kart geçmişi</div>
            <div className="hy-kutu">
              <div className="hy-satir" style={{ alignItems: 'flex-end', marginBottom: 10 }}>
                <IonTextarea autoGrow rows={1} placeholder="Not ekle…" value={yorum} onIonInput={(e) => setYorum(String(e.detail.value || ''))} style={{ flex: 1 }} aria-label="Not" />
                <IonButton onClick={yorumGonder} disabled={gonderiliyor || !yorum.trim()} aria-label="Gönder"><IonIcon icon={sendOutline} /></IonButton>
              </div>
              <div className="hy-log">
                {logCoz(kart.log_metni).map((l, i) => (
                  <div className="s" key={i}>
                    {l.zaman && <div className="hy-soluk">{l.zaman}</div>}
                    <div>{l.metin}</div>
                    {l.foto && <img src={l.foto} alt="" loading="lazy" />}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ height: 24 }} />
          </>
        )}
        <FaturaFormu acik={!!fatura} baslangic={fatura} onKapat={() => setFatura(null)} onKaydedildi={(fid) => { setFatura(null); router.push(`/muhasebe/fatura/${fid}`); }} />
        <SesKaydi acik={ses} kartId={Number(id)} onKapat={() => setSes(false)} onYuklendi={() => { setSes(false); yukle(); }} />
        <KartFormu acik={duzenle} kart={kart} onKapat={() => setDuzenle(false)} onKaydedildi={() => { setDuzenle(false); yukle(); }} />
      </IonContent>
    </IonPage>
  );
}
