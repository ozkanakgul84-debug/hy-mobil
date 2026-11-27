import { useEffect, useState } from 'react';
import { IonButton, IonIcon, IonInput, IonSelect, IonSelectOption, useIonToast } from '@ionic/react';
import { addOutline } from 'ionicons/icons';
import { bolumBul, isEmriVer, isIslem, kartIsleri, panoBul, panoYapi, type IsKarti, type PanoBen, type PanoYapi } from '../api/pano';
import { IsDetay } from './Panolar';

/** Müşteri kartında 🗂 İş emirleri (web föyü): kartın departmanlardaki iş kartları ve yeni iş emri verme. */
export default function IsEmirleri({ kartId }: { kartId: number }) {
  const [yapi, setYapi] = useState<PanoYapi | null>(null);
  const [ben, setBen] = useState<PanoBen | null>(null);
  const [isler, setIsler] = useState<IsKarti[] | null>(null);
  const [gonder, setGonder] = useState<string[]>([]);
  const [form, setForm] = useState(false);
  const [pano, setPano] = useState(''); const [bolum, setBolum] = useState(''); const [baslik, setBaslik] = useState(''); const [aciklama, setAciklama] = useState('');
  const [acik, setAcik] = useState<IsKarti | null>(null);
  const [mesgul, setMesgul] = useState(false);
  const [toast] = useIonToast();

  const yukle = async () => {
    try {
      const [y, k] = await Promise.all([yapi ? null : panoYapi(), kartIsleri(kartId)]);
      if (y) { setYapi(y.yapi); setBen(y.ben); }
      setIsler(k.isler || []); setGonder(k.gonderebilir || []);
    } catch { setIsler(null); }
  };
  useEffect(() => { yukle(); }, [kartId]); // eslint-disable-line

  if (!yapi || (!isler?.length && !gonder.length)) return null; // pano modülü yoksa ya da yetki yoksa görünmez
  const p = panoBul(yapi, pano || gonder[0]);
  const durum = (i: IsKarti) => { const pp = panoBul(yapi, i.pano); const bb = bolumBul(pp, i.bolum); const s = bb?.sutunlar.find((x) => x.id === i.sutun); return `${pp?.ikon || ''} ${pp?.ad || i.pano}${(pp?.bolumler || []).length > 1 && bb ? ' › ' + bb.ad : ''} · ${s?.ad || i.sutun}`; };

  const olustur = async () => {
    if (!baslik.trim() || !p) { toast({ message: 'Yapılacak işi yazın.', duration: 2000, color: 'warning' }); return; }
    setMesgul(true);
    try {
      await isEmriVer(kartId, [{ pano: p.id, bolum: bolum || p.bolumler?.[0]?.id || '', baslik: baslik.trim(), aciklama: aciklama.trim(), dis: [] }]);
      toast({ message: 'İş emri oluşturuldu.', duration: 1800, color: 'success' });
      setBaslik(''); setAciklama(''); setForm(false); yukle();
    } catch (e: any) { toast({ message: e.message, duration: 3000, color: 'danger' }); }
    finally { setMesgul(false); }
  };

  return (
    <section className="hy-mo-panel">
      <h3 style={{ justifyContent: 'space-between' }}>
        <span>🗂 İş emirleri</span>
        {!!gonder.length && <IonButton size="small" onClick={() => setForm(!form)}><IonIcon slot="start" icon={addOutline} />İş emri ver</IonButton>}
      </h3>
      {form && (
        <div style={{ padding: '0 12px 10px' }}>
          <IonSelect label="Departman" labelPlacement="stacked" interface="action-sheet" value={p?.id} onIonChange={(e) => { setPano(String(e.detail.value)); setBolum(''); }}>
            {gonder.map((id) => { const x = panoBul(yapi, id); return <IonSelectOption key={id} value={id}>{x?.ikon} {x?.ad || id}</IonSelectOption>; })}
          </IonSelect>
          {(p?.bolumler || []).length > 1 && (
            <IonSelect label="Bölüm" labelPlacement="stacked" interface="action-sheet" value={bolum || p?.bolumler?.[0]?.id} onIonChange={(e) => setBolum(String(e.detail.value))}>
              {(p?.bolumler || []).map((b) => <IonSelectOption key={b.id} value={b.id}>{b.ad}</IonSelectOption>)}
            </IonSelect>
          )}
          <IonInput label="Yapılacak iş" labelPlacement="stacked" value={baslik} onIonInput={(e) => setBaslik(String(e.detail.value || ''))} />
          <IonInput label="Açıklama" labelPlacement="stacked" value={aciklama} onIonInput={(e) => setAciklama(String(e.detail.value || ''))} />
          <IonButton expand="block" disabled={mesgul} onClick={olustur}>Oluştur</IonButton>
        </div>
      )}
      {!isler?.length && !form && <div className="hy-mo-bos">Bu kartın departmanlarda iş emri yok.</div>}
      {(isler || []).map((i) => (
        <button key={i.id} className="hy-mo-satir" onClick={() => setAcik(i)}>
          <span className="m"><b>{i.kod ? i.kod + ' · ' : ''}{i.baslik}</b><small>{durum(i)}</small></span>
        </button>
      ))}
      <IsDetay is={acik} yapi={yapi} ben={ben} onKapat={() => setAcik(null)} onDegisti={yukle} onKartAc={() => setAcik(null)}
        onTasi={async (is, s) => { try { await isIslem(is.id, { islem: 'tasi', sutun: s }); yukle(); } catch (e: any) { toast({ message: e.message, duration: 3000, color: 'danger' }); } }} />
    </section>
  );
}
