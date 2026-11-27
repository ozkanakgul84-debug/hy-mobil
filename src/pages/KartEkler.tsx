import { useEffect, useRef, useState } from 'react';
import {
  IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonInput, IonItem, IonList, IonModal, IonSelect, IonSelectOption,
  IonSpinner, IonTextarea, IonTitle, IonToolbar, useIonToast,
} from '@ionic/react';
import { addOutline, closeOutline, micOutline, stopCircleOutline } from 'ionicons/icons';
import { kartTasarimlari, type TasarimProje, kartSahaGorevleri, kartTeklifleri, medyaYukle, sahaGoreviVer, type SahaGorevi, type SahaSecenek, type Teklif } from '../api/kart';
import { usePanel } from '../panelKanca';

const GOREV_RENK: Record<string, string> = { planlandi: 't-g', yolda: 't-a', sahada: 't-a', bitti: 't-y', iptal: 't-r' };

/** Kartın saha görevleri + "Saha görevi ver" (web panelindeki kart "Saha" bölümü). */
export function SahaBolumu({ kartId }: { kartId: number }) {
  const [veri, setVeri] = useState<{ gorevler: SahaGorevi[]; atayabilir: boolean; secenekler: SahaSecenek } | null>(null);
  const [form, setForm] = useState(false);
  const yukle = () => kartSahaGorevleri(kartId).then(setVeri).catch(() => setVeri({ gorevler: [], atayabilir: false, secenekler: { turler: {}, personel: [] } }));
  useEffect(() => { yukle(); }, [kartId]);
  if (!veri) return null;
  return (
    <section className="hy-mo-panel">
      <h3 style={{ justifyContent: 'space-between' }}>
        <span>🚐 Saha</span>
        {veri.atayabilir && <IonButton size="small" onClick={() => setForm(true)}><IonIcon slot="start" icon={addOutline} />Saha görevi ver</IonButton>}
      </h3>
      {!veri.gorevler.length && <div className="hy-mo-bos">Saha görevi yok.</div>}
      {veri.gorevler.map((g) => (
        <div key={g.id} className="hy-mo-satir">
          <span className="m"><b>{g.tur_ad || veri.secenekler.turler[g.tur] || g.tur} · {g.atanan_ad || g.atanan}</b><small>{g.tarih?.split('-').reverse().join('.')} {g.saat || ''}{g.notlar ? ' · ' + g.notlar : ''}</small></span>
          <span className={'tag ' + (GOREV_RENK[g.durum] || 't-g')}>{g.durum_ad || g.durum}</span>
        </div>
      ))}
      <SahaGorevFormu acik={form} kartId={kartId} secenek={veri.secenekler} onKapat={() => setForm(false)} onKaydedildi={() => { setForm(false); yukle(); }} />
    </section>
  );
}

