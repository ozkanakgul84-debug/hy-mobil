import { sesleYaz } from '../sesYazi';
import { micOutline } from 'ionicons/icons';
import { useState } from 'react';
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonInput, IonItem, IonList, IonModal, IonSelect, IonSelectOption, IonTextarea, IonTitle, IonToolbar, useIonToast } from '@ionic/react';
import { kartAc, kartGuncelle, kisiGuncelle } from '../api/hy';
import type { Kart } from '../api/types';

const KAYNAKLAR: [string, string][] = [['PERSONEL', 'Elle – Personel'], ['TELEFON', 'Telefon'], ['WHATSAPP', 'WhatsApp'], ['WEB', 'Web sitesi']];

/** Kart açma / düzenleme formu (alt sayfa). kart verilirse düzenler, verilmezse yeni kart açar. */
export default function KartFormu({ acik, kart, onKapat, onKaydedildi }: {
  acik: boolean; kart?: Kart | null; onKapat: () => void; onKaydedildi: (id?: number) => void;
}) {
  const [musteri, setMusteri] = useState(kart?.musteri || '');
  const [telefon, setTelefon] = useState(kart?.telefon || '');
  const [email, setEmail] = useState(kart?.email || '');
  const [tanim, setTanim] = useState(kart?.tanim || '');
  const [kaynak, setKaynak] = useState('PERSONEL');
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [toast] = useIonToast();

  const sifirla = () => {
    setMusteri(kart?.musteri || ''); setTelefon(kart?.telefon || ''); setEmail(kart?.email || '');
    setTanim(kart?.tanim || ''); setKaynak('PERSONEL');
  };

  const kaydet = async () => {
    const uyar = (m: string) => toast({ message: m, duration: 2500, color: 'warning' });
    const tel = telefon.replace(/\D/g, '');
    if (!musteri.trim()) return uyar('Müşteri / firma adı gerekli.');
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return uyar('E-posta adresi geçersiz.');
    if (kart) {
      if (!tel && !email.trim()) return uyar('Telefon veya e-postadan biri gerekli.');
      if (tel && tel.length < 10) return uyar('Telefon numarası eksik (en az 10 hane).');
    } else if (!/^05[0-9]{9}$/.test(tel)) return uyar('Telefonu 05XXXXXXXXX biçiminde yazın.');
    setKaydediliyor(true);
    try {
      if (kart) {
        if (musteri.trim() !== (kart.musteri || '') || telefon.trim() !== (kart.telefon || '') || email.trim() !== (kart.email || '')) {
          await kisiGuncelle(kart.id, { musteri: musteri.trim(), telefon: telefon.trim(), email: email.trim() });
        }
        if (tanim !== (kart.tanim || '')) await kartGuncelle(kart.id, { tanim });
        onKaydedildi(kart.id);
      } else {
        onKaydedildi(await kartAc({ musteri: musteri.trim(), telefon: tel, email: email.trim(), kaynak, tanim }));
      }
      toast({ message: kart ? 'Kart güncellendi' : 'Kart açıldı', duration: 1800, color: 'success' });
    } catch (e: any) {
      toast({ message: e.message, duration: 3000, color: 'danger' });
    } finally { setKaydediliyor(false); }
  };

  return (
    <IonModal isOpen={acik} onWillPresent={sifirla} onDidDismiss={onKapat}>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonButton onClick={onKapat}>Vazgeç</IonButton></IonButtons>
          <IonTitle>{kart ? `#${kart.id} düzenle` : 'Yeni müşteri kartı'}</IonTitle>
          <IonButtons slot="end"><IonButton strong onClick={kaydet} disabled={kaydediliyor}>Kaydet</IonButton></IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList inset>
          <IonItem><IonInput label="Müşteri / firma" labelPlacement="stacked" value={musteri} onIonInput={(e) => setMusteri(String(e.detail.value || ''))} autocapitalize="words" /></IonItem>
          <IonItem><IonInput label="Telefon" labelPlacement="stacked" type="tel" inputmode="tel" value={telefon} onIonInput={(e) => setTelefon(String(e.detail.value || ''))} /></IonItem>
          <IonItem><IonInput label="E-posta" labelPlacement="stacked" type="email" inputmode="email" value={email} onIonInput={(e) => setEmail(String(e.detail.value || ''))} /></IonItem>
          {!kart && (
            <IonItem>
              <IonSelect label="Kaynak" labelPlacement="stacked" value={kaynak} onIonChange={(e) => setKaynak(e.detail.value)} interface="action-sheet">
                {KAYNAKLAR.map(([d, ad]) => <IonSelectOption key={d} value={d}>{ad}</IonSelectOption>)}
              </IonSelect>
            </IonItem>
          )}
          <IonItem>
            <IonTextarea label="İş tanımı (sipariş detayları)" labelPlacement="stacked" autoGrow rows={4} value={tanim} onIonInput={(e) => setTanim(String(e.detail.value || ''))} />
            <IonButton slot="end" fill="clear" aria-label="Sesle yaz" onClick={async () => {
              try { const m = await sesleYaz(); if (m) setTanim((t) => (t ? t + ' ' : '') + m); } catch (e: any) { toast({ message: e.message || 'Ses anlaşılamadı', duration: 2500, color: 'danger' }); }
            }}><IonIcon icon={micOutline} /></IonButton>
          </IonItem>
        </IonList>
      </IonContent>
    </IonModal>
  );
}
