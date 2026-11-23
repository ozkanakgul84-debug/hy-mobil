import { useEffect, useRef, useState } from 'react';
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonModal, IonTextarea, IonTitle, IonToolbar, useIonToast } from '@ionic/react';
import { micOutline } from 'ionicons/icons';
import { kartGuncelle } from '../api/hy';
import { sesleYaz } from '../sesYazi';

/** Sipariş Detayı tam ekran düzenleyici (web paneldeki ⛶ ile aynı): kartın "tanim" alanı, yazdıkça otomatik kayıt, 🎤 sesle yaz. */
export default function SiparisDetay({ acik, kartId, deger, onKapat, onDegisti }: { acik: boolean; kartId: number; deger: string; onKapat: () => void; onDegisti: (t: string) => void }) {
  const [metin, setMetin] = useState(deger);
  const [durum, setDurum] = useState<'' | 'yaziliyor' | 'kaydediliyor' | 'kaydedildi' | 'hata'>('');
  const son = useRef(deger);
  const zaman = useRef<any>(null);
  const [toast] = useIonToast();

  useEffect(() => { if (acik) { setMetin(deger); son.current = deger; setDurum(''); } }, [acik]); // eslint-disable-line

  const kaydet = async (t: string) => {
    if (t === son.current) return;
    setDurum('kaydediliyor');
    try { await kartGuncelle(kartId, { tanim: t }); son.current = t; onDegisti(t); setDurum('kaydedildi'); }
    catch (e: any) { setDurum('hata'); toast({ message: 'Kaydedilemedi: ' + e.message, duration: 3000, color: 'danger' }); }
  };
  const degis = (t: string) => {
    setMetin(t); setDurum('yaziliyor');
    clearTimeout(zaman.current);
    zaman.current = setTimeout(() => kaydet(t), 1200);
  };
  const kapat = async () => { clearTimeout(zaman.current); await kaydet(metin); onKapat(); };
  const sesle = async () => {
    try { const m = await sesleYaz(); if (m) degis((metin ? metin.replace(/\s+$/, '') + ' ' : '') + m); }
    catch (e: any) { toast({ message: e.message || 'Ses anlaşılamadı', duration: 2500, color: 'danger' }); }
  };

  return (
    <IonModal isOpen={acik} onDidDismiss={kapat}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>📋 Sipariş Detayı</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={sesle} aria-label="Sesle yaz"><IonIcon slot="icon-only" icon={micOutline} /></IonButton>
            <IonButton onClick={kapat} strong>Bitti</IonButton>
          </IonButtons>
        </IonToolbar>
        <div className="hy-sd-durum">{{ '': 'Yazdıkça otomatik kaydedilir', yaziliyor: 'Yazılıyor…', kaydediliyor: 'Kaydediliyor…', kaydedildi: '✓ Kaydedildi', hata: '⚠ Kaydedilemedi' }[durum]}</div>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonTextarea className="hy-sd-alan" autoGrow value={metin} placeholder="Sipariş detaylarını yazın: ölçüler, malzeme, adet, montaj…" onIonInput={(e) => degis(String(e.detail.value || ''))} aria-label="Sipariş detayı" />
      </IonContent>
    </IonModal>
  );
}
