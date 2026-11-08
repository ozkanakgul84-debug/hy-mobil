import { useState } from 'react';
import { IonButton, IonContent, IonInput, IonPage, IonSpinner, IonText } from '@ionic/react';
import { girisYap } from '../api/client';
import type { Oturum } from '../api/types';

export default function Giris({ onGiris }: { onGiris: (o: Oturum) => void }) {
  const [kadi, setKadi] = useState('');
  const [sifre, setSifre] = useState('');
  const [hata, setHata] = useState('');
  const [bekle, setBekle] = useState(false);

  const gonder = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setHata(''); setBekle(true);
    try { onGiris(await girisYap(kadi, sifre)); }
    catch (er: any) { setHata(er.message || 'Giriş yapılamadı.'); }
    finally { setBekle(false); }
  };

  return (
    <IonPage>
      <IonContent className="hy-giris" fullscreen>
        <form className="kutu" onSubmit={gonder}>
          <div className="hy-logo">Hesapla<b>Yönet</b></div>
          <div className="alt">Talepten montaja her iş cebinizde.</div>
          <IonInput placeholder="FİRMAKODU/kullanıcı" value={kadi} autocapitalize="off" autocorrect={false} inputmode="text"
            onIonInput={(e) => setKadi(String(e.detail.value || ''))} aria-label="Kullanıcı adı" />
          <IonInput placeholder="Şifre" type="password" value={sifre} onIonInput={(e) => setSifre(String(e.detail.value || ''))} aria-label="Şifre" />
          {hata && <IonText color="danger"><p style={{ margin: '4px 2px 10px' }}>{hata}</p></IonText>}
          <IonButton expand="block" type="submit" disabled={bekle || !kadi || !sifre} style={{ height: 52, marginTop: 8 }}>
            {bekle ? <IonSpinner name="dots" /> : 'Giriş yap'}
          </IonButton>
          <div className="ipucu">Örnek: TEMPA01/ahmet · Denemek için DEMO/demo</div>
        </form>
      </IonContent>
    </IonPage>
  );
}
