import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { IonBackButton, IonButton, IonButtons, IonContent, IonFooter, IonHeader, IonIcon, IonPage, IonSpinner, IonTextarea, IonTitle, IonToolbar, useIonToast } from '@ionic/react';
import { chatbubblesOutline, sendOutline } from 'ionicons/icons';
import { aktifOturum } from '../api/client';
import { kartYazismasi, yazismaGonder, type YzMesaj } from '../api/kart';
import { once } from '../api/ozet';

/** Kart içi ekip yazışması (web panelindeki kartın "Yazışma" bölümü). Müşteri görmez. */
export default function KartYazisma() {
  const { id } = useParams();
  const kartId = Number(id);
  const ben = aktifOturum()?.kullaniciAdi;
  const [mesajlar, setMesajlar] = useState<YzMesaj[] | null>(null);
  const [kanal, setKanal] = useState(0);
  const [metin, setMetin] = useState('');
  const [gidiyor, setGidiyor] = useState(false);
  const [hata, setHata] = useState('');
  const icerik = useRef<HTMLIonContentElement>(null);
  const [toast] = useIonToast();

  async function yukle() {
    try { const r = await kartYazismasi(kartId); setMesajlar(r.mesajlar); setKanal(r.kanalId); setHata(''); setTimeout(() => icerik.current?.scrollToBottom(0), 50); }
    catch (e: any) { setHata(e.message); }
  }
  useEffect(() => { yukle(); const t = setInterval(yukle, 15000); return () => clearInterval(t); }, [kartId]);

  async function gonder() {
    const m = metin.trim(); if (!m) return;
    setGidiyor(true);
    try { await yazismaGonder(kartId, kanal, m); setMetin(''); await yukle(); }
    catch (e: any) { toast({ message: e.message, duration: 2500, color: 'danger' }); }
    finally { setGidiyor(false); }
  }

  return (
    <IonPage>
      <IonHeader><IonToolbar>
        <IonButtons slot="start"><IonBackButton defaultHref={`/kartlar/${kartId}`} text="" /></IonButtons>
        <IonTitle>Yazışma · #{kartId}</IonTitle>
      </IonToolbar></IonHeader>
      <IonContent ref={icerik} className="hy-wa">
        {!mesajlar && !hata && <div className="hy-bos"><IonSpinner /></div>}
        {hata && <div className="hy-bos">{hata}</div>}
        {mesajlar && !mesajlar.length && <div className="hy-bos"><IonIcon icon={chatbubblesOutline} /><p>Bu kartta ekip yazışması yok. Müşteri bu mesajları görmez.</p></div>}
        <div className="hy-wa-liste">
          {mesajlar?.map((m) => {
            const benim = m.yazan === ben;
            return (
              <div key={m.id} className={'hy-wa-balon ' + (benim ? 'giden' : 'gelen')}>
                {!benim && <div style={{ fontSize: 11, fontWeight: 700, opacity: .7 }}>{m.yazan}</div>}
                <div style={{ whiteSpace: 'pre-wrap' }}>{m.silindi ? <i>silindi</i> : m.metin}</div>
                {m.ekler?.map((e, i) => <a key={i} href={e.url} target="_blank" rel="noreferrer" style={{ display: 'block', fontSize: 12 }}>📎 {e.ad}</a>)}
                <div className="hy-wa-alt">{once(m.tarih)}</div>
              </div>
            );
          })}
        </div>
      </IonContent>
      <IonFooter><IonToolbar>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, padding: '0 6px' }}>
          <IonTextarea autoGrow rows={1} placeholder="Ekibe yaz…" value={metin} onIonInput={(e) => setMetin(String(e.detail.value || ''))} style={{ flex: 1 }} aria-label="Mesaj" />
          <IonButton onClick={gonder} disabled={gidiyor || !metin.trim()} aria-label="Gönder"><IonIcon icon={sendOutline} /></IonButton>
        </div>
      </IonToolbar></IonFooter>
    </IonPage>
  );
}
