import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { IonBackButton, IonButton, IonButtons, IonContent, IonFooter, IonHeader, IonIcon, IonPage, IonSelect, IonSelectOption, IonSpinner, IonTextarea, IonTitle, IonToolbar, useIonActionSheet, useIonToast } from '@ionic/react';
import { attachOutline, businessOutline, cameraOutline, cardOutline, documentOutline, locationOutline, sendOutline, videocamOutline } from 'ionicons/icons';
import { cariMetni, ibanMetni, kartGetir, konumMetni, waAtacBilgi, waEkNumara, waGetir, waGonder } from '../api/hy';
import { aktifOturum } from '../api/client';
import type { Kart, WaMesaj } from '../api/types';
import { fotoCek } from '../foto';

function saat(t: string) {
  const d = new Date(t.replace(' ', 'T'));
  if (isNaN(d.getTime())) return t;
  const bugun = new Date().toDateString() === d.toDateString();
  return (bugun ? '' : d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }) + ' ') + d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

function base64Blob(b64: string, tip: string) {
  const ikili = atob(b64);
  const dizi = new Uint8Array(ikili.length);
  for (let i = 0; i < ikili.length; i++) dizi[i] = ikili.charCodeAt(i);
  return new Blob([dizi], { type: tip });
}

/** Müşteriyle WhatsApp yazışması: kartın WhatsApp geçmişi, metin/fotoğraf/dosya gönderme.
 *  Mesaj firmanın WhatsApp hattından (web paneliyle aynı) gider. */
