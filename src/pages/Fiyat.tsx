import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { IonBackButton, IonButton, IonButtons, IonContent, IonFooter, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonList, IonListHeader, IonModal, IonPage, IonSearchbar, IonSegment, IonSegmentButton, IonSelect, IonSelectOption, IonSpinner, IonTitle, IonToolbar, useIonAlert, useIonToast } from '@ionic/react';
import { addOutline, chevronForwardOutline, trashOutline } from 'ionicons/icons';
import {
  MUSTERI_TIPLERI, fiyatYetki, kabartmaHesapla, kartSepeti, malzemeler as malzemeGetir, sepetiKaydet, tl, urunler as urunGetir, zeminHesapla,
  type FiyatYetki, type KabartmaSatir, type KabartmaSonuc, type Malzeme, type SepetKalem, type Urun, type ZeminParca, type ZeminSonuc,
} from '../api/fiyat';
import { kartGetir, kartlariGetir } from '../api/hy';
import type { Kart } from '../api/types';

const bosKabartma = (): KabartmaSatir => ({ malzeme: '', en: '', boy: '', plaka: '1', kesimTeknik: 'lazer' });
const bosParca = (): ZeminParca => ({ ad: '', en: 0, boy: 0, adet: 1 });

/** Fiyat hesaplama: kabartma harf ve zemin tabela. Fiyatı sunucu hesaplar (web paneliyle aynı uçlar);
 *  sonuç bir CRM kartının fiyatlandırma dosyasına eklenebilir. */
