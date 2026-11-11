import { useState } from 'react';
import { IonContent, IonHeader, IonIcon, IonPage, IonTitle, IonToolbar, useIonAlert, useIonRouter } from '@ionic/react';
import { calculatorOutline, gridOutline, receiptOutline } from 'ionicons/icons';
import { aktifOturum } from '../api/client';
import { paneliAc } from '../panel';

/** Menü: uygulama içi modüller + yerel ekranı henüz olmayanlar için web paneli. */
export default function Moduller({ onYenidenGiris }: { onYenidenGiris: () => void }) {
  const [aciliyor, setAciliyor] = useState(false);
  const [uyari] = useIonAlert();
  const router = useIonRouter();
  const o = aktifOturum();
  const am = o?.aktifModuller || [];
  const var_ = (m: string) => o?.rol === 'YONETICI' || !am.length || am.includes(m);

  async function panel(yol?: string) {
    if (o?.demo) { uyari({ header: 'Demo', message: 'Demo hesabında web paneli açılmaz.', buttons: ['Tamam'] }); return; }
    setAciliyor(true);
    try {
      if ((await paneliAc(yol)) === 'paket_yok') {
        uyari({
          header: 'Bir kez yeniden giriş gerekli',
          message: 'Paneli açabilmek için uygulamaya bir kez çıkış yapıp yeniden girmeniz gerekiyor.',
          buttons: [{ text: 'Vazgeç', role: 'cancel' }, { text: 'Çıkış yap', handler: onYenidenGiris }],
        });
      }
    } catch { uyari({ header: 'Açılamadı', message: 'Panel açılamadı. İnternet bağlantınızı kontrol edin.', buttons: ['Tamam'] }); }
    finally { setAciliyor(false); }
  }

  return (
    <IonPage>
      <IonHeader><IonToolbar><IonTitle>Menü</IonTitle></IonToolbar></IonHeader>
      <IonContent>
        <div className="hy-menu-izgara">
          {var_('muhasebe') && (
            <button className="hy-menu-kutu" onClick={() => router.push('/muhasebe')}>
              <IonIcon icon={receiptOutline} /><b>Muhasebe</b><span>Fatura kes, cari ekle</span>
            </button>
          )}
          {var_('fiyatlandirma') && (
            <button className="hy-menu-kutu" onClick={() => router.push('/fiyat')}>
              <IonIcon icon={calculatorOutline} /><b>Fiyat hesapla</b><span>İşin fiyatını çıkar</span>
            </button>
          )}
          <button className="hy-menu-kutu" onClick={() => panel()} disabled={aciliyor}>
            <IonIcon icon={gridOutline} /><b>{aciliyor ? 'Açılıyor…' : 'Tüm panel'}</b><span>Teklif, üretim, stok, İK ve diğerleri</span>
          </button>
        </div>
        <p className="hy-soluk" style={{ fontSize: 13, padding: '0 16px' }}>
          Tüm panel, uygulamadaki girişinizle açılır; tekrar şifre sorulmaz. Diğer modüller de sırayla uygulama ekranına çevrilecek.
        </p>
      </IonContent>
    </IonPage>
  );
}
