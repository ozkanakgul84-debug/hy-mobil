import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonList, IonModal, IonPage, IonRefresher, IonRefresherContent,
  IonSegment, IonSegmentButton, IonSelect, IonSelectOption, IonSpinner, IonTextarea, IonTitle, IonToolbar, useIonActionSheet, useIonAlert, useIonRouter, useIonToast,
} from '@ionic/react';
import { openOutline, swapHorizontalOutline } from 'ionicons/icons';
import { bolumBul, DIS_DURUM, disIslem, gorur, isIslem, panoBul, panoIsler, panoYapi, yonetir, type IsKarti, type PanoBen, type PanoYapi } from '../api/pano';
import { usePanel } from '../panelKanca';

/** Departman Panoları (web hy-panolar): her departmanın kanbanı, CRM kartına bağlı iş kartları, dış adım onayı. */
export default function Panolar() {
  const [yapi, setYapi] = useState<PanoYapi | null>(null);
  const [ben, setBen] = useState<PanoBen | null>(null);
  const [isler, setIsler] = useState<IsKarti[] | null>(null);
  const [hata, setHata] = useState('');
  const [secili, setSecili] = useState(() => { try { return localStorage.getItem('hy_pano_secili') || ''; } catch { return ''; } });
  const [bolumId, setBolumId] = useState('');
  const [acik, setAcik] = useState<IsKarti | null>(null);
  const [menu] = useIonActionSheet();
  const [toast] = useIonToast();
  const router = useIonRouter();
  const panel = usePanel();

  const yukle = useCallback(async () => {
    try {
      const [y, i] = await Promise.all([yapi ? Promise.resolve(null) : panoYapi(), panoIsler()]);
      if (y) { setYapi(y.yapi); setBen(y.ben); }
      setIsler(i.isler || []); setHata('');
    } catch (e: any) { setHata(e.message); }
  }, [yapi]);
  useEffect(() => { yukle(); }, []); // eslint-disable-line

  const panolar = useMemo(() => (yapi?.panolar || []).filter((p) => p.tur === 'is' && gorur(ben, p)), [yapi, ben]);
  const p = panolar.find((x) => x.id === secili) || panolar[0];
  const bolumler = (p?.bolumler || []).filter((b) => gorur(ben, p!, b));
  const b = bolumler.find((x) => x.id === bolumId) || bolumler[0];
  const sec = (id: string) => { setSecili(id); setBolumId(''); try { localStorage.setItem('hy_pano_secili', id); } catch { /* yok */ } };
  const panoIsleri = (isler || []).filter((i) => p && i.pano === p.id && (!b || i.bolum === b.id));
  const sayi = (pid: string) => (isler || []).filter((i) => i.pano === pid).length;

  const tasi = (is: IsKarti, sutun: string) => {
    const pp = panoBul(yapi, is.pano); const bb = bolumBul(pp, is.bolum); const s = bb?.sutunlar.find((x) => x.id === sutun);
    if (s?.tur === 'disarida' && !(is.dis || []).some((d) => d.durum === 'gonderildi') && is.pano !== yapi?.disPano) {
      toast({ message: 'Dışarıda sütununa, dış adım gönderilince kendiliğinden geçer. Kartı açıp "Dışarı ver" deyin.', duration: 3500, color: 'warning' }); return;
    }
    const eski = is.sutun;
    setIsler((l) => l && l.map((x) => (x.id === is.id ? { ...x, sutun } : x)));
    isIslem(is.id, { islem: 'tasi', sutun }).then((r) => {
      if (r?.acilan) { const np = panoBul(yapi, pp?.bitinceGonder || ''); toast({ message: `Tüm işler bitti: ${np ? np.ad : 'sonraki'} panosuna iş kartı açıldı.`, duration: 3000, color: 'success' }); }
      yukle();
    }).catch((e) => { setIsler((l) => l && l.map((x) => (x.id === is.id ? { ...x, sutun: eski } : x))); toast({ message: e.message, duration: 3000, color: 'danger' }); });
  };
  const tasiMenu = (is: IsKarti) => menu({
    header: (is.kod ? is.kod + ' · ' : '') + is.baslik, subHeader: 'Hangi sütuna?',
    buttons: [...(bolumBul(panoBul(yapi, is.pano), is.bolum)?.sutunlar || []).map((s) => ({ text: (s.id === is.sutun ? '● ' : '') + s.ad, handler: () => { if (s.id !== is.sutun) tasi(is, s.id); } })), { text: 'Vazgeç', role: 'cancel' }],
  });

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/moduller" text="" /></IonButtons>
          <IonTitle>Departman Panoları</IonTitle>
          <IonButtons slot="end"><IonButton onClick={() => panel.ac(['cagir:HYPanolar.ac'])} aria-label="Panelde aç"><IonIcon slot="icon-only" icon={openOutline} /></IonButton></IonButtons>
        </IonToolbar>
        {!!panolar.length && (
          <IonToolbar>
            <IonSegment scrollable value={p?.id} onIonChange={(e) => sec(String(e.detail.value))}>
              {panolar.map((x) => <IonSegmentButton key={x.id} value={x.id}><IonLabel>{x.ikon} {x.ad} ({sayi(x.id)})</IonLabel></IonSegmentButton>)}
            </IonSegment>
          </IonToolbar>
        )}
        {bolumler.length > 1 && (
          <IonToolbar>
            <IonSegment scrollable value={b?.id} onIonChange={(e) => setBolumId(String(e.detail.value))}>
              {bolumler.map((x) => <IonSegmentButton key={x.id} value={x.id}><IonLabel>{x.ad}</IonLabel></IonSegmentButton>)}
            </IonSegment>
          </IonToolbar>
        )}
      </IonHeader>
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={async (e) => { await yukle(); e.detail.complete(); }}><IonRefresherContent /></IonRefresher>
        {!isler && !hata && <div className="hy-bos"><IonSpinner /></div>}
        {hata && <div className="hy-bos">{hata}</div>}
        {isler && !panolar.length && <div className="hy-bos">Görebileceğiniz departman panosu yok.</div>}
        {p && b && (
          <div className="hy-pano">
            {b.sutunlar.map((s) => {
              const ks = panoIsleri.filter((i) => i.sutun === s.id);
              return (
                <div key={s.id} className="hy-pano-sutun">
                  <div className="bas" style={{ borderTopColor: s.tur === 'bitis' ? '#16a34a' : s.tur === 'disarida' ? '#f59e0b' : s.tur === 'giris' ? '#3b82f6' : '#8a94a6' }}><b>{s.ad}</b><span>{ks.length}</span></div>
                  {ks.map((is) => {
                    const dis = (is.dis || []).filter((d) => d.durum !== 'geldi');
                    return (
                      <div key={is.id} className="hy-pano-kart" onClick={() => setAcik(is)}>
                        <div className="hy-satir" style={{ justifyContent: 'space-between' }}>
                          <span className="hy-kartno">{is.kod || '#' + is.id} · TR-{is.kart_id}</span>
                          <button aria-label="Taşı" onClick={(e) => { e.stopPropagation(); tasiMenu(is); }}><IonIcon icon={swapHorizontalOutline} /></button>
                        </div>
                        <b>{is.baslik}</b>
                        <p>{is.musteri}</p>
                        {!!dis.length && <div className="hy-cipler" style={{ marginTop: 4 }}>{dis.map((d) => <span key={d.id} className={'hy-cip' + (d.durum === 'istendi' ? ' turuncu' : '')}>🚚 {d.adim}: {DIS_DURUM[d.durum] || d.durum}</span>)}</div>}
                      </div>
                    );
                  })}
                  {!ks.length && <div className="hy-soluk" style={{ fontSize: 12, padding: 8 }}>İş yok</div>}
                </div>
              );
            })}
          </div>
        )}
        <p className="hy-soluk" style={{ fontSize: 12, padding: '0 16px 24px' }}>İş kartları müşteri kartından verilir (kart › İş emirleri). Karta dokunun: ayrıntı, not, dışarı ver ve onay. ⇄ ile sütun değiştirin.</p>
        <IsDetay is={acik} yapi={yapi} ben={ben} onKapat={() => setAcik(null)} onDegisti={() => { yukle(); }} onKartAc={(id) => { setAcik(null); router.push(`/kartlar/${id}`); }} onTasi={(is, s) => tasi(is, s)} />
      </IonContent>
    </IonPage>
  );
}

