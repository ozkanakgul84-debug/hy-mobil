import { useCallback, useState } from 'react';
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonPage, IonRefresher, IonRefresherContent, IonTitle, IonToolbar, IonSpinner, useIonRouter, useIonViewWillEnter } from '@ionic/react';
import { notificationsOffOutline } from 'ionicons/icons';
import { bildirimler, bildirimOkundu } from '../api/hy';
import type { Bildirim } from '../api/types';

const IKON: Record<string, string> = { wa_mesaj: '💬', gorev: '🚐', surec: '🔄', email: '📧', teklif: '📄', odeme: '💰' };

export default function Bildirimler({ onSayac }: { onSayac: (n: number) => void }) {
  const [liste, setListe] = useState<Bildirim[] | null>(null);
  const [hata, setHata] = useState('');
  const router = useIonRouter();

  const yukle = useCallback(async () => {
    try { const b = await bildirimler(); setListe(b.liste); onSayac(b.okunmamis); setHata(''); }
    catch (e: any) { setHata(e.message); }
  }, [onSayac]);
  useIonViewWillEnter(() => { yukle(); });

  const ac = async (b: Bildirim) => {
    if (!b.okundu) { bildirimOkundu(b.id).then((r: any) => onSayac(r.okunmamis ?? 0)).catch(() => {}); b.okundu = 1; setListe([...(liste || [])]); }
    if (b.kart_id) router.push(`/kartlar/${b.kart_id}`);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Bildirimler</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={async () => { await bildirimOkundu(); yukle(); }}>Tümü okundu</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={async (e) => { await yukle(); e.detail.complete(); }}><IonRefresherContent /></IonRefresher>
        {!liste && !hata && <div className="hy-bos"><IonSpinner /></div>}
        {hata && <div className="hy-bos">{hata}</div>}
        {liste && liste.length === 0 && <div className="hy-bos"><IonIcon icon={notificationsOffOutline} /><p>Bildirim yok.</p></div>}
        {liste?.map((b) => (
          <div key={b.id} role="button" tabIndex={0} onClick={() => ac(b)}>
            <div className="hy-liste-kart" style={{ display: 'flex', gap: 12, opacity: b.okundu ? 0.65 : 1 }}>
              <div style={{ fontSize: 22 }}>{IKON[b.olay] || '🔔'}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="hy-satir" style={{ justifyContent: 'space-between' }}>
                  <strong>{b.baslik}</strong>
                  {!b.okundu && <span style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--ion-color-primary)', flex: 'none' }} />}
                </div>
                <p style={{ WebkitLineClamp: 3 }}>{b.metin}</p>
                <div className="hy-soluk" style={{ marginTop: 4 }}>{b.tarih}</div>
              </div>
            </div>
          </div>
        ))}
      </IonContent>
    </IonPage>
  );
}
