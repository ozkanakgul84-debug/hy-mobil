import { useMemo, useState } from 'react';
import { IonButton, IonButtons, IonContent, IonFooter, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonList, IonListHeader, IonModal, IonSearchbar, IonSelect, IonSelectOption, IonTextarea, IonTitle, IonToolbar, useIonAlert, useIonToast } from '@ionic/react';
import { addOutline, chevronForwardOutline, trashOutline } from 'ionicons/icons';
import { BELGE_TIPLERI, belgeKaydet, bugunISO, carilerGetir, kdvOranlari, muOturum, para, sayi, toplamlar, type Cari, type Kalem, type MuOturum } from '../../api/muhasebe';
import CariFormu from './CariFormu';

export type FaturaBaslangic = { id?: number; tip?: string; cari_id?: number; kart_id?: number | null; kart_no?: string; kalemler?: Kalem[]; aciklama?: string; tarih?: string; vade?: string };

const BIRIMLER = ['Adet', 'm²', 'm', 'kg', 'Takım', 'Saat', 'Gün', 'Plaka', 'Paket'];

/** Fatura formu: cari seç, kalem ekle, toplamı gör, taslak kaydet ya da kes. */
export default function FaturaFormu({ acik, baslangic, onKapat, onKaydedildi }: {
  acik: boolean; baslangic?: FaturaBaslangic | null; onKapat: () => void; onKaydedildi: (id: number) => void;
}) {
  const [mo, setMo] = useState<MuOturum | null>(null);
  const [cariler, setCariler] = useState<Cari[]>([]);
  const [tip, setTip] = useState('satis');
  const [cariId, setCariId] = useState<number | undefined>();
  const [tarih, setTarih] = useState(bugunISO());
  const [vade, setVade] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [kalemler, setKalemler] = useState<Kalem[]>([]);
  const [cariSec, setCariSec] = useState(false);
  const [cariAra, setCariAra] = useState('');
  const [yeniCari, setYeniCari] = useState(false);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [toast] = useIonToast();
  const [alert] = useIonAlert();

  const bosKalem = (o: MuOturum | null): Kalem => ({ aciklama: '', miktar: '1', birim: 'Adet', birim_fiyat: '', iskonto_oran: '', kdv_oran: Number(o?.ayarlar.varsayilan_kdv || 20) });

  const hazirla = async () => {
    const b = baslangic || {};
    setTip(b.tip || 'satis'); setCariId(b.cari_id); setTarih(b.tarih || bugunISO()); setVade(b.vade || ''); setAciklama(b.aciklama || '');
    try {
      const [o, c] = await Promise.all([muOturum(), carilerGetir()]);
      setMo(o); setCariler(c.filter((x) => x.aktif !== 0));
      setKalemler(b.kalemler?.length ? b.kalemler.map((k) => ({ ...k, kdv_oran: k.kdv_oran ?? Number(o.ayarlar.varsayilan_kdv || 20) })) : [bosKalem(o)]);
    } catch (e: any) { toast({ message: e.message, duration: 3000, color: 'danger' }); }
  };

  const t = useMemo(() => toplamlar(kalemler), [kalemler]);
  const cari = cariler.find((c) => c.id === cariId);
  const kdvler = mo ? kdvOranlari(mo) : [0, 1, 10, 20];
  const alis = tip.startsWith('alis');

  const kalemDegis = (i: number, k: keyof Kalem, deger: any) => setKalemler((l) => l.map((x, j) => (j === i ? { ...x, [k]: deger } : x)));

  const gonder = async (kes: boolean) => {
    if (!cariId) { toast({ message: 'Cari seçin.', duration: 2000, color: 'warning' }); return; }
    const dolu = kalemler.filter((k) => k.aciklama.trim() || sayi(k.birim_fiyat));
    if (!dolu.length || dolu.some((k) => !k.aciklama.trim())) { toast({ message: 'Her kalemin açıklaması olmalı.', duration: 2200, color: 'warning' }); return; }
    if (kes) {
      const evet = await new Promise<boolean>((coz) => alert({
        header: 'Fatura kesilsin mi?',
        message: `${cari?.unvan} · ${para(t.genel)}. Kesilen fatura numara alır ve değiştirilemez, yalnız iptal edilebilir.`,
        buttons: [{ text: 'Vazgeç', role: 'cancel', handler: () => coz(false) }, { text: 'Evet, kes', handler: () => coz(true) }],
        onDidDismiss: () => coz(false),
      }));
      if (!evet) return;
    }
    setKaydediliyor(true);
    try {
      const r = await belgeKaydet({ id: baslangic?.id, tip, cari_id: cariId, tarih, vade, doviz: 'TL', aciklama, kart_id: baslangic?.kart_id, kalemler: dolu }, kes);
      toast({ message: kes ? 'Fatura kesildi' + (r.belge_no ? ': ' + r.belge_no : '') : 'Taslak kaydedildi', duration: 2200, color: 'success' });
      onKaydedildi(r.id);
    } catch (e: any) { toast({ message: e.message, duration: 3500, color: 'danger' }); }
    finally { setKaydediliyor(false); }
  };

  const filtreli = cariler.filter((c) => {
    const q = cariAra.toLocaleLowerCase('tr');
    return (alis ? c.tip !== 'musteri' : true) && (!q || `${c.unvan} ${c.telefon} ${c.vergi_no}`.toLocaleLowerCase('tr').includes(q));
  });

  return (
    <IonModal isOpen={acik} onWillPresent={hazirla} onDidDismiss={onKapat}>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonButton onClick={onKapat}>Vazgeç</IonButton></IonButtons>
          <IonTitle>{baslangic?.id ? 'Taslağı düzenle' : 'Yeni fatura'}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList inset>
          <IonItem>
            <IonSelect label="Tür" value={tip} onIonChange={(e) => setTip(e.detail.value)} interface="action-sheet">
              {Object.entries(BELGE_TIPLERI).map(([k, ad]) => <IonSelectOption key={k} value={k}>{ad} faturası</IonSelectOption>)}
            </IonSelect>
          </IonItem>
          <IonItem button detail={false} onClick={() => setCariSec(true)}>
            <IonLabel>
              <div className="hy-soluk">Cari *</div>
              <div style={{ fontWeight: 600 }}>{cari?.unvan || 'Seçin'}</div>
              {cari?.fatura_eksik?.length ? <div style={{ color: '#d97706', fontSize: 12 }}>Eksik: {cari.fatura_eksik.join(', ')}</div> : null}
            </IonLabel>
            <IonIcon icon={chevronForwardOutline} slot="end" />
          </IonItem>
          {baslangic?.kart_id && <IonItem lines="none"><IonLabel className="hy-soluk">CRM kartı #{baslangic.kart_no || baslangic.kart_id} ile bağlı</IonLabel></IonItem>}
          <IonItem><IonInput label="Tarih" type="date" value={tarih} onIonInput={(e) => setTarih(String(e.detail.value || ''))} /></IonItem>
          <IonItem><IonInput label="Vade" type="date" value={vade} onIonInput={(e) => setVade(String(e.detail.value || ''))} /></IonItem>
        </IonList>

        <IonListHeader>Kalemler</IonListHeader>
        {kalemler.map((k, i) => (
          <div className="hy-kalem" key={i}>
            <div className="hy-satir">
              <IonInput placeholder="Ürün / hizmet" value={k.aciklama} onIonInput={(e) => kalemDegis(i, 'aciklama', String(e.detail.value || ''))} style={{ flex: 1, fontWeight: 600 }} aria-label="Açıklama" />
              {kalemler.length > 1 && <IonButton fill="clear" color="medium" onClick={() => setKalemler((l) => l.filter((_, j) => j !== i))} aria-label="Sil"><IonIcon icon={trashOutline} /></IonButton>}
            </div>
            <div className="hy-kalem-izgara">
              <IonInput label="Miktar" labelPlacement="stacked" inputmode="decimal" value={String(k.miktar)} onIonInput={(e) => kalemDegis(i, 'miktar', e.detail.value)} />
              <IonSelect label="Birim" labelPlacement="stacked" value={k.birim} onIonChange={(e) => kalemDegis(i, 'birim', e.detail.value)} interface="popover">
                {[...new Set([k.birim, ...BIRIMLER])].map((b) => <IonSelectOption key={b} value={b}>{b}</IonSelectOption>)}
              </IonSelect>
              <IonInput label="Birim fiyat" labelPlacement="stacked" inputmode="decimal" value={String(k.birim_fiyat)} onIonInput={(e) => kalemDegis(i, 'birim_fiyat', e.detail.value)} />
              <IonInput label="İsk. %" labelPlacement="stacked" inputmode="decimal" value={String(k.iskonto_oran || '')} onIonInput={(e) => kalemDegis(i, 'iskonto_oran', e.detail.value)} />
              <IonSelect label="KDV %" labelPlacement="stacked" value={Number(k.kdv_oran)} onIonChange={(e) => kalemDegis(i, 'kdv_oran', e.detail.value)} interface="popover">
                {kdvler.map((o) => <IonSelectOption key={o} value={o}>{o}</IonSelectOption>)}
              </IonSelect>
              <div className="hy-kalem-tutar">{para(sayi(k.miktar) * sayi(k.birim_fiyat) * (1 - Math.min(100, sayi(k.iskonto_oran)) / 100))}</div>
            </div>
          </div>
        ))}
        <div style={{ padding: '0 12px' }}>
          <IonButton fill="outline" expand="block" onClick={() => setKalemler((l) => [...l, bosKalem(mo)])}><IonIcon icon={addOutline} slot="start" />Kalem ekle</IonButton>
        </div>

        <IonList inset>
          <IonItem><IonTextarea label="Açıklama / not" labelPlacement="stacked" autoGrow rows={2} value={aciklama} onIonInput={(e) => setAciklama(String(e.detail.value || ''))} /></IonItem>
        </IonList>

        <div className="hy-kutu hy-toplam">
          <div><span>Ara toplam</span><b>{para(t.ara)}</b></div>
          {t.isk > 0 && <div><span>İskonto</span><b>−{para(t.isk)}</b></div>}
          {Object.entries(t.kdv).filter(([, v]) => v).map(([o, v]) => <div key={o}><span>KDV %{o}</span><b>{para(v)}</b></div>)}
          <div className="genel"><span>Genel toplam</span><b>{para(t.genel)}</b></div>
        </div>
        <div style={{ height: 24 }} />
      </IonContent>
      <IonFooter>
        <IonToolbar>
          <div className="hy-satir" style={{ padding: '6px 10px' }}>
            <IonButton fill="outline" style={{ flex: 1 }} onClick={() => gonder(false)} disabled={kaydediliyor}>Taslak kaydet</IonButton>
            <IonButton style={{ flex: 1 }} onClick={() => gonder(true)} disabled={kaydediliyor}>Kaydet ve kes</IonButton>
          </div>
        </IonToolbar>
      </IonFooter>

      <IonModal isOpen={cariSec} onDidDismiss={() => setCariSec(false)}>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start"><IonButton onClick={() => setCariSec(false)}>Kapat</IonButton></IonButtons>
            <IonTitle>Cari seç</IonTitle>
            <IonButtons slot="end"><IonButton onClick={() => setYeniCari(true)}><IonIcon icon={addOutline} slot="start" />Yeni</IonButton></IonButtons>
          </IonToolbar>
          <IonToolbar><IonSearchbar value={cariAra} onIonInput={(e) => setCariAra(String(e.detail.value || ''))} placeholder="Ünvan, telefon, vergi no" /></IonToolbar>
        </IonHeader>
        <IonContent>
          <IonList>
            {filtreli.map((c) => (
              <IonItem key={c.id} button onClick={() => { setCariId(c.id); setCariSec(false); }}>
                <IonLabel><h3>{c.unvan}</h3><p>{[c.telefon, c.vergi_no].filter(Boolean).join(' · ')}</p></IonLabel>
              </IonItem>
            ))}
            {!filtreli.length && <div className="hy-bos">Cari bulunamadı.</div>}
          </IonList>
        </IonContent>
      </IonModal>
      <CariFormu acik={yeniCari} varsayilanTip={alis ? 'tedarikci' : 'musteri'} onKapat={() => setYeniCari(false)}
        onKaydedildi={async (c) => { setYeniCari(false); setCariler((await carilerGetir()).filter((x) => x.aktif !== 0)); if (c.id) { setCariId(c.id); setCariSec(false); } }} />
    </IonModal>
  );
}
