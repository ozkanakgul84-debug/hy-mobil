import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonPage, IonTitle, IonToolbar, IonSpinner, useIonToast, useIonAlert, useIonRouter } from '@ionic/react';
import { cameraOutline, navigateOutline, documentTextOutline } from 'ionicons/icons';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { adresMetni, fotoYukle, gorevDurum, gorevGetir } from '../api/hy';
import type { Gorev, GorevDurum } from '../api/types';
import { fotoCek } from '../foto';
import { anlikKonum, yolTarifiUrl } from '../konum';
import { DURUM_RENK, TUR_IKON, tarihYaz } from './Saha';

const SIRADAKI: Record<string, { durum: GorevDurum; yazi: string } | null> = {
  planlandi: { durum: 'yolda', yazi: '🚐 Yola çıkıyoruz' },
  yolda: { durum: 'sahada', yazi: '📍 Vardık' },
  sahada: { durum: 'bitti', yazi: '✅ İş bitti' },
  bitti: null, iptal: null,
};
const ADIMLAR: [GorevDurum, string][] = [['planlandi', 'Planlandı'], ['yolda', 'Yolda'], ['sahada', 'Sahada'], ['bitti', 'Bitti']];

export default function GorevDetay() {
  const { id } = useParams();
  const [g, setG] = useState<(Gorev & { tanim_tam?: string }) | null>(null);
  const [hata, setHata] = useState('');
  const [bekle, setBekle] = useState(false);
  const [toast] = useIonToast();
  const [alert] = useIonAlert();
  const router = useIonRouter();

  const yukle = useCallback(async () => {
    try { setG(await gorevGetir(Number(id))); } catch (e: any) { setHata(e.message); }
  }, [id]);
  useEffect(() => { yukle(); }, [yukle]);

  const ilerle = async (teslim_alan?: string) => {
    if (!g) return;
    const s = SIRADAKI[g.durum]; if (!s) return;
    if (s.durum === 'bitti' && g.tur === 'atolye' && !teslim_alan) {
      alert({ header: 'Teslim alan kişi', inputs: [{ name: 'ad', placeholder: 'Ad soyad' }],
        buttons: [{ text: 'Vazgeç', role: 'cancel' }, { text: 'Kaydet', handler: (v) => { if (v.ad) ilerle(v.ad); } }] });
      return;
    }
    setBekle(true);
    try {
      const konum = await anlikKonum();
      await gorevDurum(g.id, s.durum, { ...konum, teslim_alan });
      Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
      await yukle();
    } catch (e: any) {
      if (e.kod === 'teslim_foto') {
        alert({ header: 'Teslim fotoğrafı', message: 'İşi bitirmeden önce teslim fotoğrafı çekin.', buttons: [{ text: 'Vazgeç', role: 'cancel' }, { text: 'Fotoğraf çek', handler: () => { teslimFoto(); } }] });
      } else toast({ message: e.message, duration: 2800, color: 'danger' });
    } finally { setBekle(false); }
  };

  const teslimFoto = async (kategori: 'kesif' | 'teslim' = 'teslim') => {
    if (!g) return;
    try {
      const f = await fotoCek(); if (!f) return;
      toast({ message: 'Fotoğraf yükleniyor…', duration: 1200 });
      await fotoYukle(g.kart_id, f.base64, f.uzanti, kategori);
      toast({ message: 'Fotoğraf karta eklendi', duration: 1800, color: 'success' });
    } catch (e: any) { toast({ message: e.message || 'Yüklenemedi', duration: 2500, color: 'danger' }); }
  };

  const adr = g ? adresMetni(g.adres_panosu) : { metin: '' };
  const sira = g ? SIRADAKI[g.durum] : null;
  const adimNo = g ? ADIMLAR.findIndex((a) => a[0] === g.durum) : -1;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/saha" text="Saha" /></IonButtons>
          <IonTitle>{g ? `${TUR_IKON[g.tur] || ''} ${g.tur_ad}` : 'Görev'}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {!g && !hata && <div className="hy-bos"><IonSpinner /></div>}
        {hata && <div className="hy-bos">{hata}</div>}
        {g && (
          <>
            <div style={{ padding: '16px 16px 4px' }}>
              <span className="hy-etiket" style={{ background: DURUM_RENK[g.durum] + '22', color: DURUM_RENK[g.durum] }}>{g.durum_ad}</span>
              <h1 style={{ margin: '8px 0 4px', fontSize: 24, fontWeight: 800 }}>{g.musteri || `Kart #${g.kart_id}`}</h1>
              <div className="hy-soluk">{tarihYaz(g.tarih)}{g.saat ? ` · ${g.saat.slice(0, 5)}` : ''} · {g.sure_dk} dk · {g.atanan_ad}</div>
            </div>

            <div className="hy-adim">
              {ADIMLAR.map(([k, ad], i) => <span key={k} className={i <= adimNo ? 'ok' : ''}>{ad}</span>)}
            </div>

            {sira && (
              <div className="hy-durum-dugme">
                <IonButton expand="block" disabled={bekle} onClick={() => ilerle()}>{bekle ? <IonSpinner name="dots" /> : sira.yazi}</IonButton>
              </div>
            )}

            <div className="hy-eylemler">
              {adr.metin && <IonButton color="secondary" href={yolTarifiUrl(adr.metin, adr.lat, adr.lng)} target="_blank"><IonIcon icon={navigateOutline} slot="start" />Yol tarifi</IonButton>}
              <IonButton color="secondary" onClick={() => teslimFoto(g.tur === 'kesif' ? 'kesif' : 'teslim')}><IonIcon icon={cameraOutline} slot="start" />Fotoğraf</IonButton>
              <IonButton color="secondary" onClick={() => router.push(`/kartlar/${g.kart_id}`)}><IonIcon icon={documentTextOutline} slot="start" />Kart</IonButton>
            </div>

            {adr.metin && (<><div className="hy-bolum">Adres</div><div className="hy-kutu">{adr.metin}</div></>)}
            <div className="hy-bolum">İş detayı</div>
            <div className="hy-kutu" style={{ whiteSpace: 'pre-wrap' }}>{g.tanim_tam || g.tanim || '—'}</div>
            {g.not && (<><div className="hy-bolum">Not</div><div className="hy-kutu" style={{ whiteSpace: 'pre-wrap' }}>{g.not}</div></>)}
            {g.teslim_gerekli && g.durum !== 'bitti' && <p className="hy-soluk" style={{ margin: '12px 16px' }}>Bu görev teslim fotoğrafı olmadan bitirilemez.</p>}
            <div style={{ height: 24 }} />
          </>
        )}
      </IonContent>
    </IonPage>
  );
}
