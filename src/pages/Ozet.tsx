import { useEffect, useState } from 'react';
import {
  IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonPage, IonRefresher, IonRefresherContent, IonTitle, IonToolbar,
  useIonRouter, useIonViewWillEnter,
} from '@ionic/react';
import { chatbubbleEllipsesOutline, chevronForwardOutline, mailOutline, personCircleOutline } from 'ionicons/icons';
import { aktifOturum } from '../api/client';
import { SUNUCU } from '../api/client';
import { yeniSurum } from '../surum';
import { anaOzet, kalinParcala, MODULLER, modulAcik, modulOzet, once, type AnaOzet, type ModulOzet } from '../api/ozet';

function selam() {
  const s = new Date().getHours();
  return s < 6 ? 'İyi geceler' : s < 12 ? 'Günaydın' : s < 18 ? 'İyi günler' : 'İyi akşamlar';
}

/** Ana sayfa: CRM özeti + 11 modülün özet satırı (web panelindeki modül ana sayfalarıyla aynı servis). */
export default function Ozet() {
  const o = aktifOturum();
  const router = useIonRouter();
  const [ana, setAna] = useState<AnaOzet | null>(null);
  const [modler, setModler] = useState<Record<string, ModulOzet | 'hata'>>({});
  const gorunen = MODULLER.filter((m) => modulAcik(m, o));

  async function yukle() {
    anaOzet().then(setAna).catch(() => setAna({}));
    // Modül özetleri aynı anda en fazla üç istekle: sunucuyu bir anda 11 istekle yormayalım.
    const sira = gorunen.filter((m) => m.id !== 'crm');
    let i = 0;
    const isci = async () => {
      while (i < sira.length) {
        const m = sira[i++];
        try { const r = await modulOzet(m.id); setModler((x) => ({ ...x, [m.id]: r })); }
        catch { setModler((x) => ({ ...x, [m.id]: 'hata' })); }
      }
    };
    await Promise.all([isci(), isci(), isci()]);
  }
  const [guncel, setGuncel] = useState<string | null>(null);
  useEffect(() => { yukle(); yeniSurum().then(setGuncel); }, []);
  useIonViewWillEnter(() => { if (ana) anaOzet().then(setAna).catch(() => {}); });

  const k = ana?.kartlar;
  const okunmamis = (ana?.okunmamis?.wa || 0) + (ana?.okunmamis?.ep || 0);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Özet</IonTitle>
          <IonButtons slot="end"><IonButton onClick={() => router.push('/profil')}><IonIcon slot="icon-only" icon={personCircleOutline} /></IonButton></IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={async (e) => { await yukle(); e.detail.complete(); }}><IonRefresherContent /></IonRefresher>

        <div className="hy-mo-hero">
          <h2>{selam()} {o?.kullaniciAdi}</h2>
          <small className="hy-soluk">{new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}{o?.sirketAdi ? ' · ' + o.sirketAdi : ''}</small>
        </div>

        {guncel && (
          <a className="hy-guncelle" href={SUNUCU + '/uygulama/hesapla-yonet.apk'} target="_blank" rel="noreferrer">
            <b>Yeni sürüm var: {guncel}</b><span>Dokunun, indirip üzerine kurun (silmenize gerek yok).</span>
          </a>
        )}

        {ana?.crm !== false && k && (
          <div className="hy-mo-kpis">
            <button className="hy-mo-kpi" style={{ borderTopColor: '#3b82f6' }} onClick={() => router.push('/kartlar')}><small>Açık kart</small><b>{k.acik}</b><span>{k.haftaYeni} bu hafta yeni</span></button>
            <button className="hy-mo-kpi" style={{ borderTopColor: '#ef4444' }} onClick={() => router.push('/kartlar')}><small>Termini geçen</small><b>{ana.termin?.gecenSayi ?? 0}</b><span>{ana.termin?.yaklasan ?? 0} yaklaşan</span></button>
            <button className="hy-mo-kpi" style={{ borderTopColor: '#f59e0b' }} onClick={() => router.push('/modul/teklifhub')}><small>Bekleyen teklif</small><b>{ana.teklif?.sayi ?? 0}</b><span>{ana.teklif?.toplam ? ana.teklif.toplam.toLocaleString('tr-TR') + ' ₺' : 'cevap bekliyor'}</span></button>
            {ana.mesajGorebilir !== false && <button className="hy-mo-kpi" style={{ borderTopColor: '#22c55e' }} onClick={() => router.push('/kartlar')}><small>Okunmamış mesaj</small><b>{okunmamis}</b><span>WhatsApp ve e-posta</span></button>}
          </div>
        )}

        {!!ana?.mesajlar?.length && (
          <section className="hy-mo-panel">
            <h3>Son mesajlar</h3>
            {ana.mesajlar.slice(0, 6).map((m, i) => (
              <button key={i} className="hy-mo-satir" onClick={() => router.push(m.kanal === 'wa' ? `/kartlar/${m.kid}/whatsapp` : `/kartlar/${m.kid}`)}>
                <span className="av" style={{ background: m.kanal === 'wa' ? '#16a34a' : '#2563eb' }}><IonIcon icon={m.kanal === 'wa' ? chatbubbleEllipsesOutline : mailOutline} /></span>
                <span className="m"><b>{m.musteri}</b><small>{m.metin}</small></span>
                <span className="tag t-g">{once(m.zaman)}</span>
              </button>
            ))}
          </section>
        )}

        {!!ana?.bekleyen?.length && (
          <section className="hy-mo-panel">
            <h3>Bekleyen kartlar</h3>
            {ana.bekleyen.map((b) => (
              <button key={b.id} className="hy-mo-satir" onClick={() => router.push(`/kartlar/${b.id}`)}>
                <span className="m"><b>{b.musteri}</b><small>{b.sutun}</small></span>
                <span className="tag t-a">{b.gun} gün</span>
              </button>
            ))}
          </section>
        )}

        <section className="hy-mo-panel">
          <h3>Modüller</h3>
          {gorunen.map((m) => {
            const r = modler[m.id];
            const metin = m.id === 'crm'
              ? (k ? `<b>${k.acik} açık kart</b>, bu hafta <b>${k.haftaYeni}</b> yeni kart açıldı.` : '')
              : r && r !== 'hata' ? (r.veri.ozet || (r.veri.yetkisiz ? 'Özet için yetkiniz yok.' : r.veri.yok || '')) : r === 'hata' ? 'Özet yüklenemedi.' : '…';
            return (
              <button key={m.id} className="hy-mo-modul" onClick={() => router.push(m.id === 'crm' ? '/kartlar' : `/modul/${m.id}`)}>
                <IonIcon className="ik" icon={m.ikon} />
                <span className="m"><b>{m.ad}{r && r !== 'hata' && r.katalog.yakinda ? <em> yakında</em> : null}</b>
                  <small>{kalinParcala(metin).map((p, i) => (p.k ? <strong key={i}>{p.t}</strong> : <span key={i}>{p.t}</span>))}</small></span>
                <IonIcon className="ok" icon={chevronForwardOutline} />
              </button>
            );
          })}
        </section>
      </IonContent>
    </IonPage>
  );
}
