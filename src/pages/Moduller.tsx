import { useState } from 'react';
import { IonButton, IonContent, IonHeader, IonIcon, IonPage, IonTitle, IonToolbar, useIonAlert } from '@ionic/react';
import { gridOutline, openOutline } from 'ionicons/icons';
import { aktifOturum } from '../api/client';
import { paneliAc } from '../panel';

/** "Tüm modüller": uygulamada henüz yerel ekranı olmayan her şey için web paneli uygulama içinde açılır. */
export default function Moduller({ onYenidenGiris }: { onYenidenGiris: () => void }) {
  const [aciliyor, setAciliyor] = useState(false);
  const [uyari] = useIonAlert();
  const o = aktifOturum();
  const moduller = (o?.aktifModuller || []).filter(Boolean);

  async function ac() {
    if (o?.demo) {
      uyari({ header: 'Demo', message: 'Demo hesabında web paneli açılmaz. Gerçek hesabınızla giriş yapın.', buttons: ['Tamam'] });
      return;
    }
    setAciliyor(true);
    try {
      const s = await paneliAc();
      if (s === 'paket_yok') {
        uyari({
          header: 'Bir kez yeniden giriş gerekli',
          message: 'Tüm modülleri açabilmek için uygulamaya bir kez çıkış yapıp yeniden girmeniz gerekiyor.',
          buttons: [{ text: 'Vazgeç', role: 'cancel' }, { text: 'Çıkış yap', handler: onYenidenGiris }],
        });
      }
    } catch {
      uyari({ header: 'Açılamadı', message: 'Panel açılamadı. İnternet bağlantınızı kontrol edin.', buttons: ['Tamam'] });
    } finally {
      setAciliyor(false);
    }
  }

  return (
    <IonPage>
      <IonHeader><IonToolbar><IonTitle>Tüm modüller</IonTitle></IonToolbar></IonHeader>
      <IonContent className="ion-padding">
        <div style={{ textAlign: 'center', padding: '24px 8px' }}>
          <IonIcon icon={gridOutline} style={{ fontSize: 56, color: 'var(--ion-color-primary)' }} />
          <h2 style={{ fontWeight: 800, margin: '12px 0 6px' }}>Hesapla Yönet paneli</h2>
          <p className="hy-soluk" style={{ margin: 0 }}>
            Teklif, üretim, muhasebe, satın alma, İK ve diğer bütün modüller. Uygulamadaki girişinizle açılır, tekrar şifre sorulmaz.
          </p>
        </div>
        <IonButton expand="block" size="large" onClick={ac} disabled={aciliyor}>
          <IonIcon slot="start" icon={openOutline} />{aciliyor ? 'Açılıyor…' : 'Paneli aç'}
        </IonButton>
        {moduller.length > 0 && (
          <>
            <h3 style={{ fontWeight: 700, marginTop: 28 }}>Firmanızda açık modüller</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {moduller.map((m) => (
                <button key={m} onClick={ac} style={{ border: '1px solid var(--ion-color-step-200, #ccc)', background: 'transparent', color: 'inherit', borderRadius: 18, padding: '8px 14px', fontSize: 14 }}>{m}</button>
              ))}
            </div>
          </>
        )}
        <p className="hy-soluk" style={{ fontSize: 13, marginTop: 28 }}>
          Kartlar, Saha ve Bildirimler uygulamanın kendi ekranlarıdır. Diğer modüller de sırayla uygulama ekranına çevrilecek.
        </p>
      </IonContent>
    </IonPage>
  );
}
