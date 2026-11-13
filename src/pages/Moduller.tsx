import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonPage, IonTitle, IonToolbar, useIonRouter } from '@ionic/react';
import { chevronForwardOutline, gridOutline, openOutline, personCircleOutline } from 'ionicons/icons';
import { aktifOturum } from '../api/client';
import { MODULLER, modulAcik } from '../api/ozet';
import { usePanel } from '../panelKanca';

/** Menü: web panelinin sol menüsüyle aynı sıra. Modüle dokununca özet sayfası açılır;
 *  Muhasebe'nin alt satırları (Perakende Satış, Günlük Harcamalar) panelde olduğu gibi altında durur. */
export default function Moduller() {
  const router = useIonRouter();
  const panel = usePanel();
  const o = aktifOturum();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Menü</IonTitle>
          <IonButtons slot="end"><IonButton onClick={() => router.push('/profil')}><IonIcon slot="icon-only" icon={personCircleOutline} /></IonButton></IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="hy-mo-panel" style={{ paddingTop: 4 }}>
          {MODULLER.filter((m) => modulAcik(m, o)).map((m) => (
            <div key={m.id}>
              <button className="hy-mo-modul" onClick={() => router.push(m.id === 'crm' ? '/kartlar' : `/modul/${m.id}`)}>
                <IonIcon className="ik" icon={m.ikon} />
                <span className="m"><b>{m.ad}</b><small>{m.acik}</small></span>
                <IonIcon className="ok" icon={chevronForwardOutline} />
              </button>
              {m.id === 'muhasebe' && m.alt?.filter((a) => a.hedef).map((a) => (
                <button key={a.ad} className="hy-mo-modul alt" onClick={() => panel.ac(a.hedef)}>
                  <IonIcon className="ik" icon={a.ikon} />
                  <span className="m"><b>{a.ad}</b><small>{a.acik}</small></span>
                  <IonIcon className="ok" icon={openOutline} />
                </button>
              ))}
            </div>
          ))}
          <button className="hy-mo-modul" onClick={() => panel.ac()} disabled={panel.aciliyor}>
            <IonIcon className="ik" icon={gridOutline} />
            <span className="m"><b>{panel.aciliyor ? 'Açılıyor…' : 'Tüm panel'}</b><small>Web panelini uygulama içinde aç</small></span>
            <IonIcon className="ok" icon={openOutline} />
          </button>
        </div>
        <p className="hy-soluk" style={{ fontSize: 13, padding: '0 16px 16px' }}>
          CRM, fiyat hesaplama, muhasebe (fatura, cari) ve saha uygulama ekranındadır. Diğer bölümler panelde, uygulamadaki girişinizle açılır; tekrar şifre sorulmaz.
        </p>
      </IonContent>
    </IonPage>
  );
}
