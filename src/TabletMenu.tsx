import { IonContent, IonHeader, IonIcon, IonMenu, IonMenuToggle, IonTitle, IonToolbar, useIonRouter } from '@ionic/react';
import { albumsOutline, barChartOutline, calendarOutline, gridOutline, homeOutline, listOutline, notificationsOutline, openOutline, settingsOutline } from 'ionicons/icons';
import { useLocation } from 'react-router-dom';
import { aktifOturum } from './api/client';
import { MODULLER, modulAcik } from './api/ozet';
import { usePanel } from './panelKanca';

/** Tablet (≥ 768 px) için her zaman açık sol menü: web panelindeki gibi tüm modüller ve alt bölümleri tek dokunuşla.
 *  Uygulamada ekranı olan bölüm uygulamada, diğerleri web panelinde (oturumla, şifresiz) açılır. Telefonda görünmez. */
export default function TabletMenu() {
  const router = useIonRouter();
  const panel = usePanel();
  const yer = useLocation().pathname;
  const o = aktifOturum();
  const git = (y: string) => router.push(y, 'root');
  const satir = (anahtar: string, ad: string, ikon: string, tik: () => void, opt: { alt?: boolean; panelde?: boolean; aktif?: boolean; yakinda?: boolean } = {}) => (
    <IonMenuToggle key={anahtar} autoHide={false}>
      <button className={'hy-tm-satir' + (opt.alt ? ' alt' : '') + (opt.aktif ? ' aktif' : '')} disabled={panel.aciliyor && opt.panelde} onClick={tik}>
        <IonIcon icon={ikon} /><span>{ad}{opt.yakinda && <em> yakında</em>}</span>{opt.panelde && <IonIcon className="dis" icon={openOutline} />}
      </button>
    </IonMenuToggle>
  );

  return (
    <IonMenu contentId="ana" menuId="tablet" type="push" className="hy-tm">
      <IonHeader><IonToolbar><IonTitle>Hesapla Yönet</IonTitle></IonToolbar></IonHeader>
      <IonContent>
        <nav className="hy-tm-liste">
          {satir('ozet', 'Özet', homeOutline, () => git('/ozet'), { aktif: yer === '/ozet' })}
          {satir('kartlar', 'CRM kartları', albumsOutline, () => git('/kartlar'), { aktif: yer.startsWith('/kartlar') })}
          {satir('takvim', 'Takvim', calendarOutline, () => git('/takvim'), { aktif: yer === '/takvim' })}
          {satir('bildirim', 'Bildirimler', notificationsOutline, () => git('/bildirimler'), { aktif: yer === '/bildirimler' })}
          <div className="hy-tm-baslik">Modüller</div>
          {MODULLER.filter((m) => modulAcik(m, o) && m.id !== 'crm').map((m) => (
            <div key={m.id}>
              {satir(m.id, m.ad, m.ikon, () => git(m.yol || `/modul/${m.id}`), { aktif: yer === (m.yol || `/modul/${m.id}`) })}
              {(m.alt || []).map((a, i) => satir(m.id + i, a.ad, a.ikon, () => (a.yol ? git(a.yol) : panel.ac(a.hedef)), { alt: true, panelde: !a.yol, yakinda: a.yakinda, aktif: !!a.yol && yer === a.yol }))}
              {!m.alt?.length && m.hedef && !m.yol && satir(m.id + 'p', 'Panelde aç', openOutline, () => panel.ac(m.hedef), { alt: true, panelde: true })}
            </div>
          ))}
          <div className="hy-tm-baslik">Genel işlemler</div>
          {satir('rapor', 'Raporlar', barChartOutline, () => panel.ac(['cagir:HYRapor.ac']), { panelde: true })}
          <div className="hy-tm-baslik">Yönetim</div>
          {o?.rol === 'YONETICI' && satir('islem', 'İşlem Kayıtları', listOutline, () => git('/islem-kaydi'), { aktif: yer === '/islem-kaydi' })}
          {o?.rol === 'YONETICI' && satir('yon', 'Yönetici Paneli', settingsOutline, () => panel.ac(['#btnyonetici']), { panelde: true })}
          {satir('tum', panel.aciliyor ? 'Açılıyor…' : 'Tüm panel', gridOutline, () => panel.ac(), { panelde: true })}
        </nav>
      </IonContent>
    </IonMenu>
  );
}
