import { useEffect, useRef, useState } from 'react';
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonLabel, IonList, IonItem, IonModal, IonSpinner, IonTitle, IonToolbar, IonSegment, IonSegmentButton } from '@ionic/react';
import { chevronBackOutline, chevronForwardOutline, closeOutline, documentOutline, downloadOutline, imageOutline } from 'ionicons/icons';
import { boyutYaz, dosyaUrl, kartDosyalari, metinMi, resimMi, sesMi, videoMu, type KartDosya } from '../api/kart';

/** Tam ekran dosya önizleme (web paneldeki yüzen önizlemenin telefon hali): resim (iki parmakla yakınlaştır), video/ses oynar,
 *  metin gösterilir; diğerleri İndir/Aç. Sola-sağa kaydırınca aynı klasörde önceki/sonraki dosya. */
export function DosyaOnizle({ liste, sira, onKapat }: { liste: KartDosya[]; sira: number | null; onKapat: () => void }) {
  const [i, setI] = useState(0);
  const [url, setUrl] = useState('');
  const [metin, setMetin] = useState('');
  const [hata, setHata] = useState('');
  const dokun = useRef<number | null>(null);
  useEffect(() => { if (sira !== null) setI(sira); }, [sira]);
  const d = sira !== null ? liste[i] : undefined;

  useEffect(() => {
    if (!d) return;
    let iptal = false;
    setUrl(''); setMetin(''); setHata('');
    dosyaUrl(d).then(async (u) => {
      if (iptal) return;
      setUrl(u);
      if (metinMi(d.ad)) { try { const t = await (await fetch(u)).text(); if (!iptal) setMetin(t.slice(0, 200000)); } catch { /* indir düğmesi kalır */ } }
    }).catch((e) => !iptal && setHata(e.message));
    return () => { iptal = true; };
  }, [d?.id]); // eslint-disable-line

  const git = (y: number) => setI((x) => Math.min(liste.length - 1, Math.max(0, x + y)));

  return (
    <IonModal isOpen={sira !== null} onDidDismiss={onKapat} className="hy-onizle">
      <IonHeader>
        <IonToolbar color="dark">
          <IonButtons slot="start"><IonButton onClick={onKapat} aria-label="Kapat"><IonIcon slot="icon-only" icon={closeOutline} /></IonButton></IonButtons>
          <IonTitle style={{ fontSize: 15 }}>{d?.ad}<div style={{ fontSize: 11, opacity: .7 }}>{d ? `${i + 1}/${liste.length} · ${d.alt_klasor} · ${boyutYaz(d.boyut)}` : ''}</div></IonTitle>
          <IonButtons slot="end">{url && <IonButton href={url} target="_blank" download={d?.ad} aria-label="İndir"><IonIcon slot="icon-only" icon={downloadOutline} /></IonButton>}</IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent color="dark" scrollY={!!metin}>
        <div className="hy-oz-govde"
          onTouchStart={(e) => { dokun.current = e.touches.length === 1 ? e.touches[0].clientX : null; }}
          onTouchEnd={(e) => { if (dokun.current === null) return; const dx = e.changedTouches[0].clientX - dokun.current; dokun.current = null; if (Math.abs(dx) > 70) git(dx < 0 ? 1 : -1); }}>
          {!url && !hata && <div className="hy-oz-orta"><IonSpinner /><p>{d && (d.uzak || !(d.url || d.indir_url)) ? 'Ofisten getiriliyor…' : 'Yükleniyor…'}</p></div>}
          {hata && <div className="hy-oz-orta"><p>{hata}</p></div>}
          {url && d && (resimMi(d.ad) ? <div className="hy-oz-resim"><img src={url} alt={d.ad} /></div>
            : videoMu(d.ad) ? <video src={url} controls playsInline className="hy-oz-medya" />
            : sesMi(d.ad) ? <div className="hy-oz-orta"><audio src={url} controls /></div>
            : metin ? <pre className="hy-oz-metin">{metin}</pre>
            : <div className="hy-oz-orta"><IonIcon icon={documentOutline} style={{ fontSize: 64 }} /><p>Bu dosya türü burada gösterilemiyor.</p><IonButton href={url} target="_blank"><IonIcon slot="start" icon={downloadOutline} />Aç / İndir</IonButton></div>)}
        </div>
        {liste.length > 1 && <>
          <button className="hy-oz-ok sol" disabled={i === 0} onClick={() => git(-1)} aria-label="Önceki"><IonIcon icon={chevronBackOutline} /></button>
          <button className="hy-oz-ok sag" disabled={i >= liste.length - 1} onClick={() => git(1)} aria-label="Sonraki"><IonIcon icon={chevronForwardOutline} /></button>
        </>}
      </IonContent>
    </IonModal>
  );
}

/** E-postaya "Karttan ekle": kart klasörlerinden dosya seçtirir. */
export function KartDosyaSecici({ acik, kartId, onKapat, onSec }: { acik: boolean; kartId: number; onKapat: () => void; onSec: (d: KartDosya[]) => void }) {
  const [veri, setVeri] = useState<{ alt_klasorler: string[]; dosyalar: KartDosya[] } | null>(null);
  const [alt, setAlt] = useState('hepsi');
  const [secili, setSecili] = useState<number[]>([]);
  useEffect(() => { if (acik) { setSecili([]); kartDosyalari(kartId).then(setVeri).catch(() => setVeri({ alt_klasorler: [], dosyalar: [] })); } }, [acik, kartId]);
  const liste = (veri?.dosyalar || []).filter((d) => alt === 'hepsi' || d.alt_klasor === alt);
  return (
    <IonModal isOpen={acik} onDidDismiss={onKapat}>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonButton onClick={onKapat}>Vazgeç</IonButton></IonButtons>
          <IonTitle>Kart dosyalarından ekle</IonTitle>
          <IonButtons slot="end"><IonButton strong disabled={!secili.length} onClick={() => onSec((veri?.dosyalar || []).filter((d) => secili.includes(d.id)))}>Ekle ({secili.length})</IonButton></IonButtons>
        </IonToolbar>
        {veri && <IonToolbar><IonSegment scrollable value={alt} onIonChange={(e) => setAlt(String(e.detail.value))}>
          <IonSegmentButton value="hepsi"><IonLabel>Hepsi</IonLabel></IonSegmentButton>
          {veri.alt_klasorler.map((a) => <IonSegmentButton key={a} value={a}><IonLabel>{a}</IonLabel></IonSegmentButton>)}
        </IonSegment></IonToolbar>}
      </IonHeader>
      <IonContent>
        {!veri && <div className="hy-bos"><IonSpinner /></div>}
        {veri && !liste.length && <div className="hy-bos">Bu klasörde dosya yok.</div>}
        <IonList>
          {liste.map((d) => (
            <IonItem key={d.id} button detail={false} onClick={() => setSecili((s) => s.includes(d.id) ? s.filter((x) => x !== d.id) : [...s, d.id])}>
              <IonIcon slot="start" icon={resimMi(d.ad) ? imageOutline : documentOutline} />
              <IonLabel><h3>{d.ad}</h3><p>{d.alt_klasor} · {boyutYaz(d.boyut)}{d.uzak ? ' · ofiste' : ''}</p></IonLabel>
              <input type="checkbox" slot="end" readOnly checked={secili.includes(d.id)} />
            </IonItem>
          ))}
        </IonList>
      </IonContent>
    </IonModal>
  );
}
