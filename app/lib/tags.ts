/**
 * Código de instalação das tags (Google e Meta), igual ao que as próprias
 * plataformas mandam colar no <head>. Vai no HTML de toda página pública:
 * assim o Tag Assistant, o diagnóstico do Google Ads e o Pixel Helper
 * encontram as tags.
 *
 * LGPD: com "pedir consentimento" ligado, as tags carregam em Modo de
 * Consentimento (Google: ad_storage/analytics_storage "denied"; Meta:
 * consent "revoke") e só gravam cookies depois do "Aceitar".
 */
import type { ConfigRastreamento } from "~/.server/integracoes";

export const CHAVE_CONSENTIMENTO = "consentimento-cookies";

const FORMATOS = {
  metaPixelId: /^\d{10,20}$/,
  googleAdsId: /^AW-\d{6,15}$/,
  ga4Id: /^G-[A-Z0-9]{4,15}$/,
  gtmId: /^GTM-[A-Z0-9]{4,12}$/,
} as const;

/** IDs validados de novo aqui: entram num <script>. */
export function idsValidos(c: Pick<ConfigRastreamento, keyof typeof FORMATOS>) {
  const ok = (k: keyof typeof FORMATOS) => (FORMATOS[k].test(c[k]) ? c[k] : "");
  return { metaPixelId: ok("metaPixelId"), googleAdsId: ok("googleAdsId"), ga4Id: ok("ga4Id"), gtmId: ok("gtmId") };
}

export const temTags = (c: ConfigRastreamento | undefined | null) => {
  if (!c) return false;
  const ids = idsValidos(c);
  return Boolean(ids.metaPixelId || ids.googleAdsId || ids.ga4Id || ids.gtmId);
};

/** URL do gtag.js (a primeira tag do Google configurada), ou null. */
export function urlGtag(c: ConfigRastreamento) {
  const { googleAdsId, ga4Id } = idsValidos(c);
  const id = googleAdsId || ga4Id;
  return id ? `https://www.googletagmanager.com/gtag/js?id=${id}` : null;
}

const js = (v: unknown) => JSON.stringify(v).replace(/</g, "\\u003c");

/** Script de inicialização (sem o gtag.js, que vai em <script async src>). */
export function scriptTags(c: ConfigRastreamento) {
  const { metaPixelId, googleAdsId, ga4Id, gtmId } = idsValidos(c);
  const linhas = [
    "window.__tagsLoja=true;",
    // Visitante que já aceitou numa visita anterior começa com tudo liberado.
    `var ok=!${js(c.exigirConsentimento)};try{ok=ok||localStorage.getItem(${js(CHAVE_CONSENTIMENTO)})==="aceito"}catch(e){}`,
    "var estado=ok?'granted':'denied';",
    "window.dataLayer=window.dataLayer||[];window.gtag=window.gtag||function(){dataLayer.push(arguments)};",
    "gtag('consent','default',{ad_storage:estado,analytics_storage:estado,ad_user_data:estado,ad_personalization:estado,wait_for_update:500});",
    "gtag('set','ads_data_redaction',!ok);gtag('set','url_passthrough',true);",
    "gtag('js',new Date());",
    // page_view manual: o site troca de página sem recarregar.
    googleAdsId && `gtag('config',${js(googleAdsId)},{send_page_view:false});`,
    ga4Id && `gtag('config',${js(ga4Id)},{send_page_view:false});`,
    gtmId && `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;f.parentNode.insertBefore(j,f)})(window,document,'script','dataLayer',${js(gtmId)});`,
    metaPixelId && "!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');",
    metaPixelId && `if(!ok)fbq('consent','revoke');fbq('init',${js(metaPixelId)});`,
  ];
  return linhas.filter(Boolean).join("\n");
}
