import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonIcon, IonPage, IonRefresher, IonRefresherContent, IonSegment, IonSegmentButton, IonLabel, IonSpinner, IonTitle, IonToolbar, useIonToast } from '@ionic/react';
import { documentOutline, folderOpenOutline, imageOutline } from 'ionicons/icons';
import { boyutYaz, kartDosyalari, type KartDosya } from '../api/kart';
import { once } from '../api/ozet';

/** Kartın dosyaları (web panelindeki "Dosyalar / klasörler"): alt klasörlere göre liste, dokununca açılır. */
export default function KartDosyalar() {
  const { id } = useParams();
  const kartId = Number(id);
  const [veri, setVeri] = useState<{ klasor: string; alt_klasorler: string[]; dosyalar: KartDosya[] } | null>(null);
  const [hata, setHata] = useState('');
  const [alt, setAlt] = useState('hepsi');
  const [toast] = useIonToast();

  async function yukle() {
    try { setVeri(await kartDosyalari(kartId)); setHata(''); } catch (e: any) { setHata(e.message); }
  }
  useEffect(() => { yukle(); }, [kartId]);

  const liste = useMemo(() => (veri?.dosyalar || []).filter((d) => alt === 'hepsi' || d.alt_klasor === alt), [veri, alt]);
  const sayi = (a: string) => (veri?.dosyalar || []).filter((d) => d.alt_klasor === a).length;

  function ac(d: KartDosya) {
    const u = d.url || d.indir_url;
    if (!u) { toast({ message: 'Bu dosya henüz sunucuya yüklenmemiş (yalnız ofis bilgisayarında).', duration: 2500, color: 'warning' }); return; }
    window.open(u, '_blank');
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref={`/kartlar/${kartId}`} text="" /></IonButtons>
          <IonTitle>Dosyalar · #{kartId}</IonTitle>
        </IonToolbar>
        {veri && (
          <IonToolbar>
            <IonSegment scrollable value={alt} onIonChange={(e) => setAlt(String(e.detail.value))}>
              <IonSegmentButton value="hepsi"><IonLabel>Hepsi ({veri.dosyalar.length})</IonLabel></IonSegmentButton>
              {veri.alt_klasorler.map((a) => <IonSegmentButton key={a} value={a}><IonLabel>{a} ({sayi(a)})</IonLabel></IonSegmentButton>)}
            </IonSegment>
          </IonToolbar>
        )}
      </IonHeader>
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={async (e) => { await yukle(); e.detail.complete(); }}><IonRefresherContent /></IonRefresher>
        {!veri && !hata && <div className="hy-bos"><IonSpinner /></div>}
        {hata && <div className="hy-bos">{hata}</div>}
        {veri && <p className="hy-soluk" style={{ fontSize: 12, padding: '8px 14px 0', margin: 0 }}><IonIcon icon={folderOpenOutline} /> {veri.klasor}</p>}
        {veri && !liste.length && <div className="hy-bos"><IonIcon icon={folderOpenOutline} /><p>Bu klasörde dosya yok.</p></div>}
        {!!liste.length && (
          <div className="hy-mo-panel">
            {liste.map((d) => (
              <button key={d.id} className="hy-mo-satir" onClick={() => ac(d)}>
                <span className="av" style={{ background: /\.(jpe?g|png|webp|gif|heic)$/i.test(d.ad) ? '#16a34a' : '#2563eb' }}><IonIcon icon={/\.(jpe?g|png|webp|gif|heic)$/i.test(d.ad) ? imageOutline : documentOutline} /></span>
                <span className="m"><b>{d.ad}</b><small>{d.alt_klasor}{d.alt_yol ? '/' + d.alt_yol : ''} · {boyutYaz(d.boyut)}{d.yukleyen ? ' · ' + d.yukleyen : ''}</small></span>
                <span className="tag t-g">{once(d.tarih)}</span>
              </button>
            ))}
          </div>
        )}
      </IonContent>
    </IonPage>
  );
}
