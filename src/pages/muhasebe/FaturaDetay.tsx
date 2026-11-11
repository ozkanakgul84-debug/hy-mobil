import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonPage, IonSpinner, IonTitle, IonToolbar, useIonAlert, useIonToast } from '@ionic/react';
import { BELGE_DURUM, BELGE_TIPLERI, ODEME_DURUM, belgeGetir, belgeKes, para, sayi, tarihTR, type Belge } from '../../api/muhasebe';
import { paneliAc } from '../../panel';
import FaturaFormu from './FaturaFormu';

export default function FaturaDetay() {
  const { id } = useParams();
  const [b, setB] = useState<Belge | null>(null);
  const [hata, setHata] = useState('');
  const [duzenle, setDuzenle] = useState(false);
  const [alert] = useIonAlert();
  const [toast] = useIonToast();

  const yukle = useCallback(async () => {
    try { setB(await belgeGetir(Number(id))); } catch (e: any) { setHata(e.message); }
  }, [id]);
  useEffect(() => { yukle(); }, [yukle]);

  const kes = () => alert({
    header: 'Fatura kesilsin mi?',
    message: 'Fatura numara alır ve değiştirilemez, yalnız iptal edilebilir.',
    buttons: [{ text: 'Vazgeç', role: 'cancel' }, {
      text: 'Evet, kes', handler: () => {
        belgeKes(Number(id)).then(() => { toast({ message: 'Fatura kesildi', duration: 1800, color: 'success' }); yukle(); })
          .catch((e) => toast({ message: e.message, duration: 3000, color: 'danger' }));
      },
    }],
  });

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/muhasebe" text="" /></IonButtons>
          <IonTitle>{b ? (b.belge_no || 'Taslak fatura') : 'Fatura'}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {!b && !hata && <div className="hy-bos"><IonSpinner /></div>}
        {hata && <div className="hy-bos">{hata}</div>}
        {b && (
          <>
            <div style={{ padding: '16px 16px 8px' }}>
              <div className="hy-soluk">{BELGE_TIPLERI[b.tip]} faturası · {BELGE_DURUM[b.durum]}{b.durum === 'kesildi' && b.odeme_durumu ? ' · ' + ODEME_DURUM[b.odeme_durumu] : ''}</div>
              <h1 style={{ margin: '6px 0 2px', fontSize: 22, fontWeight: 800 }}>{b.cari_unvan}</h1>
              <div className="hy-soluk">Tarih {tarihTR(b.tarih)}{b.vade ? ' · Vade ' + tarihTR(b.vade) : ''}</div>
            </div>
            {b.fatura_eksik?.length && b.durum !== 'iptal' && b.tip.startsWith('satis') ? (
              <div className="hy-kutu" style={{ background: '#fff3cd', color: '#664d03', marginBottom: 8 }}>Fatura bilgisi eksik: {b.fatura_eksik.join(', ')}. e-Fatura / e-Arşiv için gerekli.</div>
            ) : null}
            <div className="hy-bolum">Kalemler</div>
            <div className="hy-kutu">
              {b.kalemler.map((k, i) => (
                <div key={i} className="hy-satir" style={{ justifyContent: 'space-between', padding: '6px 0', borderBottom: i < b.kalemler.length - 1 ? '1px solid rgba(128,128,128,0.15)' : 0 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{k.aciklama}</div>
                    <div className="hy-soluk">{sayi(k.miktar).toLocaleString('tr-TR')} {k.birim} × {para(sayi(k.birim_fiyat), b.doviz)}{sayi(k.iskonto_oran) ? ` · %${k.iskonto_oran} isk.` : ''} · KDV %{k.kdv_oran}</div>
                  </div>
                  <b>{para(k.tutar ?? sayi(k.miktar) * sayi(k.birim_fiyat), b.doviz)}</b>
                </div>
              ))}
            </div>
            <div className="hy-kutu hy-toplam" style={{ marginTop: 10 }}>
              <div><span>Ara toplam</span><b>{para(b.ara_toplam, b.doviz)}</b></div>
              {b.iskonto_toplam ? <div><span>İskonto</span><b>−{para(b.iskonto_toplam, b.doviz)}</b></div> : null}
              <div><span>KDV</span><b>{para(b.kdv_toplam, b.doviz)}</b></div>
              <div className="genel"><span>Genel toplam</span><b>{para(b.genel_toplam, b.doviz)}</b></div>
              {b.durum === 'kesildi' && <div><span>Ödenen / kalan</span><b>{para(b.odenen || 0)} / {para(b.kalan || 0)}</b></div>}
            </div>
            {b.aciklama && <><div className="hy-bolum">Not</div><div className="hy-kutu" style={{ whiteSpace: 'pre-wrap' }}>{b.aciklama}</div></>}
            <div style={{ padding: 12, display: 'grid', gap: 8 }}>
              {b.durum === 'taslak' && <IonButton expand="block" onClick={kes}>Faturayı kes</IonButton>}
              {b.durum === 'taslak' && <IonButton expand="block" fill="outline" onClick={() => setDuzenle(true)}>Düzenle</IonButton>}
              <IonButton expand="block" fill="clear" onClick={() => paneliAc()}>Yazdır, tahsilat, e-Fatura: panelde aç</IonButton>
            </div>
            <FaturaFormu acik={duzenle} baslangic={{ id: b.id, tip: b.tip, cari_id: b.cari_id, kart_id: b.kart_id, kalemler: b.kalemler, aciklama: b.aciklama, tarih: b.tarih?.slice(0, 10), vade: b.vade?.slice(0, 10) }}
              onKapat={() => setDuzenle(false)} onKaydedildi={() => { setDuzenle(false); yukle(); }} />
          </>
        )}
      </IonContent>
    </IonPage>
  );
}
