import { useState } from 'react';
import { useIonAlert } from '@ionic/react';
import { aktifOturum, cikisYap } from './api/client';
import { paneliAc } from './panel';

/** Web panelinde bir yeri açar; eski oturumda (paket yok) bir kez yeniden giriş ister. */
export function usePanel() {
  const [aciliyor, setAciliyor] = useState(false);
  const [uyari] = useIonAlert();

  async function ac(hedef: string[] = []) {
    if (aktifOturum()?.demo) { uyari({ header: 'Demo', message: 'Demo hesabında web paneli açılmaz.', buttons: ['Tamam'] }); return; }
    setAciliyor(true);
    try {
      if ((await paneliAc(undefined, hedef)) === 'paket_yok') {
        uyari({
          header: 'Bir kez yeniden giriş gerekli',
          message: 'Paneli açabilmek için uygulamaya bir kez çıkış yapıp yeniden girmeniz gerekiyor.',
          buttons: [{ text: 'Vazgeç', role: 'cancel' }, { text: 'Çıkış yap', handler: () => { cikisYap(); } }],
        });
      }
    } catch { uyari({ header: 'Açılamadı', message: 'Panel açılamadı. İnternet bağlantınızı kontrol edin.', buttons: ['Tamam'] }); }
    finally { setTimeout(() => setAciliyor(false), 800); }
  }
  return { ac, aciliyor };
}
