import { useCallback, useEffect, useMemo, useState } from 'react';
import { IonButton, IonButtons, useIonActionSheet, useIonToast, IonContent, IonFab, IonFabButton, IonHeader, IonPage, IonRefresher, IonRefresherContent, IonSegment, IonSegmentButton, IonLabel, IonTitle, IonToolbar, IonSpinner, IonIcon, useIonViewWillEnter, useIonRouter } from '@ionic/react';
import { callOutline, albumsOutline, addOutline, listOutline, swapHorizontalOutline, gridOutline, searchOutline, chatbubbleEllipsesOutline, mailOutline } from 'ionicons/icons';
import KartAra from './KartAra';
import { aktifOturum } from '../api/client';
import KartFormu from './KartFormu';
import { kartGuncelle, kartlariGetir, yenilikler } from '../api/hy';
import { sutun, sutunlar } from '../api/sutun';
import type { Kart } from '../api/types';

export default function Kartlar() {
  const [kartlar, setKartlar] = useState<Kart[] | null>(null);
  const [hata, setHata] = useState('');
  const [araAcik, setAraAcik] = useState(false);
  const [yeniler, setYeniler] = useState<Record<string, string[]>>({});
  const [parla, setParla] = useState<number | null>(null);
  const telGor = aktifOturum()?.kartGorusYetkileri?.iletisimGorebilir !== false;
  const [filtre, setFiltre] = useState('hepsi');
  const router = useIonRouter();
  const [yeni, setYeni] = useState(false);
  const yeniAcabilir = aktifOturum()?.crmIslemYetkileri?.yeniKartAcabilir !== false;
  const aramaVar = aktifOturum()?.kartGorusYetkileri?.iletisimGorebilir !== false && aktifOturum()?.kartGorusYetkileri?.aramaYapabilir !== false;
  /** Kartı açmadan müşteriyi ara (telefonun arama ekranı açılır). */
  const AraDugme = ({ k }: { k: Kart }) => (aramaVar && k.telefon ? (
    <a className="hy-ara-dugme" href={`tel:${k.telefon.replace(/[^\d+]/g, '')}`} onClick={(e) => e.stopPropagation()} aria-label={'Ara: ' + k.musteri}>
      <IonIcon icon={callOutline} />Ara
    </a>
  ) : null);
  const [pano, setPano] = useState(() => { try { return localStorage.getItem('hy_kart_gorunum') === 'pano'; } catch { return false; } });
  const [menu] = useIonActionSheet();
  const [toast] = useIonToast();
  const gorunum = (p: boolean) => { setPano(p); try { localStorage.setItem('hy_kart_gorunum', p ? 'pano' : 'liste'); } catch { /* yoksay */ } };

  /** Panoda kartı başka sütuna taşı (web panelindeki sürükle-bırak yerine). */
  const tasi = (k: Kart) => menu({
    header: '#' + k.id + ' ' + k.musteri,
    subHeader: 'Hangi sütuna taşınsın?',
    buttons: [...sutunlar().filter((x) => !x.arsiv).map((x) => ({ text: (x.id === k.durum ? '● ' : '') + x.ad, handler: () => {
      if (x.id === k.durum) return;
      setKartlar((l) => l && l.map((y) => (y.id === k.id ? { ...y, durum: x.id } : y)));
      kartGuncelle(k.id, { durum: x.id }).then(() => toast({ message: 'Taşındı: ' + x.ad, duration: 1200 }))
        .catch((e) => { toast({ message: e.message, duration: 2500, color: 'danger' }); yukle(); });
    } })), { text: 'Vazgeç', role: 'cancel' }],
  });

  const yukle = useCallback(async () => {
    yenilikler().then(setYeniler).catch(() => {});
    try { setKartlar(await kartlariGetir()); setHata(''); } catch (e: any) { setHata(e.message); }
  }, []);
  useEffect(() => { yukle(); }, [yukle]);
  useIonViewWillEnter(() => { if (kartlar) yukle(); });

  /* Okunmamış WhatsApp / e-posta gelen kart kendi sütununun en üstüne çıkar ("yeni işlem"/log sayılmaz). */
  const yeniMi = (id: number) => (yeniler[id] || []).some((x) => x === 'wa' || x === 'ep');
  const liste = useMemo(() => {
    const l = (kartlar || []).filter((k) => filtre === 'hepsi' || k.durum === filtre);
    return [...l.filter((k) => yeniMi(k.id)), ...l.filter((k) => !yeniMi(k.id))];
  }, [kartlar, filtre, yeniler]); // eslint-disable-line
  const yeniKartlar = (kartlar || []).filter((k) => yeniMi(k.id));
  const yeniAc = (k: Kart) => router.push(`/kartlar/${k.id}/${(yeniler[k.id] || []).includes('wa') ? 'whatsapp' : 'eposta'}`);
  const yeniSayi = (sid: string) => yeniKartlar.filter((k) => k.durum === sid).length;
  /** "🔔 n yeni" rozetine dokununca o sütundaki ilk yeni karta kayar, kart yanıp söner. */
  const yeniyeGit = (sid: string) => {
    const k = yeniKartlar.find((x) => x.durum === sid); if (!k) return;
    if (!pano) setFiltre(sid);
    setParla(k.id);
    setTimeout(() => document.getElementById('kart-' + k.id)?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' }), 150);
    setTimeout(() => setParla(null), 2600);
  };

  const sayac = (id: string) => (kartlar || []).filter((k) => k.durum === id).length;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Kartlar</IonTitle>
          <IonButtons slot="end"><IonButton onClick={() => gorunum(!pano)} aria-label={pano ? 'Liste görünümü' : 'Sütun panosu'}><IonIcon slot="icon-only" icon={pano ? listOutline : gridOutline} /></IonButton></IonButtons>
        </IonToolbar>
        <IonToolbar>
          <button className="hy-kartara-dugme" onClick={() => setAraAcik(true)}><IonIcon icon={searchOutline} /> Kart Ara <small>kart no, müşteri, telefon, iş detayı, log</small></button>
        </IonToolbar>
        {!!yeniKartlar.length && (
          <div className="hy-yeni-serit">
            <span className="bas">🔔 Yeni mesajlar</span>
            {yeniKartlar.map((k) => (
              <button key={k.id} onClick={() => yeniAc(k)}>
                <IonIcon icon={(yeniler[k.id] || []).includes('wa') ? chatbubbleEllipsesOutline : mailOutline} />
                {telGor ? `#${k.id} ${k.musteri}` : `Müşteri #${k.id}`}
              </button>
            ))}
          </div>
        )}
        {!pano && <IonToolbar>
          <IonSegment scrollable value={filtre} onIonChange={(e) => setFiltre(String(e.detail.value))}>
            <IonSegmentButton value="hepsi"><IonLabel>Hepsi</IonLabel></IonSegmentButton>
            {sutunlar().filter((s) => !s.arsiv).map((s) => (
              <IonSegmentButton key={s.id} value={s.id} onClick={() => { if (yeniSayi(s.id)) yeniyeGit(s.id); }}><IonLabel>{s.ad} ({sayac(s.id)}){yeniSayi(s.id) ? ` 🔔${yeniSayi(s.id)}` : ''}</IonLabel></IonSegmentButton>
            ))}
          </IonSegment>
        </IonToolbar>}
      </IonHeader>
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={async (e) => { await yukle(); e.detail.complete(); }}><IonRefresherContent /></IonRefresher>
        {!kartlar && !hata && <div className="hy-bos"><IonSpinner /></div>}
        {hata && <div className="hy-bos">{hata}</div>}
        {kartlar && liste.length === 0 && <div className="hy-bos"><IonIcon icon={albumsOutline} /><p>Kart bulunamadı.</p></div>}
        {pano && kartlar && (
          <div className="hy-pano">
            {sutunlar().filter((x) => !x.arsiv).map((sx) => {
              const ks = liste.filter((k) => k.durum === sx.id);
              return (
                <div key={sx.id} className="hy-pano-sutun">
                  <div className="bas" style={{ borderTopColor: sx.renk }}><b>{sx.ad}</b>{yeniSayi(sx.id) > 0 && <button className="hy-yeni-rozet" onClick={() => yeniyeGit(sx.id)}>🔔 {yeniSayi(sx.id)} yeni</button>}<span>{ks.length}</span></div>
                  {ks.map((k) => (
                    <div key={k.id} id={'kart-' + k.id} className={'hy-pano-kart' + (yeniMi(k.id) ? ' yeni' : '') + (parla === k.id ? ' parla' : '')} onClick={() => router.push(`/kartlar/${k.id}`)}>
                      <div className="hy-satir" style={{ justifyContent: 'space-between' }}>
                        <span className="hy-kartno">#{k.id}</span>
                        <button aria-label="Taşı" onClick={(e) => { e.stopPropagation(); tasi(k); }}><IonIcon icon={swapHorizontalOutline} /></button>
                      </div>
                      <b>{k.musteri || 'İsimsiz müşteri'}</b>
                      <p>{k.tanim}</p>
                      <AraDugme k={k} />
                    </div>
                  ))}
                  {!ks.length && <div className="hy-soluk" style={{ fontSize: 12, padding: 8 }}>Kart yok</div>}
                </div>
              );
            })}
          </div>
        )}
        {!pano && liste.map((k) => {
          const s = sutun(k.durum);
          return (
            <div key={k.id} id={'kart-' + k.id} role="button" tabIndex={0} onClick={() => router.push(`/kartlar/${k.id}`)}>
              <div className={'hy-liste-kart ion-activatable' + (yeniMi(k.id) ? ' yeni' : '') + (parla === k.id ? ' parla' : '')}>
                <div className="hy-satir" style={{ justifyContent: 'space-between' }}>
                  <span className="hy-kartno">#{k.id}</span>
                  <span className="hy-etiket" style={{ background: s.renk + '22', color: s.renk }}>{s.ad}</span>
                </div>
                <div className="hy-satir" style={{ justifyContent: 'space-between', gap: 8 }}>
                  <h3 style={{ flex: 1, minWidth: 0 }}>{k.musteri || 'İsimsiz müşteri'}</h3>
                  <AraDugme k={k} />
                </div>
                <p>{k.tanim}</p>
                {k.teslim_tarihi && <div className="hy-soluk" style={{ marginTop: 6 }}>Teslim: {k.teslim_tarihi.slice(0, 10).split('-').reverse().join('.')}</div>}
              </div>
            </div>
          );
        })}
        <div style={{ height: 88 }} />
        {yeniAcabilir && (
          <IonFab slot="fixed" vertical="bottom" horizontal="end">
            <IonFabButton onClick={() => setYeni(true)} aria-label="Yeni kart"><IonIcon icon={addOutline} /></IonFabButton>
          </IonFab>
        )}
        <KartAra acik={araAcik} onKapat={() => setAraAcik(false)} />
        <KartFormu acik={yeni} onKapat={() => setYeni(false)} onKaydedildi={(id) => { setYeni(false); yukle(); if (id) router.push(`/kartlar/${id}`); }} />
      </IonContent>
    </IonPage>
  );
}
