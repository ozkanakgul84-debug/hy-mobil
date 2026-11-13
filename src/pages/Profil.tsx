import { IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList, IonNote, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { cikisYap, SUNUCU } from '../api/client';
import type { Oturum } from '../api/types';

export default function Profil({ oturum, onCikis }: { oturum: Oturum; onCikis: () => void }) {
  return (
    <IonPage>
      <IonHeader><IonToolbar><IonButtons slot="start"><IonBackButton defaultHref="/ozet" text="" /></IonButtons><IonTitle>Profil</IonTitle></IonToolbar></IonHeader>
      <IonContent>
        <div style={{ padding: '24px 16px 8px' }}>
          <div style={{ width: 64, height: 64, borderRadius: 32, background: 'var(--ion-color-secondary)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 26, fontWeight: 800 }}>
            {(oturum.kullaniciAdi || '?').slice(0, 1).toUpperCase()}
          </div>
          <h2 style={{ margin: '12px 0 2px', fontWeight: 800 }}>{oturum.kullaniciAdi}</h2>
          <div className="hy-soluk">{oturum.unvan || oturum.rol}</div>
        </div>
        <IonList inset>
          <IonItem><IonLabel>Firma</IonLabel><IonNote slot="end">{oturum.sirketAdi}</IonNote></IonItem>
          <IonItem><IonLabel>Firma kodu</IonLabel><IonNote slot="end">{oturum.sirketKodu}</IonNote></IonItem>
          <IonItem button detail href={SUNUCU + '/erp-paneli/'} target="_blank"><IonLabel>Tam paneli tarayıcıda aç</IonLabel></IonItem>
        </IonList>
        <div style={{ padding: 16 }}>
          <IonButton expand="block" color="danger" fill="outline" onClick={async () => { await cikisYap(); onCikis(); }}>Çıkış yap</IonButton>
          <p className="hy-soluk" style={{ textAlign: 'center' }}>Hesapla Yönet · sürüm 0.6.0</p>
        </div>
      </IonContent>
    </IonPage>
  );
}
