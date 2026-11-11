import { useState } from 'react';
import { IonButton, IonContent, IonInput, IonPage, IonSpinner, IonText } from '@ionic/react';
import { girisYap } from '../api/client';
import type { Oturum } from '../api/types';

export default function Giris({ onGiris }: { onGiris: (o: Oturum) => void }) {
  const [kadi, setKadi] = useState('');
  const [sifre, setSifre] = useState('');
  const [hata, setHata] = useState('');
  const [bekle, setBekle] = useState(false);
  const [kodMesaj, setKodMesaj] = useState('');
  const [kod, setKod] = useState('');

  const gonder = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setHata(''); setBekle(true);
    try {
      const r = await girisYap(kadi, sifre, kod);
      if ('kodGerekli' in r) { setKodMesaj(r.mesaj); setKod(''); }
      else onGiris(r);
    }
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
          {kodMesaj && (
            <>
              <p style={{ color: '#f5c46b', margin: '4px 2px 10px', fontSize: 14 }}>{kodMesaj}</p>
              <IonInput placeholder="6 haneli kod" inputmode="numeric" maxlength={6} value={kod} onIonInput={(e) => setKod(String(e.detail.value || ''))} aria-label="Doğrulama kodu" />
            </>
          )}
          {hata && <IonText color="danger"><p style={{ margin: '4px 2px 10px' }}>{hata}</p></IonText>}
          <IonButton expand="block" type="submit" disabled={bekle || !kadi || !sifre || (!!kodMesaj && kod.replace(/\D/g, '').length !== 6)} style={{ height: 52, marginTop: 8 }}>
            {bekle ? <IonSpinner name="dots" /> : kodMesaj ? 'Kodu doğrula' : 'Giriş yap'}
          </IonButton>
          <div className="ipucu">Örnek: TEMPA01/ahmet · Denemek için DEMO/demo</div>
        </form>
      </IonContent>
    </IonPage>
  );
}
