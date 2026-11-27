import { useEffect } from 'react';
import { useIonAlert, useIonRouter } from '@ionic/react';
import { App as CapApp } from '@capacitor/app';
import { aktifOturum } from './api/client';
import { kucukKaldir, kucukYokla, useKucukKartlar } from './kucukKart';

/** Alt şerit: aşağı indirilmiş kartlar. Dokununca kart açılır; ✕ uyarıyla kapatır. Değişen kart yeşil yanıp söner. */
export default function KucukSerit() {
  const l = useKucukKartlar();
  const router = useIonRouter();
  const [alert] = useIonAlert();
  const telGor = (aktifOturum()?.kartGorusYetkileri as any)?.iletisimGorebilir !== false;

  useEffect(() => {
    if (!l.length) return;
    const t = setInterval(() => { if (document.visibilityState === 'visible') kucukYokla(); }, 45000);
    const h = CapApp.addListener('appStateChange', (s) => { if (s.isActive) kucukYokla(); });
    return () => { clearInterval(t); h.then((x) => x.remove()); };
  }, [l.length]);

  useEffect(() => { document.body.classList.toggle('hy-serit-var', l.length > 0); }, [l.length]);

  if (!l.length) return null;
  return (
    <div className="hy-kucuk-serit">
      {l.map((k) => (
        <div key={k.id} className={'hy-kucuk' + (k.degisen?.length ? ' degisti' : '')} title={k.degisen?.join(', ')}>
          <button className="ad" onClick={() => { kucukKaldir(k.id); router.push(`/kartlar/${k.id}`); }}>
            <b>#{k.id}</b> {telGor ? k.musteri : 'Kart'}{k.degisen?.length ? <small> · {k.degisen.join(', ')}</small> : null}
          </button>
          <button className="kapat" aria-label="Kapat" onClick={() => alert({
            header: `#${k.id} kapatılsın mı?`, message: 'Kart alt şeritten kaldırılır.',
            buttons: [{ text: 'Vazgeç', role: 'cancel' }, { text: 'Kapat', role: 'destructive', handler: () => kucukKaldir(k.id) }],
          })}>✕</button>
        </div>
      ))}
    </div>
  );
}
