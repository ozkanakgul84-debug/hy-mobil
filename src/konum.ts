import { Geolocation } from '@capacitor/geolocation';

/** Olay anı konumu (Yola çıktık / Vardık / Bitti). Alınamazsa sessizce boş döner. */
export async function anlikKonum(): Promise<{ lat?: number; lng?: number }> {
  try {
    const p = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 });
    return { lat: p.coords.latitude, lng: p.coords.longitude };
  } catch {
    return {};
  }
}

export function yolTarifiUrl(adres: string, lat?: number, lng?: number) {
  const hedef = lat && lng ? `${lat},${lng}` : encodeURIComponent(adres);
  return `https://www.google.com/maps/dir/?api=1&destination=${hedef}&travelmode=driving`;
}
