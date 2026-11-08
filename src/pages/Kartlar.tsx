import { useCallback, useEffect, useMemo, useState } from 'react';
import { IonContent, IonHeader, IonPage, IonRefresher, IonRefresherContent, IonSearchbar, IonSegment, IonSegmentButton, IonLabel, IonTitle, IonToolbar, IonSpinner, IonIcon, useIonViewWillEnter, useIonRouter } from '@ionic/react';
import { albumsOutline } from 'ionicons/icons';
import { kartlariGetir } from '../api/hy';
import { sutun, sutunlar } from '../api/sutun';
import type { Kart } from '../api/types';

export default function Kartlar() {
  const [kartlar, setKartlar] = useState<Kart[] | null>(null);
  const [hata, setHata] = useState('');
  const [ara, setAra] = useState('');
  const [filtre, setFiltre] = useState('hepsi');
  const router = useIonRouter();

  const yukle = useCallback(async () => {
    try { setKartlar(await kartlariGetir()); setHata(''); } catch (e: any) { setHata(e.message); }
  }, []);
  useEffect(() => { yukle(); }, [yukle]);
  useIonViewWillEnter(() => { if (kartlar) yukle(); });

  const liste = useMemo(() => {
    const q = ara.toLocaleLowerCase('tr');
    return (kartlar || []).filter((k) => (filtre === 'hepsi' || k.durum === filtre) &&
      (!q || `${k.id} ${k.musteri} ${k.tanim} ${k.telefon}`.toLocaleLowerCase('tr').includes(q)));
  }, [kartlar, ara, filtre]);

  const sayac = (id: string) => (kartlar || []).filter((k) => k.durum === id).length;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar><IonTitle>Kartlar</IonTitle></IonToolbar>
        <IonToolbar>
          <IonSearchbar placeholder="Müşteri, kart no, telefon" value={ara} onIonInput={(e) => setAra(String(e.detail.value || ''))} />
        </IonToolbar>
        <IonToolbar>
          <IonSegment scrollable value={filtre} onIonChange={(e) => setFiltre(String(e.detail.value))}>
            <IonSegmentButton value="hepsi"><IonLabel>Hepsi</IonLabel></IonSegmentButton>
            {sutunlar().filter((s) => s.id !== 'arsiv').map((s) => (
              <IonSegmentButton key={s.id} value={s.id}><IonLabel>{s.ad} ({sayac(s.id)})</IonLabel></IonSegmentButton>
            ))}
          </IonSegment>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={async (e) => { await yukle(); e.detail.complete(); }}><IonRefresherContent /></IonRefresher>
        {!kartlar && !hata && <div className="hy-bos"><IonSpinner /></div>}
        {hata && <div className="hy-bos">{hata}</div>}
        {kartlar && liste.length === 0 && <div className="hy-bos"><IonIcon icon={albumsOutline} /><p>Kart bulunamadı.</p></div>}
        {liste.map((k) => {
          const s = sutun(k.durum);
          return (
            <div key={k.id} role="button" tabIndex={0} onClick={() => router.push(`/kartlar/${k.id}`)}>
              <div className="hy-liste-kart ion-activatable">
                <div className="hy-satir" style={{ justifyContent: 'space-between' }}>
                  <span className="hy-kartno">#{k.id}</span>
                  <span className="hy-etiket" style={{ background: s.renk + '22', color: s.renk }}>{s.ad}</span>
                </div>
                <h3>{k.musteri || 'İsimsiz müşteri'}</h3>
                <p>{k.tanim}</p>
                {k.teslim_tarihi && <div className="hy-soluk" style={{ marginTop: 6 }}>Teslim: {k.teslim_tarihi.slice(0, 10).split('-').reverse().join('.')}</div>}
              </div>
            </div>
          );
        })}
        <div style={{ height: 16 }} />
      </IonContent>
    </IonPage>
  );
}
