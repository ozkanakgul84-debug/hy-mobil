import { useEffect, useMemo, useRef, useState } from 'react';
import {
  IonBackButton, IonButton, IonButtons, IonContent, IonFab, IonFabButton, IonHeader, IonIcon, IonInput, IonItem, IonList, IonModal,
  IonPage, IonRefresher, IonRefresherContent, IonSelect, IonSelectOption, IonSpinner, IonTextarea, IonTitle, IonToolbar,
  useIonActionSheet, useIonAlert, useIonRouter, useIonToast,
} from '@ionic/react';
import { addOutline, calendarOutline, chevronBackOutline, chevronForwardOutline, closeOutline, openOutline, timerOutline } from 'ionicons/icons';
import { iso, kartAra, olaylar, randevuDurum, randevuKaydet, randevuSil, takvimGetir, terminHesapla, trGun, type Olay, type TakvimVeri } from '../api/takvim';
import { usePanel } from '../panelKanca';

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

/** Takvim: randevu, keşif, toplantı, saha/montaj görevleri ve terminler (web panelindeki Takvim ile aynı veri). */
export default function Takvim() {
  const [ay, setAy] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [veri, setVeri] = useState<TakvimVeri | null>(null);
  const [hata, setHata] = useState('');
  const [form, setForm] = useState<null | { tarih: string }>(null);
  const [termin, setTermin] = useState(false);
  const icerik = useRef<HTMLIonContentElement>(null);
  const router = useIonRouter();
  const panel = usePanel();
  const [menu] = useIonActionSheet();
  const [alert] = useIonAlert();
  const [toast] = useIonToast();

  async function yukle() {
    const bit = new Date(ay.getFullYear(), ay.getMonth() + 1, 0);
    try { setVeri(await takvimGetir(iso(ay), iso(bit))); setHata(''); } catch (e: any) { setHata(e.message); }
  }
  useEffect(() => { setVeri(null); yukle(); }, [ay]);

  const gunler = useMemo(() => {
    if (!veri) return [] as [string, Olay[]][];
    const g: Record<string, Olay[]> = {};
    olaylar(veri).forEach((o) => { (g[o.tarih] = g[o.tarih] || []).push(o); });
    return Object.entries(g).sort(([a], [b]) => (a < b ? -1 : 1));
  }, [veri]);

  // Bu ay açıksa bugüne kaydır
  useEffect(() => {
    if (!veri) return;
    setTimeout(() => { const el = document.getElementById('hy-tk-' + veri.bugun) || document.querySelector('[data-tk-sonra]'); if (el) icerik.current?.scrollToPoint(0, (el as HTMLElement).offsetTop - 8, 300); }, 100);
  }, [veri]);

  function olayTikla(o: Olay) {
    if (o.k !== 'r') { if (o.kartId) router.push(`/kartlar/${o.kartId}`); return; }
    const r = o.ham;
    menu({
      header: o.baslik,
      subHeader: [r.tarih?.split('-').reverse().join('.'), r.saat, o.alt, r.notlar].filter(Boolean).join(' · '),
      buttons: [
        ...(r.duzenleyebilir !== false && r.durum !== 'yapildi' ? [{ text: '✅ Yapıldı', handler: () => { durum(r.id, 'yapildi'); } }] : []),
        ...(r.duzenleyebilir !== false && r.durum !== 'ertelendi' ? [{ text: '⏸️ Ertelendi', handler: () => { durum(r.id, 'ertelendi'); } }] : []),
        ...(r.duzenleyebilir !== false && r.durum !== 'iptal' ? [{ text: '✖️ İptal', handler: () => { durum(r.id, 'iptal'); } }] : []),
        ...(r.telefon ? [{ text: '📞 Ara: ' + r.telefon, handler: () => { window.open('tel:' + r.telefon.replace(/[^\d+]/g, ''), '_self'); } }] : []),
        ...(r.kart_id ? [{ text: '🗂️ Kartı aç (TR-' + r.kart_id + ')', handler: () => { router.push(`/kartlar/${r.kart_id}`); } }] : []),
        ...(r.duzenleyebilir !== false ? [{ text: '🗑️ Sil', role: 'destructive', handler: () => { sil(r.id); } }] : []),
        { text: 'Vazgeç', role: 'cancel' },
      ],
    });
  }
  async function durum(id: number, d: string) {
    try { await randevuDurum(id, d); toast({ message: 'Kaydedildi', duration: 1200 }); yukle(); } catch (e: any) { toast({ message: e.message, duration: 2500, color: 'danger' }); }
  }
  function sil(id: number) {
    alert({ header: 'Randevu silinsin mi?', buttons: [{ text: 'Vazgeç', role: 'cancel' }, { text: 'Sil', role: 'destructive', handler: async () => {
      try { await randevuSil(id); toast({ message: 'Silindi', duration: 1200 }); yukle(); } catch (e: any) { toast({ message: e.message, duration: 2500, color: 'danger' }); }
    } }] });
  }

  const bugun = veri?.bugun || iso(new Date());

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/moduller" text="" /></IonButtons>
          <IonTitle>Takvim</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setTermin(true)} aria-label="Termin hesapla"><IonIcon slot="icon-only" icon={timerOutline} /></IonButton>
            <IonButton onClick={() => panel.ac(['#btntakvim'])} aria-label="Panelde aç"><IonIcon slot="icon-only" icon={openOutline} /></IonButton>
          </IonButtons>
        </IonToolbar>
        <IonToolbar>
          <div className="hy-satir" style={{ justifyContent: 'space-between', padding: '0 4px' }}>
            <IonButton fill="clear" onClick={() => setAy(new Date(ay.getFullYear(), ay.getMonth() - 1, 1))} aria-label="Önceki ay"><IonIcon icon={chevronBackOutline} /></IonButton>
            <b>{AYLAR[ay.getMonth()]} {ay.getFullYear()}</b>
            <IonButton fill="clear" onClick={() => setAy(new Date(ay.getFullYear(), ay.getMonth() + 1, 1))} aria-label="Sonraki ay"><IonIcon icon={chevronForwardOutline} /></IonButton>
          </div>
        </IonToolbar>
      </IonHeader>
      <IonContent ref={icerik}>
        <IonRefresher slot="fixed" onIonRefresh={async (e) => { await yukle(); e.detail.complete(); }}><IonRefresherContent /></IonRefresher>
        {!veri && !hata && <div className="hy-bos"><IonSpinner /></div>}
        {hata && <div className="hy-bos">{hata}</div>}
        {!!veri?.sonuc_bekleyen?.length && (
          <section className="hy-mo-panel">
            <h3>Sonucu girilmemiş randevular <span className="say">{veri.sonuc_bekleyen.length}</span></h3>
            {veri.sonuc_bekleyen.map((r) => (
              <button key={r.id} className="hy-mo-satir" onClick={() => olayTikla({ k: 'r', id: 'r' + r.id, tarih: r.tarih, saat: r.saat || '', baslik: r.baslik || r.kisi || r.musteri || r.tur, alt: '', renk: '', ham: r })}>
                <span className="m"><b>{r.baslik || r.kisi || r.musteri || r.tur}</b><small>{r.tarih.split('-').reverse().join('.')} {r.saat}</small></span>
              </button>
            ))}
          </section>
        )}
        {veri && !gunler.length && <div className="hy-bos"><IonIcon icon={calendarOutline} /><p>Bu ay takvimde kayıt yok.</p></div>}
        {gunler.map(([gun, l], i) => (
          <section key={gun} id={'hy-tk-' + gun} className="hy-mo-panel" {...(gun >= bugun && (i === 0 || gunler[i - 1][0] < bugun) ? { 'data-tk-sonra': '1' } : {})}>
            <h3 style={{ justifyContent: 'space-between' }}>
              <span style={{ color: gun === bugun ? 'var(--ion-color-primary)' : undefined }}>{gun === bugun ? 'Bugün · ' : ''}{trGun(gun)}</span>
              <IonButton size="small" fill="clear" onClick={() => setForm({ tarih: gun })} aria-label="Bu güne ekle"><IonIcon icon={addOutline} /></IonButton>
            </h3>
            {l.map((o) => (
              <button key={o.id} className="hy-mo-satir" onClick={() => olayTikla(o)} style={{ opacity: o.soluk ? 0.5 : 1 }}>
                <span style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, background: o.renk, flex: 'none' }} />
                <span style={{ width: 44, flex: 'none', fontWeight: 700, fontSize: 13 }}>{o.saat || 'Tüm gün'}</span>
                <span className="m"><b style={{ textDecoration: o.bitti ? 'line-through' : undefined }}>{o.baslik}</b>{o.alt && <small>{o.alt}</small>}</span>
              </button>
            ))}
          </section>
        ))}
        <div style={{ height: 88 }} />
        {veri?.planlayici !== false && (
          <IonFab slot="fixed" vertical="bottom" horizontal="end">
            <IonFabButton aria-label="Yeni randevu" onClick={() => setForm({ tarih: bugun })}><IonIcon icon={addOutline} /></IonFabButton>
          </IonFab>
        )}
        <RandevuFormu taslak={form} veri={veri} onKapat={() => setForm(null)} onKaydedildi={() => { setForm(null); yukle(); }} />
        <TerminHesapla acik={termin} varsayilan={veri?.ayar?.uretim_gun ?? 10} onKapat={() => setTermin(false)} />
      </IonContent>
    </IonPage>
  );
}

