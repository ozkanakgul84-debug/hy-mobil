import { Capacitor } from '@capacitor/core';
import { InAppBrowser, ToolBarType } from '@capgo/inappbrowser';
import { aktifOturum, SUNUCU } from './api/client';

export const PANEL_YOLU = '/erp-paneli/?kaynak=uygulama';

/** Web panelini (tüm modüller) uygulamanın içinde açar.
 *  Panel, oturumu sessionStorage 'erp_oturum_paket' içinde arar; uygulamadaki giriş paketini
 *  sayfa JavaScript'i çalışmadan önce oraya yazarız, böylece ikinci kez giriş istenmez.
 *  Bir kez yazılır (hy_uyg_enjekte): panelde "Çıkış" yapılırsa geri yazmayız. */
/** hedef: panel açılınca sırayla tıklanacak öğeler (ör. ['#btnuretimhub', '#p-uretimhub .hm-kutu[data-i="1"]']).
 *  Modül özet sayfası araya girmesin diye panelin __hmoGec bayrağıyla tıklanır. Her açılışta bir kez çalışır. */
export async function paneliAc(yol = PANEL_YOLU, hedef: string[] = []): Promise<'acildi' | 'paket_yok'> {
  const o = aktifOturum();
  const url = SUNUCU + yol;
  if (!o?.paket) return 'paket_yok';

  if (!Capacitor.isNativePlatform()) {
    window.open(url, '_blank');
    return 'acildi';
  }

  const betik = `(function(){try{
    if(location.hostname!=='hesaplayonet.com'&&location.hostname!=='www.hesaplayonet.com')return;
    var ss=window.sessionStorage;
    if(ss.getItem('hy_uyg_enjekte'))return;
    var p=${JSON.stringify(o.paket)};
    ss.setItem('erp_oturum_paket',p);
    try{localStorage.setItem('hy_oturum_kalici',JSON.stringify({p:p,t:Date.now()}));}catch(e){}
    ss.setItem('hy_uyg_enjekte','1');
  }catch(e){}})();
  (function(){try{
    var h=${JSON.stringify(hedef)},an='hy_uyg_hedef_${Date.now()}';
    if(!h.length||sessionStorage.getItem(an))return;
    sessionStorage.setItem(an,'1');
    var i=0,t0=Date.now(),bek=0;
    (function adim(){
      if(Date.now()-t0>20000)return;
      var hazir=window.ERPOturum&&document.querySelector('.sb-menu')&&document.querySelector('.ep-panel.on');
      if(!hazir)return setTimeout(adim,200);
      if(!bek)bek=Date.now();
      if(i===0&&Date.now()-bek<800)return setTimeout(adim,200); // panel ilk ekranını (CRM) açsın, sonra biz
      var el=document.querySelector(h[i]);
      if(!el)return setTimeout(adim,200);
      window.__hmoGec=true;try{el.click();}finally{window.__hmoGec=false;}
      if(++i<h.length)setTimeout(adim,350);
    })();
  }catch(e){}})();`;

  await InAppBrowser.openWebView({
    url,
    title: 'Hesapla Yönet',
    toolbarType: ToolBarType.COMPACT,
    toolbarColor: '#1e2a3a',
    toolbarTextColor: '#ffffff',
    showArrow: true,
    visibleTitle: false,
    isPresentAfterPageLoad: true,
    preShowScript: betik,
    preShowScriptInjectionTime: 'documentStart',
    activeNativeNavigationForWebview: true,
    disableGoBackOnNativeApplication: true,
    handleDownloads: true,
    openBlankTargetInWebView: true,
    enabledSafeBottomMargin: true,
  });
  return 'acildi';
}
