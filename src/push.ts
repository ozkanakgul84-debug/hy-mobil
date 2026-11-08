import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { aktifOturum } from './api/client';
import { cihazKaydet } from './api/hy';

/** Telefon bildirimi (FCM/APNs).
 *  ÖNEMLİ: Android'de google-services.json olmadan register() uygulamayı çökertir.
 *  Bu yüzden VITE_PUSH=1 ile derlenmedikçe kayıt yapılmaz (Firebase kurulunca açılır). */
let basladi = false;
export async function pushBaslat() {
  if (basladi || !Capacitor.isNativePlatform() || aktifOturum()?.demo) return;
  if (import.meta.env.VITE_PUSH !== '1') return;
  basladi = true;
  const izin = await PushNotifications.requestPermissions();
  if (izin.receive !== 'granted') return;
  await PushNotifications.addListener('registration', (t) => { cihazKaydet(t.value, Capacitor.getPlatform()).catch(() => {}); });
  await PushNotifications.addListener('pushNotificationActionPerformed', (a) => {
    const kart = a.notification.data?.kart_id;
    if (kart) window.location.hash = '';
    if (kart) window.history.pushState({}, '', `/kartlar/${kart}`);
  });
  await PushNotifications.register();
}
