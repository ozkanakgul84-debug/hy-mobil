import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonPage, IonTitle, IonToolbar, IonSpinner, IonTextarea, IonRefresher, IonRefresherContent, useIonToast, useIonActionSheet } from '@ionic/react';
import { callOutline, logoWhatsapp, cameraOutline, navigateOutline, sendOutline } from 'ionicons/icons';
import { adresMetni, fotoYukle, kartGetir, logCoz, logEkle } from '../api/hy';
import { aktifOturum } from '../api/client';
import { sutun } from '../api/sutun';
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
  const y = aktifOturum()?.kartGorusYetkileri || {};

  const yukle = useCallback(async () => {
    try { setKart(await kartGetir(Number(id))); } catch (e: any) { setHata(e.message); }
  }, [id]);
  useEffect(() => { yukle(); }, [yukle]);

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

  const s = kart ? sutun(kart.durum) : null;
  const adr = kart ? adresMetni(kart.adres_panosu) : { metin: '' };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/kartlar" text="Kartlar" /></IonButtons>
          <IonTitle>#{id}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={async (e) => { await yukle(); e.detail.complete(); }}><IonRefresherContent /></IonRefresher>
        {!kart && !hata && <div className="hy-bos"><IonSpinner /></div>}
        {hata && <div className="hy-bos">{hata}</div>}
        {kart && s && (
          <>
            <div style={{ padding: '16px 16px 8px' }}>
              <span className="hy-etiket" style={{ background: s.renk + '22', color: s.renk }}>{s.ad}</span>
              <h1 style={{ margin: '8px 0 4px', fontSize: 24, fontWeight: 800 }}>{kart.musteri}</h1>
              <div className="hy-soluk">{kart.kaynak} · açan @{kart.karti_acan}</div>
            </div>

            <div className="hy-eylemler">
              {y.iletisimGorebilir !== false && kart.telefon && (
                <IonButton fill="solid" color="secondary" href={`tel:${kart.telefon}`}><IonIcon icon={callOutline} slot="start" />Ara</IonButton>
              )}
              {y.iletisimGorebilir !== false && kart.telefon && (
                <IonButton fill="solid" color="success" href={`https://wa.me/${waNumara(kart.telefon)}`} target="_blank"><IonIcon icon={logoWhatsapp} slot="start" />WhatsApp</IonButton>
              )}
              {y.kameraKullanabilir !== false && (
                <IonButton fill="solid" onClick={foto}><IonIcon icon={cameraOutline} slot="start" />Fotoğraf</IonButton>
              )}
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
      </IonContent>
    </IonPage>
  );
}
