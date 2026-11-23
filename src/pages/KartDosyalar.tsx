import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonIcon, IonPage, IonRefresher, IonRefresherContent, IonSegment, IonSegmentButton, IonLabel, IonSpinner, IonTitle, IonToolbar, IonFab, IonFabButton, useIonToast, useIonActionSheet, useIonAlert } from '@ionic/react';
import { addOutline, documentOutline, folderOpenOutline, imageOutline } from 'ionicons/icons';
import { boyutYaz, dosyaBlob, dosyaSil, dosyaUrl, dosyaYukle, kartDosyalari, type KartDosya } from '../api/kart';
import { aktifOturum } from '../api/client';
import { DosyaOnizle } from './DosyaOnizle';
import { once } from '../api/ozet';

/** Kartın dosyaları (web panelindeki "Dosyalar / klasörler"): alt klasörlere göre liste, dokununca açılır. */
export default function KartDosyalar() {
  const { id } = useParams();
  const kartId = Number(id);
  const [veri, setVeri] = useState<{ klasor: string; alt_klasorler: string[]; dosyalar: KartDosya[] } | null>(null);
  const [hata, setHata] = useState('');
  const [alt, setAlt] = useState('hepsi');
  const [toast] = useIonToast();
  const [menu] = useIonActionSheet();
  const [alert] = useIonAlert();
  const [onizle, setOnizle] = useState<number | null>(null);
  const yukleGirdi = useRef<HTMLInputElement>(null);
  const basili = useRef<any>(null);
  const uzunBasildi = useRef(false);
  const yonetici = aktifOturum()?.rol === 'YONETICI';

  async function yukle() {
    try { setVeri(await kartDosyalari(kartId)); setHata(''); } catch (e: any) { setHata(e.message); }
  }
  useEffect(() => { yukle(); }, [kartId]);

  const liste = useMemo(() => (veri?.dosyalar || []).filter((d) => alt === 'hepsi' || d.alt_klasor === alt), [veri, alt]);
  const sayi = (a: string) => (veri?.dosyalar || []).filter((d) => d.alt_klasor === a).length;

  const ac = (d: KartDosya) => setOnizle(liste.indexOf(d));
  const indir = async (d: KartDosya) => {
    try { toast({ message: 'Hazırlanıyor…', duration: 1200 }); window.open(await dosyaUrl(d), '_blank'); }
    catch (e: any) { toast({ message: e.message, duration: 3000, color: 'danger' }); }
  };
  const sil = (d: KartDosya) => alert({
    header: 'Dosyayı sil', message: `${d.ad} silinsin mi? Arşivdeki _Çöp klasörüne taşınır, 30 gün sonra kalıcı silinir.`,
    buttons: [{ text: 'Vazgeç', role: 'cancel' }, { text: 'Sil', role: 'destructive', handler: async () => {
      try { await dosyaSil(d.id); setVeri((v) => v && { ...v, dosyalar: v.dosyalar.filter((x) => x.id !== d.id) }); toast({ message: '🗑️ ' + d.ad + ' silindi', duration: 1800 }); }
      catch (e: any) { toast({ message: e.message, duration: 3000, color: 'danger' }); }
    } }],
  });
  /* Taşı = yeni klasöre yükle + eskisini sil (panelle aynı) */
  const tasi = (d: KartDosya) => menu({
    header: d.ad + ' → hangi klasöre?',
    buttons: [...(veri?.alt_klasorler || []).filter((a) => a !== d.alt_klasor).map((a) => ({ text: a, handler: () => { (async () => {
      try {
        toast({ message: '⏳ ' + a + ' klasörüne taşınıyor…', duration: 1500 });
        await dosyaYukle(kartId, a, [{ blob: await dosyaBlob(d), ad: d.ad }]);
        await dosyaSil(d.id);
        toast({ message: '✅ ' + a + ' klasörüne taşındı', duration: 1800, color: 'success' });
        setTimeout(yukle, 1500);
      } catch (e: any) { toast({ message: 'Taşınamadı: ' + e.message, duration: 3500, color: 'danger' }); }
    })(); } })), { text: 'Vazgeç', role: 'cancel' }],
  });
  const dosyaMenu = (d: KartDosya) => menu({
    header: d.ad,
    buttons: [
      { text: '👁️ Önizle', handler: () => { ac(d); } },
      ...(yonetici ? [{ text: '📁 Taşı', handler: () => { tasi(d); } }] : []),
      { text: '⬇️ İndir', handler: () => { indir(d); } },
      ...(yonetici ? [{ text: '🗑️ Sil', role: 'destructive', handler: () => { sil(d); } }] : []),
      { text: 'Vazgeç', role: 'cancel' },
    ],
  });
  const basBasla = (d: KartDosya) => { uzunBasildi.current = false; basili.current = setTimeout(() => { uzunBasildi.current = true; dosyaMenu(d); }, 550); };
  const basBitir = () => clearTimeout(basili.current);
  /* Sürükle-bırak yerine: telefondan seçilen dosyayı seçili klasöre kaydet */
  const klasoreKaydet = (dosyalar: File[]) => {
    const yap = async (a: string) => {
      try { toast({ message: '⏳ ' + dosyalar.length + ' dosya ' + a + ' klasörüne gönderiliyor…', duration: 1500 }); await dosyaYukle(kartId, a, dosyalar.map((f) => ({ blob: f, ad: f.name }))); toast({ message: '✅ ' + a + ' klasörüne kaydedildi', duration: 1800, color: 'success' }); setTimeout(yukle, 1500); }
      catch (e: any) { toast({ message: e.message, duration: 3500, color: 'danger' }); }
    };
    if (alt !== 'hepsi') { yap(alt); return; }
    menu({ header: 'Hangi klasöre kaydedilsin?', buttons: [...(veri?.alt_klasorler || []).map((a) => ({ text: a, handler: () => { yap(a); } })), { text: 'Vazgeç', role: 'cancel' }] });
  };

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
              <button key={d.id} className="hy-mo-satir" onClick={() => { if (!uzunBasildi.current) ac(d); uzunBasildi.current = false; }} onContextMenu={(e) => { e.preventDefault(); basBitir(); uzunBasildi.current = true; dosyaMenu(d); }}
                onTouchStart={() => basBasla(d)} onTouchEnd={basBitir} onTouchMove={basBitir}>
                <span className="av" style={{ background: /\.(jpe?g|png|webp|gif|heic)$/i.test(d.ad) ? '#16a34a' : '#2563eb' }}><IonIcon icon={/\.(jpe?g|png|webp|gif|heic)$/i.test(d.ad) ? imageOutline : documentOutline} /></span>
                <span className="m"><b>{d.ad}</b><small>{d.alt_klasor}{d.alt_yol ? '/' + d.alt_yol : ''} · {boyutYaz(d.boyut)}{d.yukleyen ? ' · ' + d.yukleyen : ''}</small></span>
                <span className="tag t-g">{once(d.tarih)}</span>
              </button>
            ))}
          </div>
        )}
        {veri && <p className="hy-soluk" style={{ fontSize: 12, textAlign: 'center', padding: '4px 16px 80px' }}>Dosyaya dokunun: önizleme. Uzun basın: Önizle / Taşı / İndir / Sil.</p>}
        <IonFab slot="fixed" vertical="bottom" horizontal="end">
          <IonFabButton aria-label="Klasöre kaydet" onClick={() => yukleGirdi.current?.click()}><IonIcon icon={addOutline} /></IonFabButton>
        </IonFab>
        <input ref={yukleGirdi} type="file" multiple hidden onChange={(e) => { const f = Array.from(e.target.files || []); e.target.value = ''; if (f.length) klasoreKaydet(f); }} />
        <DosyaOnizle liste={liste} sira={onizle} onKapat={() => setOnizle(null)} />
      </IonContent>
    </IonPage>
  );
}
