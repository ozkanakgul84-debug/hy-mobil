import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

/** Telefon kamerasıyla fotoğraf çeker (galeri kapalı: saha kuralı "galeriden görsel alınmaz").
 *  Dönüş: base64 (önek yok) + uzantı. */
export async function fotoCek(): Promise<{ base64: string; uzanti: string; onizleme: string } | null> {
  try {
    const f = await Camera.getPhoto({
      source: CameraSource.Camera,
      resultType: CameraResultType.Base64,
      quality: 75,
      width: 2000,
      correctOrientation: true,
      saveToGallery: false,
    });
    if (!f.base64String) return null;
    const uzanti = (f.format || 'jpeg').replace('jpeg', 'jpg');
    return { base64: f.base64String, uzanti, onizleme: `data:image/${f.format || 'jpeg'};base64,${f.base64String}` };
  } catch (e: any) {
    if (String(e?.message || e).toLowerCase().includes('cancel')) return null;
    throw e;
  }
}