export default function WaYazisma() {
  const { id } = useParams();
  const kartId = Number(id);
  const [kart, setKart] = useState<Kart | null>(null);
  const [mesajlar, setMesajlar] = useState<WaMesaj[] | null>(null);
  const [pencereAcik, setPencereAcik] = useState(true);
  const [sonGelen, setSonGelen] = useState<string | null>(null);
  const [metin, setMetin] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState('');
  const degisim = useRef('');
  const icerik = useRef<HTMLIonContentElement>(null);
  const dosyaGirdi = useRef<HTMLInputElement>(null);
  const videoGirdi = useRef<HTMLInputElement>(null);
  const [ekler, setEkler] = useState<{ numaralar: { telefon: string; ad?: string; pencere?: boolean }[]; ana_pencere?: boolean } | null>(null);
  const [kime, setKime] = useState('');
  const telGor = (aktifOturum()?.kartGorusYetkileri as any)?.iletisimGorebilir !== false;
  const [toast] = useIonToast();
  const [menu] = useIonActionSheet();

  const yukle = useCallback(async (tam = false) => {
    try {
      const r = await waGetir(kartId, tam ? '' : degisim.current);
      degisim.current = r.degisim || degisim.current;
      setPencereAcik(r.pencere_acik !== false);
      setSonGelen(r.son_gelen || null);
      setMesajlar((eski) => {
        if (tam || r.tam || !eski) return r.mesajlar || [];
        const harita = new Map(eski.map((m) => [String(m.id), m]));
        (r.mesajlar || []).forEach((m) => harita.set(String(m.id), m));
        return [...harita.values()].sort((a, b) => a.tarih.localeCompare(b.tarih));
      });
      setHata('');
    } catch (e: any) { setHata(e.message); }
  }, [kartId]);

  useEffect(() => {
    kartGetir(kartId).then(setKart).catch(() => {});
    waEkNumara(kartId).then(setEkler).catch(() => setEkler(null));
    yukle(true);
    const t = setInterval(() => yukle(), 10000);
    return () => clearInterval(t);
  }, [kartId, yukle]);

  const sayi = mesajlar?.length || 0;
  useEffect(() => { setTimeout(() => icerik.current?.scrollToBottom(200), 50); }, [sayi]);

  const gonder = async (dosya?: { blob: Blob; ad: string }) => {
    const m = metin.trim();
    if (!m && !dosya) return;
    setGonderiliyor(true);
    try {
      await waGonder(kartId, m, dosya, kime);
      setMetin('');
      await yukle();
    } catch (e: any) {
      toast({ message: 'Gönderilemedi: ' + e.message, duration: 3500, color: 'danger' });
    } finally { setGonderiliyor(false); }
  };

  /* 📎 menüsü: web panelindeki hy-wa-atac ile aynı seçenekler. Cari/IBAN/konum metni kutuya yazılır, kontrol edip gönderirsiniz. */
  const metneYaz = async (tur: 'cari' | 'iban' | 'konum') => {
    try {
      const b = await waAtacBilgi();
      const t = tur === 'cari' ? cariMetni(b.firma) : tur === 'iban' ? ibanMetni(b) : konumMetni(b.firma);
      if (!t) { toast({ message: 'Firma Bilgileri’nde banka hesabı yok (panel › Modül Ayarları).', duration: 3000 }); return; }
      setMetin((x) => (x.trim() ? x.trim() + '\n\n' : '') + t);
    } catch (e: any) { toast({ message: e.message, duration: 3000, color: 'danger' }); }
  };
  const ekle = () => menu({
    header: 'Gönder',
    buttons: [
      { text: 'Fotoğraf çek', icon: cameraOutline, handler: () => { fotoGonder(); } },
      { text: 'Video yolla (en çok 16 MB)', icon: videocamOutline, handler: () => { videoGirdi.current?.click(); } },
      { text: 'Dosya yolla', icon: documentOutline, handler: () => { dosyaGirdi.current?.click(); } },
      { text: 'Cari bilgilerimiz', icon: businessOutline, handler: () => { metneYaz('cari'); } },
      { text: 'IBAN yolla', icon: cardOutline, handler: () => { metneYaz('iban'); } },
      { text: 'Konum gönder', icon: locationOutline, handler: () => { metneYaz('konum'); } },
      { text: 'Vazgeç', role: 'cancel' },
    ],
  });

  const fotoGonder = async () => {
    try {
      const f = await fotoCek(); if (!f) return;
      await gonder({ blob: base64Blob(f.base64, 'image/' + (f.uzanti === 'jpg' ? 'jpeg' : f.uzanti)), ad: `foto-${Date.now()}.${f.uzanti}` });
    } catch (e: any) { toast({ message: e.message || 'Fotoğraf alınamadı', duration: 2500, color: 'danger' }); }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref={`/kartlar/${kartId}`} text="" /></IonButtons>
          <IonTitle>{kart?.musteri || `#${kartId}`}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent ref={icerik} className="hy-wa">
        {!mesajlar && !hata && <div className="hy-bos"><IonSpinner /></div>}
        {hata && !mesajlar && <div className="hy-bos">{hata}</div>}
        {mesajlar && mesajlar.length === 0 && <div className="hy-bos">Bu kartta henüz WhatsApp mesajı yok.</div>}
        <div className="hy-wa-liste">
          {(mesajlar || []).map((m) => (
            <div key={m.id} className={'hy-wa-balon ' + (m.yon === 'giden' ? 'giden' : 'gelen')}>
              {m.medya?.url && (/\.(jpe?g|png|webp|gif)(\?|$)/i.test(m.medya.ad || m.medya.url) || m.tip === 'image' || m.tip === 'sticker'
                ? <a href={m.medya.url} target="_blank" rel="noreferrer"><img src={m.medya.url} alt="" loading="lazy" /></a>
                : <a className="hy-wa-dosya" href={m.medya.url} target="_blank" rel="noreferrer"><IonIcon icon={documentOutline} /> {m.medya.ad || m.tip}</a>)}
              {m.ekstra?.tel && <div className="hy-wa-ek">📱 {[m.ekstra.tel_ad, telGor ? m.ekstra.tel : ''].filter(Boolean).join(' · ') || 'Ek numara'}</div>}
              {m.metin && <div className="hy-wa-metin">{m.metin}</div>}
              <div className="hy-wa-alt">
                {m.yon === 'giden' && m.gonderen ? m.gonderen + ' · ' : ''}{saat(m.tarih)}
                {m.yon === 'giden' && m.durum === 'read' ? ' ✓✓' : m.yon === 'giden' && m.durum ? ' ✓' : ''}
              </div>
            </div>
          ))}
        </div>
      </IonContent>
      <IonFooter>
        {!!ekler?.numaralar?.length && (() => {
          const sec = kime === 'ana' ? { pencere: ekler.ana_pencere } : ekler.numaralar.find((n) => n.telefon === kime);
          return (
            <div className="hy-wa-kime">
              <IonSelect label="👤 Kime" labelPlacement="start" interface="action-sheet" value={kime} onIonChange={(e) => setKime(String(e.detail.value || ''))}>
                <IonSelectOption value="">Otomatik (son yazan numara)</IonSelectOption>
                <IonSelectOption value="ana">Ana numara{telGor && kart?.telefon ? ' · ' + kart.telefon : ''} ({ekler.ana_pencere ? '24 sa. açık' : 'yalnız şablon'})</IonSelectOption>
                {ekler.numaralar.map((n) => (
                  <IonSelectOption key={n.telefon} value={n.telefon}>{[n.ad, telGor ? n.telefon : ''].filter(Boolean).join(' · ') || 'Ek numara'} ({n.pencere ? '24 sa. açık' : 'yalnız şablon'})</IonSelectOption>
                ))}
              </IonSelect>
              {kime && sec && !sec.pencere && <div className="hy-wa-uyari">Bu numara son 24 saatte yazmadı: serbest mesaj gitmez, panelden şablonla başlatın.</div>}
            </div>
          );
        })()}
        {!pencereAcik && sonGelen && (
          <div className="hy-wa-uyari">Müşterinin son mesajından 24 saat geçti. WhatsApp serbest mesaja izin vermiyor; müşteri yazınca yeniden açılır.</div>
        )}
        <IonToolbar>
          <div className="hy-satir" style={{ padding: '4px 6px', alignItems: 'flex-end' }}>
            <IonButton fill="clear" onClick={ekle} disabled={gonderiliyor} aria-label="Ek"><IonIcon icon={attachOutline} /></IonButton>
            <IonTextarea autoGrow rows={1} placeholder="Mesaj yazın" value={metin} onIonInput={(e) => setMetin(String(e.detail.value || ''))} style={{ flex: 1, maxHeight: 140 }} aria-label="Mesaj" />
            <IonButton onClick={() => gonder()} disabled={gonderiliyor || !metin.trim()} aria-label="Gönder">
              {gonderiliyor ? <IonSpinner name="dots" /> : <IonIcon icon={sendOutline} />}
            </IonButton>
          </div>
        </IonToolbar>
        <input ref={videoGirdi} type="file" accept="video/*" hidden onChange={(e) => {
          const f = e.target.files?.[0]; e.target.value = '';
          if (!f) return;
          if (f.size > 16 * 1024 * 1024) { toast({ message: 'Video 16 MB’tan büyük; WhatsApp kabul etmiyor.', duration: 3500, color: 'warning' }); return; }
          gonder({ blob: f, ad: f.name });
        }} />
        <input ref={dosyaGirdi} type="file" hidden onChange={(e) => {
          const f = e.target.files?.[0]; e.target.value = '';
          if (f) gonder({ blob: f, ad: f.name });
        }} />
      </IonFooter>
    </IonPage>
  );
}
