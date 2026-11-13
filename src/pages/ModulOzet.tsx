import type React from 'react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonPage, IonRefresher, IonRefresherContent,
  IonSpinner, IonTitle, IonToolbar, useIonRouter,
} from '@ionic/react';
import { alertCircleOutline, arrowForwardOutline, checkmarkCircleOutline, chevronForwardOutline, informationCircleOutline, openOutline, timeOutline } from 'ionicons/icons';
import { kalinParcala, modulBul, modulOzet, once, type AltBolum, type ModulOzet as Ozet, type Panel } from '../api/ozet';
import { usePanel } from '../panelKanca';

const RENK = ['#3b82f6', '#22c55e', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#64748b'];

export function OzetMetni({ metin }: { metin?: string }) {
  if (!metin) return null;
  return <p className="hy-mo-ozet">{kalinParcala(metin).map((p, i) => (p.k ? <b key={i}>{p.t}</b> : <span key={i}>{p.t}</span>))}</p>;
}

export function AltKutular({ alt, onAc }: { alt: AltBolum[]; onAc: (a: AltBolum) => void }) {
  return (
    <div className="hy-mo-alt">
      {alt.map((a, i) => (
        <button key={i} className={'hy-mo-altk' + (a.yakinda ? ' yak' : '')} onClick={() => onAc(a)}>
          <IonIcon icon={a.ikon} />
          <span><b>{a.ad}</b>{a.yakinda ? <em>yakında</em> : a.acik ? <small>{a.acik}</small> : null}</span>
          <IonIcon className="ok" icon={a.yol ? chevronForwardOutline : openOutline} />
        </button>
      ))}
    </div>
  );
}

/** Bir modülün özet sayfası: web panelindeki modül ana sayfasının mobil hali (sayaçlar + paneller + alt bölümler). */
export default function ModulOzet() {
  const { mod = '' } = useParams();
  const tanim = modulBul(mod);
  const router = useIonRouter();
  const panel = usePanel();
  const [veri, setVeri] = useState<Ozet | null>(null);
  const [hata, setHata] = useState('');

  async function yukle() {
    try { setVeri(await modulOzet(mod)); setHata(''); } catch (e: any) { setHata(e.message || 'Özet yüklenemedi.'); }
  }
  useEffect(() => { setVeri(null); yukle(); }, [mod]);

  const ad = tanim?.ad || veri?.katalog.ad || mod;

  function altAc(a: AltBolum) {
    if (a.yol) router.push(a.yol);
    else if (a.hedef) panel.ac(a.hedef);
  }
  function satirAc(git?: { kart?: number } | null) {
    if (git?.kart) router.push(`/kartlar/${git.kart}`);
  }
  function kutuAc(dugme?: string) {
    if (!dugme) return;
    const alt = tanim?.alt?.find((a) => a.hedef?.[0] === '#' + dugme);
    if (alt?.yol) router.push(alt.yol);
    else if (dugme === 'btnmuhasebe' && tanim?.yol) router.push(tanim.yol);
    else panel.ac(['#' + dugme]);
  }

  function panelCiz(id: string, p: Panel) {
    const baslik = veri!.katalog.panel[id] || id;
    let govde: React.ReactNode = null;
    if (p.tip === 'liste') {
      govde = !p.satir?.length ? <div className="hy-mo-bos"><IonIcon icon={checkmarkCircleOutline} />{p.bos || 'Kayıt yok.'}</div> : (
        <div>{p.satir.map((s, i) => (
          <button key={i} className="hy-mo-satir" onClick={() => satirAc(s.git)} disabled={!s.git?.kart}>
            <span className="av" style={{ background: RENK[i % RENK.length] }}>{(s.b || '?').replace(/\(.*?\)/g, '').trim().slice(0, 2).toLocaleUpperCase('tr-TR')}</span>
            <span className="m"><b>{s.b}</b>{s.a && <small>{s.a.replace(/^ · /, '')}</small>}</span>
            {s.s && <span className={'tag t-' + (s.r || 'g')}>{once(s.s)}</span>}
          </button>
        ))}</div>
      );
    } else if (p.tip === 'dagilim') {
      const top = (p.dilim || []).reduce((a, d) => a + (+d[1] || 0), 0) || 1;
      govde = !p.dilim?.length ? <div className="hy-mo-bos">{p.bos || 'Veri yok.'}</div> : (
        <div className="hy-mo-dag">{p.dilim.map((d, i) => {
          const y = Math.round((+d[1] || 0) * 100 / top);
          return (
            <div key={i}><div className="dt"><span>{d[0]}</span><b>{p.adet ? `${d[1]} iş` : `%${y}`}</b></div>
              <div className="bar"><i style={{ width: y + '%', background: d[2] || RENK[i % RENK.length] }} /></div></div>
          );
        })}</div>
      );
    } else if (p.tip === 'uyari') {
      govde = !p.uyari?.length ? <div className="hy-mo-bos"><IonIcon icon={checkmarkCircleOutline} />Şu an dikkat edilecek bir şey yok.</div> : (
        <div>{p.uyari.map((u, i) => (
          <div key={i} className={'hy-mo-uyari u-' + u[0]}>
            <IonIcon icon={u[0] === 'r' ? alertCircleOutline : u[0] === 'a' ? timeOutline : informationCircleOutline} />
            <span><b>{u[1]}</b>{u[2] && <small>{u[2]}</small>}</span>
          </div>
        ))}</div>
      );
    } else if (p.tip === 'hub') {
      govde = tanim?.alt ? <AltKutular alt={tanim.alt} onAc={altAc} /> : null;
    } else if (p.tip === 'kutu') {
      govde = (
        <div className="hy-mo-alt">{(p.kutu || []).map((k, i) => (
          <button key={i} className={'hy-mo-altk' + (k[3] ? ' yak' : '')} onClick={() => kutuAc(k[2]?.dugme)}>
            <span><b>{k[0]}</b>{k[3] && <em>yakında</em>}</span><IonIcon className="ok" icon={openOutline} />
          </button>
        ))}</div>
      );
    }
    return (
      <section key={id} className="hy-mo-panel">
        <h3>{baslik}{p.tip === 'liste' && p.satir?.length ? <span className="say">{p.satir.length}</span> : null}</h3>
        {govde}
      </section>
    );
  }

  const v = veri?.veri;
  const k = veri?.katalog;
  const hubVar = veri?.duzen.panel.some((id) => ['hub', 'kutu'].includes(v?.panel?.[id]?.tip || ''));

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/moduller" text="" /></IonButtons>
          <IonTitle>{ad}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={async (e) => { await yukle(); e.detail.complete(); }}><IonRefresherContent /></IonRefresher>
        {!veri && !hata && <div style={{ display: 'grid', placeItems: 'center', padding: 40 }}><IonSpinner /></div>}
        {hata && !veri && <div className="hy-mo-bos" style={{ padding: 24 }}><IonIcon icon={alertCircleOutline} />{hata}</div>}

        <div className="hy-mo-hero">
          {k?.yakinda && <span className="hy-mo-yak">yakında</span>}
          <OzetMetni metin={v?.ozet || (v?.yetkisiz ? 'Bu modülün özetini görme yetkiniz yok.' : v?.yok)} />
          <div className="hy-mo-dugmeler">
            {tanim?.yol && <IonButton size="small" onClick={() => router.push(tanim.yol!)}><IonIcon slot="start" icon={arrowForwardOutline} />Uygulamada aç</IonButton>}
            <IonButton size="small" fill={tanim?.yol ? 'outline' : 'solid'} disabled={panel.aciliyor} onClick={() => panel.ac(tanim?.hedef || ['#btn' + mod])}>
              <IonIcon slot="start" icon={openOutline} />{panel.aciliyor ? 'Açılıyor…' : k?.git || 'Panelde aç'}
            </IonButton>
          </div>
        </div>

        {veri && !v?.yetkisiz && !v?.yok && (
          <>
            <div className={'hy-mo-kpis' + (k?.yakinda ? ' soluk' : '')}>
              {veri.duzen.kpi.map((id) => {
                const t = k!.kpi[id] || [id, '', '#64748b'];
                const x = v?.kpi?.[id] || ['—', ''];
                return (
                  <div key={id} className="hy-mo-kpi" style={{ borderTopColor: t[2] }}>
                    <small>{t[0]}</small><b>{String(x[0])}</b>{x[1] && <span>{x[1]}</span>}
                  </div>
                );
              })}
            </div>
            {!hubVar && tanim?.alt && <section className="hy-mo-panel"><h3>Bölümler</h3><AltKutular alt={tanim.alt} onAc={altAc} /></section>}
            {veri.duzen.panel.map((id) => panelCiz(id, v?.panel?.[id] || { tip: 'liste', satir: [] }))}
          </>
        )}
        {(v?.yetkisiz || v?.yok) && tanim?.alt && <section className="hy-mo-panel"><h3>Bölümler</h3><AltKutular alt={tanim.alt} onAc={altAc} /></section>}
      </IonContent>
    </IonPage>
  );
}