export default function Fiyat() {
  const kartParam = Number(new URLSearchParams(useLocation().search).get('kart')) || 0;
  const [modul, setModul] = useState<'kabartma' | 'zemin'>('kabartma');
  const [tip, setTip] = useState('sonkullanici');
  const [yetki, setYetki] = useState<FiyatYetki>({});
  const [malzListe, setMalzListe] = useState<Malzeme[]>([]);
  const [urunListe, setUrunListe] = useState<Urun[]>([]);
  const [kart, setKart] = useState<Kart | null>(null);

  const [urunKodu, setUrunKodu] = useState('');
  const [kSatirlar, setKSatirlar] = useState<KabartmaSatir[]>([bosKabartma()]);
  const [kSonuc, setKSonuc] = useState<KabartmaSonuc | null>(null);

  const [zMalzeme, setZMalzeme] = useState('');
  const [zDonus, setZDonus] = useState<string>('');
  const [zParcalar, setZParcalar] = useState<ZeminParca[]>([bosParca()]);
  const [zSonuc, setZSonuc] = useState<ZeminSonuc | null>(null);

  const [hesaplaniyor, setHesaplaniyor] = useState(false);
  const [hata, setHata] = useState('');
  const [secici, setSecici] = useState<{ acik: boolean; hedef: number | 'zemin' }>({ acik: false, hedef: 0 });
  const [malzAra, setMalzAra] = useState('');
  const [kartSec, setKartSec] = useState(false);
  const [kartlar, setKartlar] = useState<Kart[]>([]);
  const [kartAra, setKartAra] = useState('');
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [toast] = useIonToast();
  const [alert] = useIonAlert();
  const istekNo = useRef(0);

  useEffect(() => {
    fiyatYetki().then(setYetki).catch(() => {});
    malzemeGetir().then(setMalzListe).catch((e) => setHata(e.message));
    urunGetir().then((u) => { const k = u.filter((x) => /kabartma/i.test(x.modul || '')); setUrunListe(k); if (k[0]) setUrunKodu((v) => v || k[0].urun_kodu); }).catch(() => {});
    if (kartParam) kartGetir(kartParam).then(setKart).catch(() => {});
  }, [kartParam]);

  // Girdi değişince sunucuda yeniden hesapla (gecikmeli)
  useEffect(() => {
    const no = ++istekNo.current;
    const t = setTimeout(async () => {
      try {
        if (modul === 'kabartma') {
          const dolu = kSatirlar.filter((s) => s.malzeme && Number(s.en) > 0 && Number(s.boy) > 0);
          if (!dolu.length) { setKSonuc(null); return; }
          setHesaplaniyor(true);
          const r = await kabartmaHesapla(urunKodu, dolu);
          if (no === istekNo.current) { setKSonuc(r); setHata(''); }
        } else {
          const dolu = zParcalar.filter((p) => p.en > 0 && p.boy > 0);
          if (!zMalzeme || !dolu.length) { setZSonuc(null); return; }
          setHesaplaniyor(true);
          const r = await zeminHesapla({ malzeme: zMalzeme, donus_cm: zDonus === '' ? '' : Number(zDonus), parcalar: dolu });
          if (no === istekNo.current) { setZSonuc(r); setHata(''); }
        }
      } catch (e: any) { if (no === istekNo.current) setHata(e.message); }
      finally { if (no === istekNo.current) setHesaplaniyor(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [modul, urunKodu, kSatirlar, zMalzeme, zDonus, zParcalar]);

  const sonucAnahtar = MUSTERI_TIPLERI.find((x) => x[0] === tip)?.[1] || 'sonKullanici';
  const satis = modul === 'kabartma' ? kSonuc?.toplam.satis : zSonuc?.satis;
  const maliyet = modul === 'kabartma' ? kSonuc?.toplam.maliyet : zSonuc?.maliyet;
  const fiyatEksik = modul === 'kabartma' ? kSonuc?.satirlar.some((s) => s.fiyat_eksik) : zSonuc?.fiyat_eksik;
  const fiyat = satis?.[sonucAnahtar] || 0;

  const malzFiltre = useMemo(() => {
    const q = malzAra.toLocaleLowerCase('tr');
    return malzListe.filter((m) => !q || `${m.urunAdi} ${m.urunKodu} ${m.altBaslik} ${m.kategori}`.toLocaleLowerCase('tr').includes(q)).slice(0, 200);
  }, [malzListe, malzAra]);

  const malzemeSecildi = (ad: string) => {
    if (secici.hedef === 'zemin') setZMalzeme(ad);
    else { const i = secici.hedef; setKSatirlar((l) => l.map((s, j) => (j === i ? { ...s, malzeme: ad } : s))); }
    setSecici({ acik: false, hedef: 0 }); setMalzAra('');
  };

  const kalemOlustur = (): SepetKalem | null => {
    if (!(fiyat > 0)) return null;
    const musteriTipi = tip;
    if (modul === 'kabartma') {
      const dolu = kSatirlar.filter((s) => s.malzeme && Number(s.en) > 0 && Number(s.boy) > 0);
      const urun = urunListe.find((u) => u.urun_kodu === urunKodu);
      return {
        modulId: 'kabartma', modulAdi: 'Kabartma Harf', baslik: urun?.urun_adi || 'Kabartma Ürün',
        ozetBilgi: dolu.map((s) => `${s.malzeme} ${s.en}x${s.boy}cm`).join(' | '), fiyat: Math.round(fiyat * 100) / 100,
        dna: { kategori: urun?.kategori || '', urunAdi: urun?.urun_adi || '', musteriTipi, satirlar: dolu.map((s, i) => ({ ...s, malzemeAdi: s.malzeme, fire: '', sure: '', fiyat: tl(kSonuc?.satirlar[i]?.satis?.[sonucAnahtar]) })) },
      };
    }
    const dolu = zParcalar.filter((p) => p.en > 0 && p.boy > 0);
    return {
      modulId: 'zemin', modulAdi: 'Zemin', baslik: zMalzeme || 'Zemin',
      ozetBilgi: dolu.map((p) => `${p.ad ? p.ad + ' ' : ''}${p.en}×${p.boy}${p.adet > 1 ? ' ×' + p.adet : ''}`).join(' | ') + ` · ${zSonuc?.ozet.plaka_adet || 0} plaka`,
      fiyat: Math.round(fiyat * 100) / 100,
      dna: { malzeme: zMalzeme, plaka_en: '', plaka_boy: '', donus_cm: zDonus === '' ? '' : Number(zDonus), parcalar: dolu, fire_haric: [], iscilik: {}, musteriTipi },
    };
  };

  const kartaEkle = async (hedef: Kart) => {
    const kalem = kalemOlustur();
    if (!kalem) { toast({ message: 'Önce fiyatı hesaplatın.', duration: 2000, color: 'warning' }); return; }
    const grup = await new Promise<string | null>((coz) => alert({
      header: 'Hangi işe/gruba eklensin?', inputs: [{ name: 'g', value: 'Tabela 1', placeholder: 'Örn. Dış cephe' }],
      buttons: [{ text: 'Vazgeç', role: 'cancel', handler: () => coz(null) }, { text: 'Ekle', handler: (v) => coz(String(v?.g || '').trim() || 'Tabela 1') }],
      onDidDismiss: () => coz(null),
    }));
    if (!grup) return;
    setKaydediliyor(true);
    try {
      const mevcut = await kartSepeti(hedef.id);
      const sepet = mevcut.sepet;
      let g = sepet.find((x) => x.ad.toLocaleLowerCase('tr') === grup.toLocaleLowerCase('tr'));
      if (!g) { g = { id: 'grup_' + Date.now(), ad: grup, kalemler: [] }; sepet.push(g); }
      g.kalemler.push(kalem);
      const ad = mevcut.projeAdi || `SP-${hedef.id} ${hedef.musteri || ''} - ${kalem.baslik}`.trim();
      await sepetiKaydet(hedef.id, mevcut.projeId, ad, sepet);
      toast({ message: `#${hedef.id} kartının fiyatlandırmasına eklendi`, duration: 2200, color: 'success' });
    } catch (e: any) { toast({ message: 'Kaydedilemedi: ' + e.message, duration: 3500, color: 'danger' }); }
    finally { setKaydediliyor(false); }
  };

  const kartSeciciAc = async () => {
    setKartSec(true);
    if (!kartlar.length) kartlariGetir().then(setKartlar).catch(() => {});
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref={kartParam ? `/kartlar/${kartParam}` : '/moduller'} text="" /></IonButtons>
          <IonTitle>Fiyat hesapla</IonTitle>
        </IonToolbar>
        <IonToolbar>
          <IonSegment value={modul} onIonChange={(e) => setModul(e.detail.value as any)}>
            <IonSegmentButton value="kabartma"><IonLabel>Kabartma harf</IonLabel></IonSegmentButton>
            <IonSegmentButton value="zemin"><IonLabel>Zemin tabela</IonLabel></IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {kart && <div className="hy-kutu" style={{ marginTop: 12 }}>#{kart.id} {kart.musteri} için hesaplanıyor</div>}
        <IonList inset>
          <IonItem>
            <IonSelect label="Müşteri tipi" value={tip} onIonChange={(e) => setTip(e.detail.value)} interface="popover">
              {MUSTERI_TIPLERI.map(([k, , ad]) => <IonSelectOption key={k} value={k}>{ad}</IonSelectOption>)}
            </IonSelect>
          </IonItem>
          {modul === 'kabartma' && urunListe.length > 0 && (
            <IonItem>
              <IonSelect label="Ürün" value={urunKodu} onIonChange={(e) => setUrunKodu(e.detail.value)} interface="action-sheet">
                {urunListe.map((u) => <IonSelectOption key={u.urun_kodu} value={u.urun_kodu}>{u.urun_adi}</IonSelectOption>)}
              </IonSelect>
            </IonItem>
          )}
          {modul === 'zemin' && (
            <>
              <IonItem button detail={false} onClick={() => setSecici({ acik: true, hedef: 'zemin' })}>
                <IonLabel><div className="hy-soluk">Malzeme (plaka)</div><div style={{ fontWeight: 600 }}>{zMalzeme || 'Seçin'}</div></IonLabel>
                <IonIcon icon={chevronForwardOutline} slot="end" />
              </IonItem>
              <IonItem><IonInput label="Dönüş payı (cm)" inputmode="decimal" placeholder="varsayılan" value={zDonus} onIonInput={(e) => setZDonus(String(e.detail.value || ''))} /></IonItem>
            </>
          )}
        </IonList>

        {modul === 'kabartma' && (
          <>
            <IonListHeader>Parçalar</IonListHeader>
            {kSatirlar.map((s, i) => (
              <div className="hy-kalem" key={i}>
                <div className="hy-satir">
                  <button className="hy-secici" onClick={() => setSecici({ acik: true, hedef: i })}>{s.malzeme || 'Malzeme seçin'} <IonIcon icon={chevronForwardOutline} /></button>
                  {kSatirlar.length > 1 && <IonButton fill="clear" color="medium" onClick={() => setKSatirlar((l) => l.filter((_, j) => j !== i))} aria-label="Sil"><IonIcon icon={trashOutline} /></IonButton>}
                </div>
                <div className="hy-kalem-izgara">
                  <IonInput label="En (cm)" labelPlacement="stacked" inputmode="decimal" value={s.en} onIonInput={(e) => setKSatirlar((l) => l.map((x, j) => (j === i ? { ...x, en: String(e.detail.value || '') } : x)))} />
                  <IonInput label="Boy (cm)" labelPlacement="stacked" inputmode="decimal" value={s.boy} onIonInput={(e) => setKSatirlar((l) => l.map((x, j) => (j === i ? { ...x, boy: String(e.detail.value || '') } : x)))} />
                  <IonInput label="Plaka adet" labelPlacement="stacked" inputmode="numeric" value={s.plaka} onIonInput={(e) => setKSatirlar((l) => l.map((x, j) => (j === i ? { ...x, plaka: String(e.detail.value || '1') } : x)))} />
                  <IonSelect label="Kesim" labelPlacement="stacked" value={s.kesimTeknik} onIonChange={(e) => setKSatirlar((l) => l.map((x, j) => (j === i ? { ...x, kesimTeknik: e.detail.value } : x)))} interface="popover">
                    <IonSelectOption value="lazer">Lazer</IonSelectOption>
                    <IonSelectOption value="cnc">CNC</IonSelectOption>
                  </IonSelect>
                  <div className="hy-kalem-tutar" style={{ gridColumn: 'span 2' }}>{tl(kSonuc?.satirlar[kSatirlar.filter((x, j) => j < i && x.malzeme && Number(x.en) > 0 && Number(x.boy) > 0).length]?.satis?.[sonucAnahtar])}</div>
                </div>
              </div>
            ))}
            <div style={{ padding: '0 12px' }}><IonButton fill="outline" expand="block" onClick={() => setKSatirlar((l) => [...l, bosKabartma()])}><IonIcon icon={addOutline} slot="start" />Parça ekle</IonButton></div>
          </>
        )}

        {modul === 'zemin' && (
          <>
            <IonListHeader>Parçalar</IonListHeader>
            {zParcalar.map((p, i) => (
              <div className="hy-kalem" key={i}>
                <div className="hy-satir">
                  <IonInput placeholder="Parça adı (ör. Tabela alnı)" value={p.ad} onIonInput={(e) => setZParcalar((l) => l.map((x, j) => (j === i ? { ...x, ad: String(e.detail.value || '') } : x)))} style={{ flex: 1, fontWeight: 600 }} aria-label="Parça adı" />
                  {zParcalar.length > 1 && <IonButton fill="clear" color="medium" onClick={() => setZParcalar((l) => l.filter((_, j) => j !== i))} aria-label="Sil"><IonIcon icon={trashOutline} /></IonButton>}
                </div>
                <div className="hy-kalem-izgara">
                  <IonInput label="En (cm)" labelPlacement="stacked" inputmode="decimal" value={p.en || ''} onIonInput={(e) => setZParcalar((l) => l.map((x, j) => (j === i ? { ...x, en: Number(String(e.detail.value || '0').replace(',', '.')) || 0 } : x)))} />
                  <IonInput label="Boy (cm)" labelPlacement="stacked" inputmode="decimal" value={p.boy || ''} onIonInput={(e) => setZParcalar((l) => l.map((x, j) => (j === i ? { ...x, boy: Number(String(e.detail.value || '0').replace(',', '.')) || 0 } : x)))} />
                  <IonInput label="Adet" labelPlacement="stacked" inputmode="numeric" value={p.adet} onIonInput={(e) => setZParcalar((l) => l.map((x, j) => (j === i ? { ...x, adet: parseInt(String(e.detail.value || '1'), 10) || 1 } : x)))} />
                </div>
              </div>
            ))}
            <div style={{ padding: '0 12px' }}><IonButton fill="outline" expand="block" onClick={() => setZParcalar((l) => [...l, bosParca()])}><IonIcon icon={addOutline} slot="start" />Parça ekle</IonButton></div>
            {zSonuc && (
              <div className="hy-kutu" style={{ marginTop: 12 }}>
                <div className="hy-soluk">{zSonuc.ozet.plaka_adet} plaka{zSonuc.plaka ? ` (${zSonuc.plaka.en}×${zSonuc.plaka.boy})` : ''} · net {zSonuc.ozet.net_m2} m² · fire {zSonuc.ozet.fire_m2} m² · müşteriye {zSonuc.ozet.musteriye_m2} m²</div>
                {zSonuc.uyarilar?.map((u, i) => <div key={i} style={{ color: '#d97706', fontSize: 13 }}>{u}</div>)}
              </div>
            )}
          </>
        )}

        {hata && <div className="hy-kutu" style={{ marginTop: 12, color: '#b91c1c' }}>{hata}</div>}
        {satis && (
          <div className="hy-kutu hy-toplam" style={{ marginTop: 12 }}>
            {MUSTERI_TIPLERI.map(([k, s, ad]) => (
              <div key={k} className={k === tip ? 'genel' : ''} style={k === tip ? {} : { opacity: 0.75 }}><span>{ad}</span><b>{tl(satis[s])}</b></div>
            ))}
            {yetki.maliyetGor && maliyet !== undefined && <div style={{ color: '#b91c1c' }}><span>Maliyet</span><b>{tl(maliyet)}</b></div>}
            {fiyatEksik && <div style={{ color: '#d97706', fontSize: 13 }}>Bazı malzemelerin listede fiyatı yok; sonuç eksik olabilir.</div>}
          </div>
        )}
        <div style={{ height: 24 }} />
      </IonContent>
      <IonFooter>
        <IonToolbar>
          <div className="hy-satir" style={{ padding: '6px 12px', justifyContent: 'space-between' }}>
            <div><div className="hy-soluk">{MUSTERI_TIPLERI.find((x) => x[0] === tip)?.[2]} fiyatı</div><div style={{ fontSize: 22, fontWeight: 800 }}>{hesaplaniyor ? <IonSpinner name="dots" /> : tl(fiyat)}</div></div>
            <IonButton disabled={!(fiyat > 0) || kaydediliyor} onClick={() => (kart ? kartaEkle(kart) : kartSeciciAc())}>{kart ? 'Karta ekle' : 'Bir karta ekle'}</IonButton>
          </div>
        </IonToolbar>
      </IonFooter>

      <IonModal isOpen={secici.acik} onDidDismiss={() => setSecici({ acik: false, hedef: 0 })}>
        <IonHeader>
          <IonToolbar><IonButtons slot="start"><IonButton onClick={() => setSecici({ acik: false, hedef: 0 })}>Kapat</IonButton></IonButtons><IonTitle>Malzeme seç</IonTitle></IonToolbar>
          <IonToolbar><IonSearchbar value={malzAra} onIonInput={(e) => setMalzAra(String(e.detail.value || ''))} placeholder="Pleksi, forex, kompozit…" /></IonToolbar>
        </IonHeader>
        <IonContent>
          <IonList>
            {malzFiltre.map((m) => (
              <IonItem key={m.id} button onClick={() => malzemeSecildi(m.urunAdi)}>
                <IonLabel><h3>{m.urunAdi}</h3><p>{[m.altBaslik || m.kategori, m.birim].filter(Boolean).join(' · ')}</p></IonLabel>
              </IonItem>
            ))}
          </IonList>
        </IonContent>
      </IonModal>

      <IonModal isOpen={kartSec} onDidDismiss={() => setKartSec(false)}>
        <IonHeader>
          <IonToolbar><IonButtons slot="start"><IonButton onClick={() => setKartSec(false)}>Kapat</IonButton></IonButtons><IonTitle>Kart seç</IonTitle></IonToolbar>
          <IonToolbar><IonSearchbar value={kartAra} onIonInput={(e) => setKartAra(String(e.detail.value || ''))} placeholder="Müşteri, kart no" /></IonToolbar>
        </IonHeader>
        <IonContent>
          <IonList>
            {kartlar.filter((k) => !kartAra || `${k.id} ${k.musteri}`.toLocaleLowerCase('tr').includes(kartAra.toLocaleLowerCase('tr'))).map((k) => (
              <IonItem key={k.id} button onClick={() => { setKartSec(false); setKart(k); kartaEkle(k); }}>
                <IonLabel><h3>#{k.id} {k.musteri}</h3><p>{k.tanim}</p></IonLabel>
              </IonItem>
            ))}
            {!kartlar.length && <div className="hy-bos"><IonSpinner /></div>}
          </IonList>
        </IonContent>
      </IonModal>
    </IonPage>
  );
}