function RandevuFormu({ taslak, veri, onKapat, onKaydedildi }: { taslak: null | { tarih: string }; veri: TakvimVeri | null; onKapat: () => void; onKaydedildi: () => void }) {
  const [tur, setTur] = useState('randevu');
  const [baslik, setBaslik] = useState('');
  const [tarih, setTarih] = useState('');
  const [saat, setSaat] = useState('10:00');
  const [sure, setSure] = useState('60');
  const [yer, setYer] = useState('');
  const [kisi, setKisi] = useState('');
  const [telefon, setTelefon] = useState('');
  const [kart, setKart] = useState<{ id: number; musteri: string } | null>(null);
  const [notlar, setNotlar] = useState('');
  const [hatirlat, setHatirlat] = useState('30');
  const [gidiyor, setGidiyor] = useState(false);
  const [alert] = useIonAlert();
  const [toast] = useIonToast();

  useEffect(() => {
    if (!taslak) return;
    setTur('randevu'); setBaslik(''); setTarih(taslak.tarih); setSaat('10:00'); setSure('60'); setYer(''); setKisi(''); setTelefon(''); setKart(null); setNotlar(''); setHatirlat('30');
  }, [taslak]);

  function kartSec() {
    alert({
      header: 'Kart ara', inputs: [{ name: 'q', placeholder: 'Kart no, müşteri veya telefon' }],
      buttons: [{ text: 'Vazgeç', role: 'cancel' }, { text: 'Ara', handler: async (v) => {
        const q = String(v?.q || '').trim(); if (!q) return;
        try {
          const r = await kartAra(q);
          const l = (r.kartlar || []).slice(0, 8);
          if (!l.length) { toast({ message: 'Kart bulunamadı', duration: 1500 }); return; }
          alert({ header: 'Kart seç', inputs: l.map((k, i) => ({ type: 'radio' as const, label: `#${k.id} ${k.musteri}`, value: i, checked: i === 0 })),
            buttons: [{ text: 'Vazgeç', role: 'cancel' }, { text: 'Seç', handler: (i) => { const k = l[i]; if (!k) return; setKart({ id: k.id, musteri: k.musteri }); if (!kisi) setKisi(k.musteri); if (!telefon && k.telefon) setTelefon(k.telefon); } }] });
        } catch (e: any) { toast({ message: e.message, duration: 2500, color: 'danger' }); }
      } }],
    });
  }

  async function kaydet() {
    if (!baslik.trim() && !kisi.trim() && !kart) { toast({ message: 'Başlık, kişi veya kart girin.', duration: 2000, color: 'warning' }); return; }
    if (!tarih) { toast({ message: 'Tarih seçin.', duration: 2000, color: 'warning' }); return; }
    setGidiyor(true);
    try {
      await randevuKaydet({ tur, baslik: baslik.trim(), tarih, saat, sure_dk: +sure || 0, yer: yer.trim(), kisi: kisi.trim(), telefon: telefon.trim(), kart_id: kart?.id || 0, katilimcilar: [], notlar, ozel: 0, hatirlat_dk: +hatirlat || 0, musteri_bildir: 0 });
      toast({ message: 'Takvime eklendi', duration: 1500, color: 'success' });
      onKaydedildi();
    } catch (e: any) { toast({ message: e.message, duration: 3000, color: 'danger' }); }
    finally { setGidiyor(false); }
  }

  const turler = Object.entries(veri?.turler || { randevu: 'Randevu', kesif: 'Keşif', toplanti: 'Toplantı', diger: 'Diğer' });
  return (
    <IonModal isOpen={!!taslak} onDidDismiss={onKapat}>
      <IonHeader><IonToolbar>
        <IonButtons slot="start"><IonButton onClick={onKapat}><IonIcon icon={closeOutline} /></IonButton></IonButtons>
        <IonTitle>Yeni randevu</IonTitle>
        <IonButtons slot="end"><IonButton strong disabled={gidiyor} onClick={kaydet}>{gidiyor ? <IonSpinner name="dots" /> : 'Kaydet'}</IonButton></IonButtons>
      </IonToolbar></IonHeader>
      <IonContent>
        <IonList>
          <IonItem><IonSelect label="Tür" value={tur} onIonChange={(e) => setTur(e.detail.value)}>{turler.map(([k, v]) => <IonSelectOption key={k} value={k}>{v}</IonSelectOption>)}</IonSelect></IonItem>
          <IonItem><IonInput label="Başlık" value={baslik} onIonInput={(e) => setBaslik(String(e.detail.value || ''))} /></IonItem>
          <IonItem button detail onClick={kartSec}><IonInput label="Kart" readonly value={kart ? `#${kart.id} ${kart.musteri}` : ''} placeholder="Seçmek için dokunun" /></IonItem>
          <IonItem><IonInput label="Tarih" type="date" value={tarih} onIonInput={(e) => setTarih(String(e.detail.value || ''))} /></IonItem>
          <IonItem><IonInput label="Saat" type="time" value={saat} onIonInput={(e) => setSaat(String(e.detail.value || ''))} /></IonItem>
          <IonItem><IonSelect label="Süre" value={sure} onIonChange={(e) => setSure(e.detail.value)}>{['15', '30', '45', '60', '90', '120', '180', '240'].map((d) => <IonSelectOption key={d} value={d}>{+d < 60 ? d + ' dk' : +d / 60 + ' saat'}</IonSelectOption>)}</IonSelect></IonItem>
          <IonItem><IonInput label="Yer" value={yer} onIonInput={(e) => setYer(String(e.detail.value || ''))} /></IonItem>
          <IonItem><IonInput label="Kişi" value={kisi} onIonInput={(e) => setKisi(String(e.detail.value || ''))} /></IonItem>
          <IonItem><IonInput label="Telefon" type="tel" value={telefon} onIonInput={(e) => setTelefon(String(e.detail.value || ''))} /></IonItem>
          <IonItem><IonSelect label="Hatırlat" value={hatirlat} onIonChange={(e) => setHatirlat(e.detail.value)}>{[['0', 'Hatırlatma yok'], ['15', '15 dk önce'], ['30', '30 dk önce'], ['60', '1 saat önce'], ['1440', '1 gün önce']].map(([k, v]) => <IonSelectOption key={k} value={k}>{v}</IonSelectOption>)}</IonSelect></IonItem>
          <IonItem><IonTextarea label="Not" labelPlacement="stacked" autoGrow rows={3} value={notlar} onIonInput={(e) => setNotlar(String(e.detail.value || ''))} /></IonItem>
        </IonList>
      </IonContent>
    </IonModal>
  );
}

