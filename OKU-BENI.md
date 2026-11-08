# Hesapla Yönet mobil uygulaması

Capacitor 8 + Ionic React + Vite + TypeScript. Ekranlar uygulamanın içinde (web sayfası kabuğu değil),
veri hesaplayonet.com REST API'sinden gelir. Android ve iPhone aynı koddan derlenir.

## Ekranlar (MVP)
- Giriş: `FİRMAKODU/kullanıcı` + şifre → `erp/v1/giris`, token cihazda saklanır (Preferences). `DEMO/demo` = sunucusuz demo.
- Kartlar: liste, arama, sütun filtresi → `hy-erp/v1/crm/kartlar`
- Kart detayı: Ara, WhatsApp, Fotoğraf (keşif/teslim), adres + yol tarifi, kart geçmişi + not ekleme
- Saha: Bugün / Bu hafta / Tümü → `hy-erp/v1/saha/gorevler`; görevde Yola çıkıyoruz → Vardık → İş bitti (anlık konumla), teslim fotoğrafı kuralı
- Bildirimler: zil listesi → `hy-bildirim/v1/ozet`, okundu işaretleme
- Profil: firma bilgisi, çıkış

İstekler `src/api/client.ts` üzerinden `X-HY-Token` başlığıyla gider. Uygulamada `CapacitorHttp` açık olduğundan CORS gerekmez.

## Komutlar
```
npm ci
npm run dev          # tarayıcıda (gerçek sunucu CORS nedeniyle yalnız DEMO/demo ile çalışır)
npm run build && npx cap sync
npx cap open android # Android Studio
npx cap open ios     # Xcode (Mac gerekir)
```
GitHub'a gönderilince `.github/workflows/android-apk.yml` test APK'sını derler (Actions › son çalışma › Artifacts).

## Bekleyenler
- Telefon bildirimi (push): Firebase projesi + `google-services.json`, sonra `VITE_PUSH=1` ile derle.
  Sunucuda `hy-bildirim/v1/cihaz-fcm` ucu ve FCM gönderimi eklenmeli (şu an yalnız Web Push var).
- Kart notunda yazan kişi: crm log_ekle kullanıcı adını WP oturumundan alıyor, uygulamadan gelen notta boş kalabilir → sunucuda token'dan alınmalı.
- Mağaza: Google Play hesabı (25 $ bir kez), Apple Developer (99 $/yıl), imzalama anahtarı.
- Arka plan konum takibi (rota sapma) sonraki sürüm.
