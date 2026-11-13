import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  IonBackButton, IonButton, IonButtons, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonInput, IonItem, IonList,
  IonModal, IonPage, IonRefresher, IonRefresherContent, IonSelect, IonSelectOption, IonSpinner, IonTextarea, IonTitle, IonToolbar, useIonToast,
} from '@ionic/react';
import { arrowUndoOutline, attachOutline, closeOutline, createOutline, documentOutline, mailOutline, sendOutline } from 'ionicons/icons';
import { kartGetir } from '../api/hy';
import type { Kart } from '../api/types';
import { boyutYaz, epostaGetir, epostaGonder, epostaHesaplari, hesapImzasi, kartEpostalari, type EpHesap, type EpMesaj, type EpMesajTam } from '../api/kart';
import { once } from '../api/ozet';

function dosyaAc(url: string) { window.open(url, '_blank'); }

/** Kartın e-posta yazışması (web panelindeki kart "E-posta" bölümü): liste, okuma, yanıt ve yeni e-posta. */
export default function KartEposta() {
  const { id } = useParams();
  const kartId = Number(id);
  const [kart, setKart] = useState<Kart | null>(null);
  const [liste, setListe] = useState<EpMesaj[] | null>(null);
  const [hata, setHata] = useState('');
  const [acik, setAcik] = useState<EpMesajTam | null>(null);
  const [yaz, setYaz] = useState<null | { kime: string; konu: string; metin: string; yanit_id?: number }>(null);

  async function yukle() {
    try {
      const [k, l] = await Promise.all([kartGetir(kartId), kartEpostalari(kartId)]);
      setKart(k); setListe((l.mesajlar || []).slice().sort((a, b) => b.tarih.localeCompare(a.tarih))); setHata('');
    } catch (e: any) { setHata(e.message); }
  }
  useEffect(() => { yukle(); }, [kartId]);

  async function mesajAc(m: EpMesaj) {
    try { setAcik(await epostaGetir(m.id)); } catch (e: any) { setHata(e.message); }
  }
  function yanitla(m: EpMesajTam) {
    const kime = m.rol === 'gelen' ? (m.reply_to || m.kimden || '') : (m.kime || []).map((x) => x.email).join(', ');
    setAcik(null);
    setYaz({ kime, konu: /^(ynt|re):/i.test(m.konu) ? m.konu : 'Ynt: ' + m.konu, metin: '', yanit_id: m.id });
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref={`/kartlar/${kartId}`} text="" /></IonButtons>
          <IonTitle>E-posta · {kart?.musteri || '#' + kartId}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={async (e) => { await yukle(); e.detail.complete(); }}><IonRefresherContent /></IonRefresher>
        {!liste && !hata && <div className="hy-bos"><IonSpinner /></div>}
        {hata && <div className="hy-bos">{hata}</div>}
        {liste && !liste.length && <div className="hy-bos"><IonIcon icon={mailOutline} /><p>Bu kartta e-posta yok.</p></div>}
        <div className="hy-mo-panel" style={{ display: liste?.length ? undefined : 'none' }}>
          {liste?.map((m) => (
            <button key={m.id} className="hy-mo-satir" onClick={() => mesajAc(m)}>
              <span className="av" style={{ background: m.rol === 'giden' ? '#64748b' : '#2563eb' }}>{m.rol === 'giden' ? '↗' : '↘'}</span>
              <span className="m">
                <b>{m.rol === 'giden' ? 'Gönderildi' : m.kimden_ad || m.kimden}{m.ek_sayisi ? ' 📎' : ''}</b>
                <small><strong>{m.konu}</strong> · {m.ozet}</small>
              </span>
              <span className="tag t-g">{once(m.tarih)}</span>
            </button>
          ))}
        </div>
        <div style={{ height: 80 }} />
        <IonFab slot="fixed" vertical="bottom" horizontal="end">
          <IonFabButton aria-label="Yeni e-posta" onClick={() => setYaz({ kime: kart?.email || '', konu: '', metin: '' })}><IonIcon icon={createOutline} /></IonFabButton>
        </IonFab>

        <IonModal isOpen={!!acik} onDidDismiss={() => setAcik(null)}>
          <IonHeader><IonToolbar>
            <IonButtons slot="start"><IonButton onClick={() => setAcik(null)}><IonIcon icon={closeOutline} /></IonButton></IonButtons>
            <IonTitle>{acik?.konu}</IonTitle>
            <IonButtons slot="end">{acik && <IonButton onClick={() => yanitla(acik)}><IonIcon slot="start" icon={arrowUndoOutline} />Yanıtla</IonButton>}</IonButtons>
          </IonToolbar></IonHeader>
          <IonContent>
            {acik && (
              <div style={{ padding: '10px 14px' }}>
                <div style={{ fontSize: 13 }}><b>{acik.rol === 'giden' ? 'Giden' : acik.kimden_ad || acik.kimden}</b> {acik.kimden && acik.rol === 'gelen' ? `<${acik.kimden}>` : ''}</div>
                <div className="hy-soluk" style={{ fontSize: 12 }}>
                  {acik.kime?.length ? 'Kime: ' + acik.kime.map((x) => x.email).join(', ') + ' · ' : ''}{acik.cc?.length ? 'Cc: ' + acik.cc.map((x) => x.email).join(', ') + ' · ' : ''}{acik.tarih}
                </div>
                {!!acik.ekler?.length && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '10px 0' }}>
                    {acik.ekler.map((e) => (
                      <IonButton key={e.id} size="small" fill="outline" onClick={() => dosyaAc(e.gor || e.url)}><IonIcon slot="start" icon={documentOutline} />{e.ad} ({boyutYaz(e.boyut)})</IonButton>
                    ))}
                  </div>
                )}
                {acik.html
                  ? <iframe title="e-posta" sandbox="allow-popups allow-popups-to-escape-sandbox" srcDoc={'<base target="_blank"><meta name="viewport" content="width=device-width"><style>body{font-family:sans-serif;font-size:14px;margin:0;word-break:break-word}img{max-width:100%;height:auto}</style>' + acik.html} style={{ width: '100%', minHeight: '60vh', border: 0, background: '#fff', borderRadius: 8 }} />
                  : <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{acik.text || acik.ozet}</pre>}
              </div>
            )}
          </IonContent>
        </IonModal>

        <EpostaYaz kartId={kartId} taslak={yaz} onKapat={() => setYaz(null)} onGitti={() => { setYaz(null); setTimeout(yukle, 800); }} />
      </IonContent>
    </IonPage>
  );
}

