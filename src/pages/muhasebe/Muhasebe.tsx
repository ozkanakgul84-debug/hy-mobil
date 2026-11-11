import { useCallback, useEffect, useMemo, useState } from 'react';
import { IonBackButton, IonButtons, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonNote, IonPage, IonRefresher, IonRefresherContent, IonSearchbar, IonSegment, IonSegmentButton, IonSpinner, IonTitle, IonToolbar, useIonRouter, useIonViewWillEnter } from '@ionic/react';
import { addOutline } from 'ionicons/icons';
import { BELGE_DURUM, BELGE_TIPLERI, CARI_TIPLERI, belgelerGetir, carilerGetir, muOturum, para, tarihTR, type Belge, type Cari } from '../../api/muhasebe';
import CariFormu from './CariFormu';
import FaturaFormu from './FaturaFormu';

/** Muhasebe: faturalar ve cariler. Yeni fatura / yeni cari buradan. */
export default function Muhasebe() {
  const [sekme, setSekme] = useState<'fatura' | 'cari'>('fatura');
  const [belgeler, setBelgeler] = useState<Belge[] | null>(null);
  const [cariler, setCariler] = useState<Cari[] | null>(null);
  const [ara, setAra] = useState('');
  const [hata, setHata] = useState('');
  const [yetki, setYetki] = useState<Record<string, boolean>>({});
  const [faturaAc, setFaturaAc] = useState(false);
  const [cariForm, setCariForm] = useState<{ acik: boolean; cari?: Cari | null }>({ acik: false });
  const router = useIonRouter();

  const yukle = useCallback(async () => {
    try {
      const [o, b, c] = await Promise.all([muOturum(), belgelerGetir(), carilerGetir()]);
      setYetki(o.yonetici ? { fatura: true, goruntule: true } : o.yetki || {});
      setBelgeler(b); setCariler(c); setHata('');
    } catch (e: any) { setHata(e.message); }
  }, []);
  useEffect(() => { yukle(); }, [yukle]);
  useIonViewWillEnter(() => { if (belgeler) yukle(); });

  const q = ara.toLocaleLowerCase('tr');
  const fListe = useMemo(() => (belgeler || []).filter((b) => !q || `${b.belge_no} ${b.cari_unvan}`.toLocaleLowerCase('tr').includes(q)), [belgeler, q]);
  const cListe = useMemo(() => (cariler || []).filter((c) => !q || `${c.unvan} ${c.telefon} ${c.vergi_no}`.toLocaleLowerCase('tr').includes(q)), [cariler, q]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/moduller" text="" /></IonButtons>
          <IonTitle>Muhasebe</IonTitle>
        </IonToolbar>
        <IonToolbar>
          <IonSegment value={sekme} onIonChange={(e) => setSekme(e.detail.value as any)}>
            <IonSegmentButton value="fatura"><IonLabel>Faturalar</IonLabel></IonSegmentButton>
            <IonSegmentButton value="cari"><IonLabel>Cariler</IonLabel></IonSegmentButton>
          </IonSegment>
        </IonToolbar>
        <IonToolbar><IonSearchbar value={ara} onIonInput={(e) => setAra(String(e.detail.value || ''))} placeholder={sekme === 'fatura' ? 'Fatura no, cari' : 'Ünvan, telefon, vergi no'} /></IonToolbar>
      </IonHeader>
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={async (e) => { await yukle(); e.detail.complete(); }}><IonRefresherContent /></IonRefresher>
        {!belgeler && !hata && <div className="hy-bos"><IonSpinner /></div>}
        {hata && <div className="hy-bos">{hata}</div>}

        {sekme === 'fatura' && belgeler && (
          <IonList>
            {fListe.map((b) => (
              <IonItem key={b.id} button onClick={() => router.push(`/muhasebe/fatura/${b.id}`)}>
                <IonLabel>
                  <h3>{b.cari_unvan}</h3>
                  <p>{b.belge_no || 'Taslak'} · {BELGE_TIPLERI[b.tip]} · {tarihTR(b.tarih)}</p>
                </IonLabel>
                <div slot="end" style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700 }}>{para(b.genel_toplam, b.doviz)}</div>
                  <IonNote color={b.durum === 'iptal' ? 'danger' : b.durum === 'taslak' ? 'warning' : 'success'}>{BELGE_DURUM[b.durum] || b.durum}</IonNote>
                </div>
              </IonItem>
            ))}
            {!fListe.length && <div className="hy-bos">Fatura yok.</div>}
          </IonList>
        )}

        {sekme === 'cari' && cariler && (
          <IonList>
            {cListe.map((c) => (
              <IonItem key={c.id} button onClick={() => setCariForm({ acik: true, cari: c })}>
                <IonLabel>
                  <h3>{c.unvan}</h3>
                  <p>{CARI_TIPLERI[c.tip] || c.tip}{c.telefon ? ' · ' + c.telefon : ''}</p>
                  {c.fatura_eksik?.length ? <p style={{ color: '#d97706' }}>Fatura bilgisi eksik</p> : null}
                </IonLabel>
                {c.bakiye ? <IonNote slot="end" color={c.bakiye > 0 ? 'success' : 'danger'}>{para(Math.abs(c.bakiye))} {c.bakiye > 0 ? '(A)' : '(B)'}</IonNote> : null}
              </IonItem>
            ))}
            {!cListe.length && <div className="hy-bos">Cari yok.</div>}
          </IonList>
        )}
        <div style={{ height: 88 }} />
        {(sekme === 'cari' || yetki.fatura !== false) && (
          <IonFab slot="fixed" vertical="bottom" horizontal="end">
            <IonFabButton onClick={() => (sekme === 'fatura' ? setFaturaAc(true) : setCariForm({ acik: true, cari: null }))} aria-label="Ekle"><IonIcon icon={addOutline} /></IonFabButton>
          </IonFab>
        )}
        <FaturaFormu acik={faturaAc} onKapat={() => setFaturaAc(false)} onKaydedildi={(id) => { setFaturaAc(false); yukle(); router.push(`/muhasebe/fatura/${id}`); }} />
        <CariFormu acik={cariForm.acik} cari={cariForm.cari} onKapat={() => setCariForm({ acik: false })} onKaydedildi={() => { setCariForm({ acik: false }); yukle(); }} />
      </IonContent>
    </IonPage>
  );
}
