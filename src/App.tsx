import { useEffect, useState } from 'react';
import { IonApp, IonIcon, IonLabel, IonRouterOutlet, IonTabBar, IonTabButton, IonTabs, IonBadge, IonSpinner } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Navigate, Route, Routes } from 'react-router-dom';
import { albumsOutline, appsOutline, carOutline, homeOutline, notificationsOutline } from 'ionicons/icons';
import { App as CapApp } from '@capacitor/app';
import { aktifOturum, cikisaAbone, oturumYukle } from './api/client';
import { bildirimler } from './api/hy';
import type { Oturum } from './api/types';
import Giris from './pages/Giris';
import Kartlar from './pages/Kartlar';
import KartDetay from './pages/KartDetay';
import WaYazisma from './pages/WaYazisma';
import Saha from './pages/Saha';
import GorevDetay from './pages/GorevDetay';
import Bildirimler from './pages/Bildirimler';
import Profil from './pages/Profil';
import Moduller from './pages/Moduller';
import Ozet from './pages/Ozet';
import ModulOzet from './pages/ModulOzet';
import Fiyat from './pages/Fiyat';
import Muhasebe from './pages/muhasebe/Muhasebe';
import FaturaDetay from './pages/muhasebe/FaturaDetay';
import { pushBaslat } from './push';

export default function App() {
  const [hazir, setHazir] = useState(false);
  const [oturum, setOturum] = useState<Oturum | null>(null);
  const [okunmamis, setOkunmamis] = useState(0);

  useEffect(() => {
    oturumYukle().then((o) => { setOturum(o); setHazir(true); });
    cikisaAbone(() => setOturum(null));
  }, []);

  // Zil sayacı: uygulama öne gelince ve dakikada bir yenilenir
  useEffect(() => {
    if (!oturum) return;
    const yenile = () => bildirimler().then((b) => setOkunmamis(b.okunmamis)).catch(() => {});
    yenile();
    pushBaslat();
    const t = setInterval(yenile, 60000);
    const h = CapApp.addListener('appStateChange', (s) => { if (s.isActive) yenile(); });
    return () => { clearInterval(t); h.then((x) => x.remove()); };
  }, [oturum]);

  if (!hazir) return <IonApp><div style={{ display: 'grid', placeItems: 'center', height: '100%' }}><IonSpinner /></div></IonApp>;
  if (!oturum) return <IonApp><Giris onGiris={setOturum} /></IonApp>;

  const sahaAcik = !oturum.aktifModuller || oturum.aktifModuller.length === 0 || oturum.aktifModuller.some((m) => /saha/i.test(m));

  return (
    <IonApp>
      <IonReactRouter>
        <IonTabs>
          <IonRouterOutlet>
            <Routes>
              <Route path="/kartlar" element={<Kartlar />} />
              <Route path="/kartlar/:id" element={<KartDetay />} />
              <Route path="/kartlar/:id/whatsapp" element={<WaYazisma />} />
              <Route path="/saha" element={<Saha />} />
              <Route path="/saha/:id" element={<GorevDetay />} />
              <Route path="/bildirimler" element={<Bildirimler onSayac={setOkunmamis} />} />
              <Route path="/fiyat" element={<Fiyat />} />
              <Route path="/muhasebe" element={<Muhasebe />} />
              <Route path="/muhasebe/fatura/:id" element={<FaturaDetay />} />
              <Route path="/ozet" element={<Ozet />} />
              <Route path="/modul/:mod" element={<ModulOzet />} />
              <Route path="/moduller" element={<Moduller />} />
              <Route path="/profil" element={<Profil oturum={aktifOturum()!} onCikis={() => setOturum(null)} />} />
              <Route path="*" element={<Navigate to={sahaAcik && oturum.rol !== 'YONETICI' ? '/saha' : '/ozet'} replace />} />
            </Routes>
          </IonRouterOutlet>
          <IonTabBar slot="bottom">
            <IonTabButton tab="ozet" href="/ozet">
              <IonIcon icon={homeOutline} /><IonLabel>Özet</IonLabel>
            </IonTabButton>
            <IonTabButton tab="kartlar" href="/kartlar">
              <IonIcon icon={albumsOutline} /><IonLabel>Kartlar</IonLabel>
            </IonTabButton>
            {sahaAcik && (
              <IonTabButton tab="saha" href="/saha">
                <IonIcon icon={carOutline} /><IonLabel>Saha</IonLabel>
              </IonTabButton>
            )}
            <IonTabButton tab="bildirimler" href="/bildirimler">
              <IonIcon icon={notificationsOutline} /><IonLabel>Bildirimler</IonLabel>
              {okunmamis > 0 && <IonBadge color="danger">{okunmamis}</IonBadge>}
            </IonTabButton>
            <IonTabButton tab="moduller" href="/moduller">
              <IonIcon icon={appsOutline} /><IonLabel>Menü</IonLabel>
            </IonTabButton>
          </IonTabBar>
        </IonTabs>
      </IonReactRouter>
    </IonApp>
  );
}