function EpostaYaz({ kartId, taslak, onKapat, onGitti }: { kartId: number; taslak: null | { kime: string; konu: string; metin: string; yanit_id?: number }; onKapat: () => void; onGitti: () => void }) {
  const [hesaplar, setHesaplar] = useState<EpHesap[] | null>(null);
  const [hesap, setHesap] = useState(0);
  const [kime, setKime] = useState('');
  const [cc, setCc] = useState('');
  const [konu, setKonu] = useState('');
  const [metin, setMetin] = useState('');
  const [ekler, setEkler] = useState<File[]>([]);
  const [imza, setImza] = useState(true);
  const [gidiyor, setGidiyor] = useState(false);
  const dosyaGirdi = useRef<HTMLInputElement>(null);
  const [toast] = useIonToast();

  useEffect(() => {
    if (!taslak) return;
    setKime(taslak.kime); setKonu(taslak.konu); setMetin(taslak.metin); setCc(''); setEkler([]);
    if (!hesaplar) epostaHesaplari().then((h) => { setHesaplar(h); if (h[0]) setHesap(h[0].id); }).catch((e) => toast({ message: e.message, duration: 2500, color: 'danger' }));
  }, [taslak]);

  async function gonder() {
    if (!hesap) { toast({ message: 'Gönderebileceğiniz bir e-posta hesabı yok.', duration: 2500, color: 'warning' }); return; }
    if (!kime.trim() || !konu.trim()) { toast({ message: 'Alıcı ve konu yazın.', duration: 2000, color: 'warning' }); return; }
    setGidiyor(true);
    try {
      const h = hesaplar?.find((x) => x.id === hesap);
      await epostaGonder({ hesap_id: hesap, kime, cc, konu, metin, kart_id: kartId, yanit_id: taslak?.yanit_id, dosyalar: ekler.map((f) => ({ blob: f, ad: f.name })), imzaHtml: imza ? hesapImzasi(h) : '' });
      toast({ message: 'E-posta gönderildi', duration: 1800, color: 'success' });
      onGitti();
    } catch (e: any) { toast({ message: e.message, duration: 3000, color: 'danger' }); }
    finally { setGidiyor(false); }
  }

  return (
    <IonModal isOpen={!!taslak} onDidDismiss={onKapat}>
      <IonHeader><IonToolbar>
        <IonButtons slot="start"><IonButton onClick={onKapat}><IonIcon icon={closeOutline} /></IonButton></IonButtons>
        <IonTitle>{taslak?.yanit_id ? 'Yanıtla' : 'Yeni e-posta'}</IonTitle>
        <IonButtons slot="end"><IonButton strong disabled={gidiyor} onClick={gonder}>{gidiyor ? <IonSpinner name="dots" /> : <><IonIcon slot="start" icon={sendOutline} />Gönder</>}</IonButton></IonButtons>
      </IonToolbar></IonHeader>
      <IonContent>
        <IonList>
          {hesaplar && hesaplar.length > 1 && (
            <IonItem><IonSelect label="Gönderen" value={hesap} onIonChange={(e) => setHesap(e.detail.value)}>{hesaplar.map((h) => <IonSelectOption key={h.id} value={h.id}>{h.email}</IonSelectOption>)}</IonSelect></IonItem>
          )}
          {hesaplar && hesaplar.length === 1 && <IonItem><IonInput label="Gönderen" readonly value={hesaplar[0].email} /></IonItem>}
          <IonItem><IonInput label="Kime" type="email" value={kime} onIonInput={(e) => setKime(String(e.detail.value || ''))} placeholder="ornek@firma.com" /></IonItem>
          <IonItem><IonInput label="Cc" value={cc} onIonInput={(e) => setCc(String(e.detail.value || ''))} /></IonItem>
          <IonItem><IonInput label="Konu" value={konu} onIonInput={(e) => setKonu(String(e.detail.value || ''))} /></IonItem>
          <IonItem><IonTextarea autoGrow rows={8} placeholder="Mesajınız" value={metin} onIonInput={(e) => setMetin(String(e.detail.value || ''))} aria-label="Mesaj" /></IonItem>
        </IonList>
        <div style={{ padding: '4px 14px', display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          <IonButton size="small" fill="outline" onClick={() => dosyaGirdi.current?.click()}><IonIcon slot="start" icon={attachOutline} />Dosya ekle</IonButton>
          <label style={{ fontSize: 13 }}><input type="checkbox" checked={imza} onChange={(e) => setImza(e.target.checked)} /> İmza ekle</label>
          {ekler.map((f, i) => (
            <span key={i} className="hy-etiket" onClick={() => setEkler(ekler.filter((_, j) => j !== i))}>{f.name} ✕</span>
          ))}
          <input ref={dosyaGirdi} type="file" multiple hidden onChange={(e) => { setEkler([...ekler, ...Array.from(e.target.files || [])]); e.target.value = ''; }} />
        </div>
      </IonContent>
    </IonModal>
  );
}