function SahaGorevFormu({ acik, kartId, secenek, onKapat, onKaydedildi }: { acik: boolean; kartId: number; secenek: SahaSecenek; onKapat: () => void; onKaydedildi: () => void }) {
  const turler = Object.entries(secenek.turler || {});
  const [tur, setTur] = useState('');
  const [tarih, setTarih] = useState('');
  const [saat, setSaat] = useState('09:00');
  const [sure, setSure] = useState('1');
  const [atanan, setAtanan] = useState('');
  const [notlar, setNotlar] = useState('');
  const [gidiyor, setGidiyor] = useState(false);
  const [toast] = useIonToast();

  useEffect(() => {
    if (!acik) return;
    setTur(turler[0]?.[0] || 'montaj'); setTarih(new Date().toISOString().slice(0, 10)); setAtanan(''); setNotlar('');
  }, [acik]);

  async function kaydet() {
    if (!atanan) { toast({ message: 'Kim gidecek, seçin.', duration: 2000, color: 'warning' }); return; }
    if (!tarih) { toast({ message: 'Tarih seçin.', duration: 2000, color: 'warning' }); return; }
    const [tip, ...ad] = atanan.split(':');
    const s = parseFloat(sure.replace(',', '.') || '0');
    setGidiyor(true);
    try {
      await sahaGoreviVer({ kart_id: kartId, tur, tarih, saat, sure_dk: isNaN(s) ? 0 : Math.round(s * 60), atanan_tip: tip, atanan: ad.join(':'), notlar });
      toast({ message: 'Saha görevi verildi', duration: 1800, color: 'success' });
      onKaydedildi();
    } catch (e: any) { toast({ message: e.message, duration: 3000, color: 'danger' }); }
    finally { setGidiyor(false); }
  }

  return (
    <IonModal isOpen={acik} onDidDismiss={onKapat}>
      <IonHeader><IonToolbar>
        <IonButtons slot="start"><IonButton onClick={onKapat}><IonIcon icon={closeOutline} /></IonButton></IonButtons>
        <IonTitle>Saha görevi ver</IonTitle>
        <IonButtons slot="end"><IonButton strong disabled={gidiyor} onClick={kaydet}>{gidiyor ? <IonSpinner name="dots" /> : 'Görevi ver'}</IonButton></IonButtons>
      </IonToolbar></IonHeader>
      <IonContent>
        <IonList>
          <IonItem><IonSelect label="Görev türü" value={tur} onIonChange={(e) => setTur(e.detail.value)}>{turler.map(([k, v]) => <IonSelectOption key={k} value={k}>{v}</IonSelectOption>)}</IonSelect></IonItem>
          <IonItem>
            <IonSelect label="Kim gidecek" placeholder="Seçin" value={atanan} onIonChange={(e) => setAtanan(e.detail.value)}>
              {(secenek.ekipler || []).map((e: any) => <IonSelectOption key={'e' + e.id} value={'ekip:' + e.id}>Ekip: {e.ad}</IonSelectOption>)}
              {secenek.personel.map((p) => <IonSelectOption key={p.kullanici_adi} value={'personel:' + p.kullanici_adi}>{p.kullanici_adi}{p.unvan ? ` (${p.unvan})` : ''}</IonSelectOption>)}
            </IonSelect>
          </IonItem>
          <IonItem><IonInput label="Tarih" type="date" value={tarih} onIonInput={(e) => setTarih(String(e.detail.value || ''))} /></IonItem>
          <IonItem><IonInput label="Saat" type="time" value={saat} onIonInput={(e) => setSaat(String(e.detail.value || ''))} /></IonItem>
          <IonItem><IonInput label="Süre (saat)" inputmode="decimal" value={sure} onIonInput={(e) => setSure(String(e.detail.value || ''))} /></IonItem>
          <IonItem><IonTextarea label="Not" labelPlacement="stacked" autoGrow rows={3} value={notlar} onIonInput={(e) => setNotlar(String(e.detail.value || ''))} /></IonItem>
        </IonList>
      </IonContent>
    </IonModal>
  );
}

/** Kartın teklifleri. Teklif düzenleyicisi (kalemler, PDF, kaşe) web panelinde açılır. */
export function TeklifBolumu({ kartId }: { kartId: number }) {
  const [liste, setListe] = useState<Teklif[] | null>(null);
  const panel = usePanel();
  useEffect(() => { kartTeklifleri(kartId).then(setListe).catch(() => setListe([])); }, [kartId]);
  if (!liste) return null;
  const tl = (n?: number | string) => { const x = Number(n); return x > 0 ? x.toLocaleString('tr-TR', { maximumFractionDigits: 2 }) + ' ₺' : ''; };
  return (
    <section className="hy-mo-panel">
      <h3 style={{ justifyContent: 'space-between' }}>
        <span>📋 Teklifler</span>
        <IonButton size="small" disabled={panel.aciliyor} onClick={() => panel.ac([`kart:${kartId}`, 'metin:Teklif Hazırla'])}><IonIcon slot="start" icon={addOutline} />Teklif hazırla</IonButton>
      </h3>
      {!liste.length && <div className="hy-mo-bos">Bu kartta teklif yok.</div>}
      {liste.map((t) => (
        <button key={t.id} className="hy-mo-satir" onClick={() => panel.ac([`kart:${kartId}`, 'metin:Teklif Hazırla'])}>
          <span className="m"><b>{t.teklif_no}</b><small>{[t.durum, tl(t.genel_toplam ?? t.toplam), t.olusturan].filter(Boolean).join(' · ')}</small></span>
          <span className="tag t-g">{(t.tarih || t.olusturma || '').slice(0, 10).split('-').reverse().join('.')}</span>
        </button>
      ))}
    </section>
  );
}