/** İş kartı ayrıntısı: başlık/açıklama düzenle, sütun, not, dış adımlar (dışarı ver, onayla, gönderildi, geldi), sil. */
export function IsDetay({ is, yapi, ben, onKapat, onDegisti, onKartAc, onTasi }: {
  is: IsKarti | null; yapi: PanoYapi | null; ben: PanoBen | null; onKapat: () => void; onDegisti: () => void; onKartAc: (kartId: number) => void; onTasi: (is: IsKarti, sutun: string) => void;
}) {
  const [baslik, setBaslik] = useState(''); const [aciklama, setAciklama] = useState(''); const [not, setNot] = useState('');
  const [disAdim, setDisAdim] = useState(''); const [disDiger, setDisDiger] = useState(''); const [disNot, setDisNot] = useState('');
  const [mesgul, setMesgul] = useState(false);
  const [toast] = useIonToast(); const [alert] = useIonAlert();
  useEffect(() => { if (is) { setBaslik(is.baslik || ''); setAciklama(is.aciklama || ''); setNot(''); setDisAdim(''); setDisDiger(''); setDisNot(''); } }, [is?.id]); // eslint-disable-line
  if (!is) return <IonModal isOpen={false} />;
  const p = panoBul(yapi, is.pano); const b = bolumBul(p, is.bolum);
  const yon = !!p && yonetir(ben, p, b);
  const disPanoda = is.pano === yapi?.disPano;
  const yap = async (fn: () => Promise<any>, mesaj: string, kapat = false) => {
    setMesgul(true);
    try { await fn(); toast({ message: mesaj, duration: 1800, color: 'success' }); onDegisti(); if (kapat) onKapat(); }
    catch (e: any) { toast({ message: e.message, duration: 3000, color: 'danger' }); }
    finally { setMesgul(false); }
  };
  const gonderildi = () => alert({
    header: 'Dışarı gönderildi', inputs: [{ name: 'ted', placeholder: 'Tedarikçi' }, { name: 'don', type: 'date', placeholder: 'Dönüş tarihi' }],
    buttons: [{ text: 'Vazgeç', role: 'cancel' }, { text: 'Kaydet', handler: (v) => { if (!String(v?.ted || '').trim()) { toast({ message: 'Tedarikçiyi yazın.', duration: 2000, color: 'warning' }); return false; } yap(() => disIslem(is.id, { islem: 'gonderildi', tedarikci: v.ted.trim(), donus: v.don || '' }), 'Gönderildi olarak işaretlendi.'); return true; } }],
  });

  return (
    <IonModal isOpen={!!is} onDidDismiss={onKapat}>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonButton onClick={onKapat}>Kapat</IonButton></IonButtons>
          <IonTitle>{is.kod || 'İş #' + is.id}</IonTitle>
          <IonButtons slot="end"><IonButton disabled={mesgul} strong onClick={() => yap(() => isIslem(is.id, { islem: 'duzenle', baslik, aciklama }), 'Kaydedildi.')}>Kaydet</IonButton></IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="hy-kutu" style={{ marginTop: 12 }}>
          <div className="hy-soluk" style={{ fontSize: 13 }}>{p?.ikon} {p?.ad}{(p?.bolumler || []).length > 1 && b ? ' › ' + b.ad : ''}</div>
          <button className="hy-cip turuncu" style={{ marginTop: 8 }} onClick={() => onKartAc(is.kart_id)}>TR-{is.kart_id} {is.musteri} ›</button>
        </div>
        <IonList inset>
          <IonItem><IonInput label="Yapılacak iş" labelPlacement="stacked" value={baslik} onIonInput={(e) => setBaslik(String(e.detail.value || ''))} /></IonItem>
          <IonItem><IonTextarea label="Açıklama" labelPlacement="stacked" autoGrow rows={2} value={aciklama} onIonInput={(e) => setAciklama(String(e.detail.value || ''))} /></IonItem>
          <IonItem>
            <IonSelect label="Sütun" labelPlacement="stacked" value={is.sutun} interface="action-sheet" onIonChange={(e) => { if (e.detail.value !== is.sutun) onTasi(is, String(e.detail.value)); }}>
              {(b?.sutunlar || []).map((s) => <IonSelectOption key={s.id} value={s.id}>{s.ad}</IonSelectOption>)}
            </IonSelect>
          </IonItem>
        </IonList>

        {disPanoda ? (
          <div className="hy-kutu">
            <b>🚚 Dış iş (satınalma)</b>
            <div className="hy-satir" style={{ gap: 8, marginTop: 8 }}>
              <IonButton size="small" disabled={mesgul} onClick={gonderildi}>Gönderildi</IonButton>
              <IonButton size="small" fill="outline" disabled={mesgul} onClick={() => yap(() => disIslem(is.id, { islem: 'geldi' }), 'Geldi olarak işaretlendi.')}>Geldi</IonButton>
            </div>
          </div>
        ) : (
          <div className="hy-kutu">
            <b>🚚 Dış adımlar</b>
            {!(is.dis || []).length && <div className="hy-soluk" style={{ fontSize: 13, marginTop: 4 }}>Dışarı verilen adım yok.</div>}
            {(is.dis || []).map((d) => (
              <div key={d.id} className="hy-satir" style={{ justifyContent: 'space-between', gap: 8, marginTop: 8 }}>
                <span style={{ flex: 1 }}><b>{d.adim}</b><br /><small className="hy-soluk">{DIS_DURUM[d.durum] || d.durum}{d.tedarikci ? ' · ' + d.tedarikci : ''}{d.donus ? ' · dönüş ' + d.donus : ''}</small></span>
                {d.durum === 'istendi' && yon && <IonButton size="small" disabled={mesgul} onClick={() => yap(() => disIslem(is.id, { islem: 'iste', dis_id: d.id, adim: d.adim, onayla: 1 }), 'Onaylandı, Satınalma panosuna düştü.')}>Onayla</IonButton>}
                {d.durum === 'planli' && <IonButton size="small" fill="outline" disabled={mesgul} onClick={() => yap(() => disIslem(is.id, yon ? { islem: 'iste', dis_id: d.id, adim: d.adim, onayla: 1 } : { islem: 'iste', dis_id: d.id, adim: d.adim }), yon ? 'Onaylandı, Satınalma panosuna düştü.' : 'Onaya gönderildi.')}>{yon ? 'Onayla' : 'Onaya gönder'}</IonButton>}
                {d.durum === 'gonderildi' && <IonButton size="small" fill="outline" disabled={mesgul} onClick={() => yap(() => disIslem(is.id, { islem: 'geldi', dis_id: d.id }), 'Geldi olarak işaretlendi.')}>Geldi</IonButton>}
              </div>
            ))}
            <div style={{ marginTop: 12, borderTop: '1px solid rgba(127,127,127,.2)', paddingTop: 8 }}>
              <IonSelect label="Dışarı ver" labelPlacement="stacked" value={disAdim} interface="action-sheet" placeholder="Adım seçin" onIonChange={(e) => setDisAdim(String(e.detail.value || ''))}>
                {(b?.disAdimlar || []).map((a) => <IonSelectOption key={a} value={a}>{a}</IonSelectOption>)}
                <IonSelectOption value="__diger">Diğer…</IonSelectOption>
              </IonSelect>
              {disAdim === '__diger' && <IonInput placeholder="Adım adı" value={disDiger} onIonInput={(e) => setDisDiger(String(e.detail.value || ''))} />}
              {disAdim && <IonInput placeholder="Not (isteğe bağlı)" value={disNot} onIonInput={(e) => setDisNot(String(e.detail.value || ''))} />}
              {disAdim && <IonButton size="small" disabled={mesgul} onClick={() => {
                const adim = disAdim === '__diger' ? disDiger.trim() : disAdim;
                if (!adim) { toast({ message: 'Dışarı verilecek adımı yazın.', duration: 2000, color: 'warning' }); return; }
                yap(() => disIslem(is.id, { islem: 'iste', adim, not: disNot, onayla: yon ? 1 : 0 }), yon ? 'Onaylandı, Satınalma panosuna düştü.' : 'Bölüm yöneticisinin onayına gönderildi.');
                setDisAdim(''); setDisDiger(''); setDisNot('');
              }}>{yon ? 'Onayla ve satınalmaya gönder' : 'Onaya gönder'}</IonButton>}
            </div>
          </div>
        )}

        <div className="hy-kutu">
          <b>Notlar ve geçmiş</b>
          <div className="hy-satir" style={{ gap: 6, marginTop: 6 }}>
            <IonInput placeholder="Not ekle" value={not} maxlength={500} onIonInput={(e) => setNot(String(e.detail.value || ''))} style={{ flex: 1 }} />
            <IonButton size="small" disabled={mesgul || !not.trim()} onClick={() => { const v = not.trim(); setNot(''); yap(() => isIslem(is.id, { islem: 'not', not: v }), 'Not eklendi.'); }}>Ekle</IonButton>
          </div>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, margin: '8px 0 0', fontFamily: 'inherit' }}>{(is.log || '').split('\n').reverse().join('\n')}</pre>
        </div>
        {yon && <div style={{ padding: '0 16px 24px' }}><IonButton expand="block" color="danger" fill="outline" disabled={mesgul} onClick={() => alert({
          header: 'İş kartı silinsin mi?', message: 'Kart müşteri kartından da kaldırılır; geçmiş kaydı kalır.',
          buttons: [{ text: 'Vazgeç', role: 'cancel' }, { text: 'Sil', role: 'destructive', handler: () => { yap(() => isIslem(is.id, { islem: 'sil' }), 'Silindi.', true); } }],
        })}>Sil</IonButton></div>}
      </IonContent>
    </IonModal>
  );
}
