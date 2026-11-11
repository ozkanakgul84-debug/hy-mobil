import { useState } from 'react';
import { IonButton, IonButtons, IonContent, IonHeader, IonInput, IonItem, IonList, IonListHeader, IonModal, IonSelect, IonSelectOption, IonTextarea, IonTitle, IonToolbar, useIonToast } from '@ionic/react';
import { CARI_TIPLERI, MUSTERI_TIPLERI, cariKaydet, type Cari } from '../../api/muhasebe';

const BOS: Partial<Cari> = { tip: 'musteri', unvan: '', musteri_tipi: '', efatura_tipi: '', yetkili: '', telefon: '', whatsapp: '', email: '', vergi_no: '', vergi_dairesi: '', il: '', ilce: '', adres: '', iban: '', notlar: '' };

/** Cari ekleme / düzenleme. Fatura için vergi no, adres, il/ilçe gerekir. */
export default function CariFormu({ acik, cari, varsayilanTip = 'musteri', onKapat, onKaydedildi }: {
  acik: boolean; cari?: Cari | null; varsayilanTip?: string; onKapat: () => void; onKaydedildi: (c: Cari) => void;
}) {
  const [v, setV] = useState<Partial<Cari>>(BOS);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [toast] = useIonToast();
  const d = (k: keyof Cari) => (e: any) => setV((o) => ({ ...o, [k]: e.detail.value ?? '' }));

  const kaydet = async () => {
    if (!String(v.unvan || '').trim()) { toast({ message: 'Ünvan / ad soyad gerekli.', duration: 2200, color: 'warning' }); return; }
    const vn = String(v.vergi_no || '').replace(/\D/g, '');
    if (vn && vn.length !== 10 && vn.length !== 11) { toast({ message: 'Vergi no 10, TC kimlik no 11 hane olmalı.', duration: 2500, color: 'warning' }); return; }
    setKaydediliyor(true);
    try {
      const govde: any = { ...v, vergi_no: vn };
      if (cari?.id) govde.id = cari.id;
      if (cari?.crm_kart_id) govde.crm_kart_id = cari.crm_kart_id;
      const r = await cariKaydet(govde);
      toast({ message: 'Cari kaydedildi', duration: 1600, color: 'success' });
      onKaydedildi({ ...(govde as Cari), id: (r as any)?.id || cari?.id });
    } catch (e: any) { toast({ message: e.message, duration: 3000, color: 'danger' }); }
    finally { setKaydediliyor(false); }
  };

  const alan = (k: keyof Cari, etiket: string, ek: Record<string, any> = {}) => (
    <IonItem><IonInput label={etiket} labelPlacement="stacked" value={String(v[k] ?? '')} onIonInput={d(k)} {...ek} /></IonItem>
  );

  return (
    <IonModal isOpen={acik} onWillPresent={() => setV(cari ? { ...BOS, ...cari } : { ...BOS, tip: varsayilanTip })} onDidDismiss={onKapat}>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonButton onClick={onKapat}>Vazgeç</IonButton></IonButtons>
          <IonTitle>{cari ? 'Cari düzenle' : 'Yeni cari'}</IonTitle>
          <IonButtons slot="end"><IonButton strong onClick={kaydet} disabled={kaydediliyor}>Kaydet</IonButton></IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList inset>
          {alan('unvan', 'Ünvan / ad soyad *', { autocapitalize: 'words' })}
          <IonItem>
            <IonSelect label="Tür" labelPlacement="stacked" value={v.tip} onIonChange={d('tip')} interface="action-sheet">
              {Object.entries(CARI_TIPLERI).map(([k, ad]) => <IonSelectOption key={k} value={k}>{ad}</IonSelectOption>)}
            </IonSelect>
          </IonItem>
          {v.tip === 'musteri' && (
            <>
              <IonItem>
                <IonSelect label="Müşteri tipi" labelPlacement="stacked" value={v.musteri_tipi || ''} onIonChange={d('musteri_tipi')} interface="action-sheet">
                  <IonSelectOption value="">—</IonSelectOption>
                  {Object.entries(MUSTERI_TIPLERI).map(([k, ad]) => <IonSelectOption key={k} value={k}>{ad}</IonSelectOption>)}
                </IonSelect>
              </IonItem>
              <IonItem>
                <IonSelect label="Fatura türü" labelPlacement="stacked" value={v.efatura_tipi || ''} onIonChange={d('efatura_tipi')} interface="action-sheet">
                  <IonSelectOption value="">Bilinmiyor</IonSelectOption>
                  <IonSelectOption value="earsiv">e-Arşiv (çoğu müşteri)</IonSelectOption>
                  <IonSelectOption value="efatura">e-Fatura mükellefi</IonSelectOption>
                </IonSelect>
              </IonItem>
            </>
          )}
        </IonList>
        <IonList inset>
          <IonListHeader>İletişim</IonListHeader>
          {alan('yetkili', 'Yetkili kişi')}
          {alan('telefon', 'Telefon', { type: 'tel', inputmode: 'tel' })}
          {alan('whatsapp', 'WhatsApp', { type: 'tel', inputmode: 'tel' })}
          {alan('email', 'E-posta', { type: 'email', inputmode: 'email' })}
        </IonList>
        <IonList inset>
          <IonListHeader>Fatura bilgileri</IonListHeader>
          {alan('vergi_no', 'Vergi / TC kimlik no', { inputmode: 'numeric', maxlength: 11 })}
          {alan('vergi_dairesi', 'Vergi dairesi')}
          {alan('il', 'İl')}
          {alan('ilce', 'İlçe')}
          <IonItem><IonTextarea label="Adres" labelPlacement="stacked" autoGrow rows={2} value={String(v.adres ?? '')} onIonInput={d('adres')} /></IonItem>
          {alan('iban', 'IBAN')}
          <IonItem><IonTextarea label="Notlar" labelPlacement="stacked" autoGrow rows={2} value={String(v.notlar ?? '')} onIonInput={d('notlar')} /></IonItem>
        </IonList>
        <div style={{ height: 24 }} />
      </IonContent>
    </IonModal>
  );
}
