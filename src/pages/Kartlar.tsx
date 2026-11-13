import { useCallback, useEffect, useMemo, useState } from 'react';
import { IonButton, IonButtons, useIonActionSheet, useIonToast, IonContent, IonFab, IonFabButton, IonHeader, IonPage, IonRefresher, IonRefresherContent, IonSearchbar, IonSegment, IonSegmentButton, IonLabel, IonTitle, IonToolbar, IonSpinner, IonIcon, useIonViewWillEnter, useIonRouter } from '@ionic/react';
import { albumsOutline, addOutline, listOutline, swapHorizontalOutline, gridOutline } from 'ionicons/icons';
import { aktifOturum } from '../api/client';
import KartFormu from './KartFormu';
import { kartGuncelle, kartlariGetir } from '../api/hy';
import { sutun, sutunlar } from '../api/sutun';
import type { Kart } from '../api/types';

export default function Kartlar() {
  const [kartlar, setKartlar] = useState<Kart[] | null>(null);
  const [hata, setHata] = useState('');
  const [ara, setAra] = useState('');
  const [filtre, setFiltre] = useState('hepsi');
  const router = useIonRouter();
  const [yeni, setYeni] = useState(false);
  const yeniAcabilir = aktifOturum()?.crmIslemYetkileri?.yeniKartAcabilir !== false;
  const [pano, setPano] = useState(() => { try { return localStorage.getItem('hy_kart_gorunum') === 'pano'; } catch { return false; } });
  const [menu] = useIonActionSheet();
  const [toast] = useIonToast();
  const gorunum = (p: boolean) => { setPano(p); try { localStorage.setItem('hy_kart_gorunum', p ? 'pano' : 'liste'); } catch { /* yoksay */ } };

  /** Panoda kartı başka sütuna taşı (web panelindeki sürükle-bırak yerine). */
  const tasi = (k: Kart) => menu({
    header: '#' + k.id + ' ' + k.musteri,
    subHeader: 'Hangi sütuna taşınsın?',
    buttons: [...sutunlar().filter((x) => !x.arsiv).map((x) => ({ text: (x.id === k.durum ? '● ' : '') + x.ad, handler: () => {
      if (x.id === k.durum) return;
      setKartlar((l) => l && l.map((y) => (y.id === k.id ? { ...y, durum: x.id } : y)));
      kartGuncelle(k.id, { durum: x.id }).then(() => toast({ message: 'Taşındı: ' + x.ad, duration: 1200 }))
        .catch((e) => { toast({ message: e.message, duration: 2500, color: 'danger' }); yukle(); });
    } })), { text: 'Vazgeç', role: 'cancel' }],
  });

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
        <IonToolbar>
          <IonTitle>Kartlar</IonTitle>
          <IonButtons slot="end"><IonButton onClick={() => gorunum(!pano)} aria-label={pano ? 'Liste görünümü' : 'Sütun panosu'}><IonIcon slot="icon-only" icon={pano ? listOutline : gridOutline} /></IonButton></IonButtons>
        </IonToolbar>
        <IonToolbar>
          <IonSearchbar placeholder="Müşteri, kart no, telefon" value={ara} onIonInput={(e) => setAra(String(e.detail.value || ''))} />
        </IonToolbar>
        {!pano && <IonToolbar>
          <IonSegment scrollable value={filtre} onIonChange={(e) => setFiltre(String(e.detail.value))}>
            <IonSegmentButton value="hepsi"><IonLabel>Hepsi</IonLabel></IonSegmentButton>
            {sutunlar().filter((s) => !s.arsiv).map((s) => (
              <IonSegmentButton key={s.id} value={s.id}><IonLabel>{s.ad} ({sayac(s.id)})</IonLabel></IonSegmentButton>
            ))}
          </IonSegment>
        </IonToolbar>}
      </IonHeader>
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={async (e) => { await yukle(); e.detail.complete(); }}><IonRefresherContent /></IonRefresher>
        {!kartlar && !hata && <div className="hy-bos"><IonSpinner /></div>}
        {hata && <div className="hy-bos">{hata}</div>}
        {kartlar && liste.length === 0 && <div className="hy-bos"><IonIcon icon={albumsOutline} /><p>Kart bulunamadı.</p></div>}
        {pano && kartlar && (
          <div className="hy-pano">
            {sutunlar().filter((x) => !x.arsiv).map((sx) => {
              const ks = liste.filter((k) => k.durum === sx.id);
              return (
                <div key={sx.id} className="hy-pano-sutun">
                  <div className="bas" style={{ borderTopColor: sx.renk }}><b>{sx.ad}</b><span>{ks.length}</span></div>
                  {ks.map((k) => (
                    <div key={k.id} className="hy-pano-kart" onClick={() => router.push(`/kartlar/${k.id}`)}>
                      <div className="hy-satir" style={{ justifyContent: 'space-between' }}>
                        <span className="hy-kartno">#{k.id}</span>
                        <button aria-label="Taşı" onClick={(e) => { e.stopPropagation(); tasi(k); }}><IonIcon icon={swapHorizontalOutline} /></button>
                      </div>
                      <b>{k.musteri || 'İsimsiz müşteri'}</b>
                      <p>{k.tanim}</p>
                    </div>
                  ))}
                  {!ks.length && <div className="hy-soluk" style={{ fontSize: 12, padding: 8 }}>Kart yok</div>}
                </div>
              );
            })}
          </div>
        )}
        {!pano && liste.map((k) => {
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
        <div style={{ height: 88 }} />
        {yeniAcabilir && (
          <IonFab slot="fixed" vertical="bottom" horizontal="end">
            <IonFabButton onClick={() => setYeni(true)} aria-label="Yeni kart"><IonIcon icon={addOutline} /></IonFabButton>
          </IonFab>
        )}
        <KartFormu acik={yeni} onKapat={() => setYeni(false)} onKaydedildi={(id) => { setYeni(false); yukle(); if (id) router.push(`/kartlar/${id}`); }} />
      </IonContent>
    </IonPage>
  );
}
