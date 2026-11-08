import { useCallback, useEffect, useState } from 'react';
import { IonContent, IonHeader, IonPage, IonRefresher, IonRefresherContent, IonSegment, IonSegmentButton, IonLabel, IonTitle, IonToolbar, IonSpinner, IonIcon, useIonRouter, useIonViewWillEnter } from '@ionic/react';
import { carOutline, timeOutline, locationOutline } from 'ionicons/icons';
import { adresMetni, gorevleriGetir } from '../api/hy';
import type { Gorev } from '../api/types';

export const DURUM_RENK: Record<string, string> = { planlandi: '#8a94a6', yolda: '#f5a623', sahada: '#4ea8de', bitti: '#00b894', iptal: '#d63031' };
export const TUR_IKON: Record<string, string> = { kesif: '🚩', montaj: '🏴', servis: '🛠️', sokum: '🔨', teslimat: '🚚', atolye: '🏭' };

export function tarihYaz(t: string) {
  const bugun = new Date().toISOString().slice(0, 10);
  const yarin = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
  if (t === bugun) return 'Bugün';
  if (t === yarin) return 'Yarın';
  return new Date(t + 'T12:00:00').toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function Saha() {
  const [aralik, setAralik] = useState<'bugun' | 'hafta' | 'tumu'>('bugun');
  const [gorevler, setGorevler] = useState<Gorev[] | null>(null);
  const [hata, setHata] = useState('');
  const router = useIonRouter();

  const yukle = useCallback(async () => {
    try { setGorevler(await gorevleriGetir(aralik)); setHata(''); } catch (e: any) { setHata(e.message); }
  }, [aralik]);
  useEffect(() => { setGorevler(null); yukle(); }, [yukle]);
  useIonViewWillEnter(() => { yukle(); });

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar><IonTitle>Saha görevleri</IonTitle></IonToolbar>
        <IonToolbar>
          <IonSegment value={aralik} onIonChange={(e) => setAralik(e.detail.value as any)}>
            <IonSegmentButton value="bugun"><IonLabel>Bugün</IonLabel></IonSegmentButton>
            <IonSegmentButton value="hafta"><IonLabel>Bu hafta</IonLabel></IonSegmentButton>
            <IonSegmentButton value="tumu"><IonLabel>Tümü</IonLabel></IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={async (e) => { await yukle(); e.detail.complete(); }}><IonRefresherContent /></IonRefresher>
        {!gorevler && !hata && <div className="hy-bos"><IonSpinner /></div>}
        {hata && <div className="hy-bos">{hata}</div>}
        {gorevler && gorevler.length === 0 && <div className="hy-bos"><IonIcon icon={carOutline} /><p>Bu aralıkta görev yok.</p></div>}
        {gorevler?.map((g) => {
          const a = adresMetni(g.adres_panosu);
          return (
            <div key={g.id} role="button" tabIndex={0} onClick={() => router.push(`/saha/${g.id}`)}>
              <div className="hy-liste-kart ion-activatable" style={{ borderLeft: `4px solid ${DURUM_RENK[g.durum]}` }}>
                <div className="hy-satir" style={{ justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700 }}>{TUR_IKON[g.tur] || '📌'} {g.tur_ad}</span>
                  <span className="hy-etiket" style={{ background: DURUM_RENK[g.durum] + '22', color: DURUM_RENK[g.durum] }}>{g.durum_ad}</span>
                </div>
                <h3>{g.musteri || `Kart #${g.kart_id}`}</h3>
                <div className="hy-satir hy-soluk"><IonIcon icon={timeOutline} />{tarihYaz(g.tarih)}{g.saat ? ` · ${g.saat.slice(0, 5)}` : ''} · {g.atanan_ad}</div>
                {a.metin && <div className="hy-satir hy-soluk" style={{ marginTop: 2 }}><IonIcon icon={locationOutline} />{a.metin}</div>}
              </div>
            </div>
          );
        })}
        <div style={{ height: 16 }} />
      </IonContent>
    </IonPage>
  );
}
