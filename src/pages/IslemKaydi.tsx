import { useEffect, useState } from 'react';
import { IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonItem, IonPage, IonRefresher, IonRefresherContent, IonSearchbar, IonSelect, IonSelectOption, IonSpinner, IonTitle, IonToolbar } from '@ionic/react';
import { istek } from '../api/client';
import { once } from '../api/ozet';

interface Kayit { id: number; kullanici_adi: string; rol?: string; zaman: string; modul: string; islem: string; aciklama: string; hedef_tip?: string; hedef_id?: string; hedef_ad?: string; cihaz?: string; ip?: string; sonuc?: number }
interface Yanit { toplam: number; sayfa: number; adet: number; kayitlar: Kayit[]; personeller: string[]; moduller: string[]; ozet?: { kullanici_adi: string; adet: string; son: string }[] }

/** İşlem Kayıtları (yalnız yönetici): kim, ne zaman, ne yaptı. Web panelindeki denetim günlüğüyle aynı servis. */
export default function IslemKaydi() {
  const [veri, setVeri] = useState<Yanit | null>(null);
  const [hata, setHata] = useState('');
  const [personel, setPersonel] = useState('');
  const [modul, setModul] = useState('');
  const [q, setQ] = useState('');
  const [sayfa, setSayfa] = useState(1);

  async function yukle() {
    const sorgu: Record<string, string | number> = { sayfa, adet: 50 };
    if (personel) sorgu.personel = personel;
    if (modul) sorgu.modul = modul;
    if (q.trim()) sorgu.q = q.trim();
    try { setVeri(await istek<Yanit>('hy-erp/v1/islem-kaydi', { sorgu })); setHata(''); } catch (e: any) { setHata(e.message); }
  }
  useEffect(() => { yukle(); }, [personel, modul, sayfa]);

  const sayfaSayisi = veri ? Math.max(1, Math.ceil(veri.toplam / (veri.adet || 50))) : 1;
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/moduller" text="" /></IonButtons>
          <IonTitle>İşlem Kayıtları</IonTitle>
        </IonToolbar>
        <IonToolbar><IonSearchbar placeholder="Açıklama veya kart ara" value={q} onIonInput={(e) => setQ(String(e.detail.value || ''))} onKeyDown={(e) => { if (e.key === 'Enter') { setSayfa(1); yukle(); } }} /></IonToolbar>
      </IonHeader>
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={async (e) => { await yukle(); e.detail.complete(); }}><IonRefresherContent /></IonRefresher>
        {veri && (
          <div style={{ display: 'flex', gap: 4, padding: '4px 8px' }}>
            <IonItem lines="none" style={{ flex: 1 }}><IonSelect label="Kişi" value={personel} onIonChange={(e) => { setSayfa(1); setPersonel(e.detail.value); }}><IonSelectOption value="">Hepsi</IonSelectOption>{veri.personeller.map((p) => <IonSelectOption key={p} value={p}>{p}</IonSelectOption>)}</IonSelect></IonItem>
            <IonItem lines="none" style={{ flex: 1 }}><IonSelect label="Modül" value={modul} onIonChange={(e) => { setSayfa(1); setModul(e.detail.value); }}><IonSelectOption value="">Hepsi</IonSelectOption>{veri.moduller.map((p) => <IonSelectOption key={p} value={p}>{p}</IonSelectOption>)}</IonSelect></IonItem>
          </div>
        )}
        {!veri && !hata && <div className="hy-bos"><IonSpinner /></div>}
        {hata && <div className="hy-bos">{hata}</div>}
        {veri && !veri.kayitlar.length && <div className="hy-bos">Kayıt yok.</div>}
        {!!veri?.kayitlar.length && (
          <section className="hy-mo-panel">
            <h3>{veri.toplam} kayıt</h3>
            {veri.kayitlar.map((k) => (
              <div key={k.id} className="hy-mo-satir">
                <span className="m">
                  <b>{k.kullanici_adi} · {k.modul}</b>
                  <small>{k.aciklama}{k.hedef_ad ? ' · ' + k.hedef_ad : ''}{k.cihaz ? ' · ' + k.cihaz : ''}</small>
                </span>
                <span className={'tag ' + (k.sonuc && k.sonuc >= 400 ? 't-r' : 't-g')}>{once(k.zaman)}</span>
              </div>
            ))}
          </section>
        )}
        {veri && sayfaSayisi > 1 && (
          <div className="hy-satir" style={{ justifyContent: 'center', gap: 12, padding: 12 }}>
            <IonButton size="small" fill="outline" disabled={sayfa <= 1} onClick={() => setSayfa(sayfa - 1)}>Önceki</IonButton>
            <span>{sayfa} / {sayfaSayisi}</span>
            <IonButton size="small" fill="outline" disabled={sayfa >= sayfaSayisi} onClick={() => setSayfa(sayfa + 1)}>Sonraki</IonButton>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
}