function TerminHesapla({ acik, varsayilan, onKapat }: { acik: boolean; varsayilan: number; onKapat: () => void }) {
  const [gun, setGun] = useState(String(varsayilan));
  const [sonuc, setSonuc] = useState<Awaited<ReturnType<typeof terminHesapla>> | null>(null);
  const [yuk, setYuk] = useState(false);
  const [toast] = useIonToast();
  useEffect(() => { if (acik) { setGun(String(varsayilan)); setSonuc(null); } }, [acik]);
  async function hesapla() {
    setYuk(true);
    try { setSonuc(await terminHesapla(+gun || 0)); } catch (e: any) { toast({ message: e.message, duration: 2500, color: 'danger' }); }
    finally { setYuk(false); }
  }
  const tr = (s: string) => s.split('-').reverse().join('.');
  return (
    <IonModal isOpen={acik} onDidDismiss={onKapat}>
      <IonHeader><IonToolbar>
        <IonButtons slot="start"><IonButton onClick={onKapat}><IonIcon icon={closeOutline} /></IonButton></IonButtons>
        <IonTitle>Termin hesapla</IonTitle>
      </IonToolbar></IonHeader>
      <IonContent className="ion-padding">
        <p className="hy-soluk" style={{ marginTop: 0 }}>Üretim süresinden sonra montaj programında boş yeri olan ilk günleri gösterir.</p>
        <IonItem><IonInput label="Üretim süresi (iş günü)" type="number" value={gun} onIonInput={(e) => setGun(String(e.detail.value || ''))} /></IonItem>
        <IonButton expand="block" onClick={hesapla} disabled={yuk} style={{ marginTop: 10 }}>{yuk ? <IonSpinner name="dots" /> : 'Hesapla'}</IonButton>
        <p className="hy-soluk" style={{ fontSize: 12 }}>Kural: tabela 10 iş günü, dijital baskı 1–5 iş günü, dışarıya bağlı iş 10 iş günü.</p>
        {sonuc && (
          <div>
            <p>Üretim bitişi: <b>{tr(sonuc.hazir)}</b></p>
            {sonuc.secenekler[0] ? <p style={{ fontSize: 17 }}>Verilebilecek en erken termin: <b style={{ color: 'var(--ion-color-primary)' }}>{tr(sonuc.secenekler[0].tarih)}</b></p> : <p>90 gün içinde boş montaj günü yok.</p>}
            {sonuc.secenekler.slice(0, 8).map((s) => <div key={s.tarih} className="hy-mo-satir"><span className="m"><b>{trGun(s.tarih)}</b><small>{s.bos} montaj yeri boş</small></span></div>)}
          </div>
        )}
      </IonContent>
    </IonModal>
  );
}