/** Sesli not: telefonun mikrofonuyla kaydeder, karta yükler (web panelindeki "ses kaydet" ile aynı servis). */
export function SesKaydi({ acik, kartId, onKapat, onYuklendi }: { acik: boolean; kartId: number; onKapat: () => void; onYuklendi: () => void }) {
  const [durum, setDurum] = useState<'hazir' | 'kayit' | 'yukleniyor'>('hazir');
  const [sn, setSn] = useState(0);
  const kayit = useRef<MediaRecorder | null>(null);
  const parca = useRef<Blob[]>([]);
  const bas = useRef(0);
  const [toast] = useIonToast();

  useEffect(() => {
    if (durum !== 'kayit') return;
    const t = setInterval(() => setSn(Math.round((Date.now() - bas.current) / 1000)), 500);
    return () => clearInterval(t);
  }, [durum]);
  useEffect(() => { if (!acik) { kayit.current?.stream.getTracks().forEach((t) => t.stop()); kayit.current = null; setDurum('hazir'); setSn(0); } }, [acik]);

  async function basla() {
    try {
      const akis = await navigator.mediaDevices.getUserMedia({ audio: true });
      const tip = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      const r = new MediaRecorder(akis, tip ? { mimeType: tip } : undefined);
      parca.current = [];
      r.ondataavailable = (e) => { if (e.data.size) parca.current.push(e.data); };
      r.onstop = () => {
        akis.getTracks().forEach((t) => t.stop());
        const blob = new Blob(parca.current, { type: r.mimeType || 'audio/webm' });
        const sure = `${Math.floor((Date.now() - bas.current) / 60000)}:${String(Math.round((Date.now() - bas.current) / 1000) % 60).padStart(2, '0')}`;
        const okuyucu = new FileReader();
        okuyucu.onload = async () => {
          setDurum('yukleniyor');
          try {
            await medyaYukle(kartId, 'ses', String(okuyucu.result), /mp4|aac/.test(blob.type) ? 'm4a' : 'webm', sure);
            toast({ message: 'Ses kaydı karta eklendi', duration: 1800, color: 'success' });
            onYuklendi();
          } catch (e: any) { toast({ message: e.message, duration: 3000, color: 'danger' }); setDurum('hazir'); }
        };
        okuyucu.readAsDataURL(blob);
      };
      kayit.current = r;
      bas.current = Date.now();
      r.start();
      setDurum('kayit');
    } catch {
      toast({ message: 'Mikrofona erişilemedi. Telefon ayarlarından uygulamaya mikrofon izni verin.', duration: 3500, color: 'danger' });
    }
  }

  return (
    <IonModal isOpen={acik} onDidDismiss={onKapat} initialBreakpoint={0.4} breakpoints={[0, 0.4]}>
      <IonContent className="ion-padding">
        <div style={{ textAlign: 'center', paddingTop: 12 }}>
          <h2 style={{ margin: '0 0 6px', fontWeight: 800 }}>Sesli not</h2>
          <div style={{ fontSize: 32, fontVariantNumeric: 'tabular-nums', margin: '8px 0 16px' }}>{Math.floor(sn / 60)}:{String(sn % 60).padStart(2, '0')}</div>
          {durum === 'hazir' && <IonButton size="large" onClick={basla}><IonIcon slot="start" icon={micOutline} />Kaydı başlat</IonButton>}
          {durum === 'kayit' && <IonButton size="large" color="danger" onClick={() => kayit.current?.stop()}><IonIcon slot="start" icon={stopCircleOutline} />Bitir ve kaydet</IonButton>}
          {durum === 'yukleniyor' && <IonSpinner />}
        </div>
      </IonContent>
    </IonModal>
  );
}

/** Karta bağlı 2D/3D tasarımlar (sitedeki "Tasarım ve Sunumlar"). Tasarım stüdyosu panelde açılır. */
export function TasarimBolumu({ kartId }: { kartId: number }) {
  const [liste, setListe] = useState<TasarimProje[] | null>(null);
  const panel = usePanel();
  useEffect(() => { kartTasarimlari(kartId).then(setListe).catch(() => setListe([])); }, [kartId]);
  if (!liste) return null;
  return (
    <section className="hy-mo-panel">
      <h3 style={{ justifyContent: 'space-between' }}>
        <span>✏️ Tasarımlar</span>
        <IonButton size="small" disabled={panel.aciliyor} onClick={() => panel.ac([`cagir:HYTasarim.ac:${JSON.stringify({ kart: kartId })}`])}><IonIcon slot="start" icon={addOutline} />Tasarım aç</IonButton>
      </h3>
      {!liste.length && <div className="hy-mo-bos">Bu karta bağlı tasarım yok.</div>}
      {liste.map((p) => (
        <button key={p.id} className="hy-mo-satir" onClick={() => panel.ac([`cagir:HYTasarim.ac:${JSON.stringify({ proje: String(p.id) })}`])}>
          {p.onizleme ? <img src={p.onizleme} alt="" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8 }} /> : <span className="av" style={{ background: '#7c3aed' }}>✏️</span>}
          <span className="m"><b>{p.ad}</b><small>Rev {p.rev}{p.tarih ? ' · ' + p.tarih : ''}</small></span>
        </button>
      ))}
    </section>
  );
}
