import { useEffect, useRef, useState } from 'react';
import { IonButton, IonButtons, IonContent, IonHeader, IonModal, IonSearchbar, IonSpinner, IonTitle, IonToolbar, useIonRouter } from '@ionic/react';
import { crmKartAra, type KartAraSonuc } from '../api/hy';
import { sutun } from '../api/sutun';

/** 🔍 Kart Ara (web panelindeki pencere): sunucuda kart no, müşteri, telefon, e-posta, iş detayı ve log içinde arar; arşivdekiler de çıkar. */
export default function KartAra({ acik, onKapat }: { acik: boolean; onKapat: () => void }) {
  const [q, setQ] = useState('');
  const [sonuc, setSonuc] = useState<KartAraSonuc[] | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState('');
  const no = useRef(0);
  const router = useIonRouter();
  const kutu = useRef<HTMLIonSearchbarElement>(null);

  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) { setSonuc(null); return; }
    const n = ++no.current;
    const z = setTimeout(async () => {
      setYukleniyor(true);
      try { const r = await crmKartAra(t); if (n === no.current) { setSonuc(r.sonuclar || []); setHata(''); } }
      catch (e: any) { if (n === no.current) setHata(e.message); }
      finally { if (n === no.current) setYukleniyor(false); }
    }, 350);
    return () => clearTimeout(z);
  }, [q]);

  const vurgu = (metin: string) => {
    const t = q.trim(); if (!t || !metin) return metin;
    const i = metin.toLocaleLowerCase('tr').indexOf(t.toLocaleLowerCase('tr'));
    return i < 0 ? metin : <>{metin.slice(0, i)}<mark>{metin.slice(i, i + t.length)}</mark>{metin.slice(i + t.length)}</>;
  };

  return (
    <IonModal isOpen={acik} onDidPresent={() => kutu.current?.setFocus()} onDidDismiss={onKapat}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>🔍 Kart Ara</IonTitle>
          <IonButtons slot="end"><IonButton onClick={onKapat}>Kapat</IonButton></IonButtons>
        </IonToolbar>
        <IonToolbar><IonSearchbar ref={kutu} value={q} debounce={0} placeholder="Kart no, müşteri, telefon, iş detayı, log…" onIonInput={(e) => setQ(String(e.detail.value || ''))} /></IonToolbar>
      </IonHeader>
      <IonContent>
        {yukleniyor && <div className="hy-bos" style={{ padding: 16 }}><IonSpinner name="dots" /></div>}
        {hata && <div className="hy-bos">{hata}</div>}
        {!sonuc && !yukleniyor && <p className="hy-soluk" style={{ padding: '16px', fontSize: 14 }}>En az 2 harf yazın. Arşivdeki kartlar da bulunur.</p>}
        {sonuc && !sonuc.length && !yukleniyor && <div className="hy-bos">Sonuç yok.</div>}
        <div className="hy-mo-panel" style={{ display: sonuc?.length ? undefined : 'none' }}>
          {(sonuc || []).map((k) => {
            const s = sutun(k.durum);
            return (
              <button key={k.id} className="hy-mo-satir" onClick={() => { onKapat(); router.push(`/kartlar/${k.id}`); }}>
                <span className="m">
                  <b>#{k.id} {vurgu(k.musteri || 'İsimsiz müşteri')}</b>
                  <small>{k.alan ? k.alan + ': ' : ''}{vurgu(k.parca || k.tanim || '')}</small>
                </span>
                <span className="tag" style={{ background: (s.renk || '#888') + '22', color: s.renk }}>{k.durum === 'arsiv' ? 'Arşiv' : s.ad}</span>
              </button>
            );
          })}
        </div>
      </IonContent>
    </IonModal>
  );
}
