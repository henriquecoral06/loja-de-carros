/**
 * Meta Pixel, Google Ads, GA4 e Google Tag Manager, configurados em
 * Admin → Integrações. Tudo aqui roda só no navegador.
 *
 * Eventos enviados:
 *   pagina    → PageView (Meta) · page_view (Google) — a cada navegação
 *   veiculo   → ViewContent · view_item               — página de um carro
 *   whatsapp  → Contact · conversão "WhatsApp"        — clique no WhatsApp
 *   telefone  → Contact                               — clique no telefone
 *   lead      → Lead · generate_lead + conversão      — formulário enviado
 * Com GTM, os mesmos nomes vão para o dataLayer (`event: "lead"` etc.).
 */
import type { ConfigRastreamento } from "~/.server/integracoes";

type Evento = "pagina" | "veiculo" | "whatsapp" | "telefone" | "lead";
type Dados = { id?: string; nome?: string; valor?: number; origem?: string };

type Janela = Window & {
  fbq?: ((...args: unknown[]) => void) & { callMethod?: unknown; queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown };
  _fbq?: unknown;
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

let config: ConfigRastreamento | null = null;
let carregado = false;
const w = () => window as unknown as Janela;

const temAlgo = (c: ConfigRastreamento) => Boolean(c.metaPixelId || c.googleAdsId || c.ga4Id || c.gtmId);

function script(src: string) {
  const s = document.createElement("script");
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
}

/** Injeta as tags. Chamado depois do consentimento (ou direto, se a loja desligou o aviso). */
export function carregarTags(c: ConfigRastreamento) {
  config = c;
  if (carregado || !temAlgo(c)) return;
  carregado = true;
  const j = w();

  if (c.metaPixelId) {
    // Equivalente ao snippet oficial do Meta, sem string de script inline.
    const fbq = function (...args: unknown[]) {
      const f = j.fbq!;
      if (f.callMethod) (f.callMethod as (...a: unknown[]) => void).apply(f, args);
      else f.queue!.push(args);
    } as Janela["fbq"] & object;
    fbq.push = fbq; fbq.loaded = true; fbq.version = "2.0"; fbq.queue = [];
    j.fbq = fbq; j._fbq = fbq;
    script("https://connect.facebook.net/en_US/fbevents.js");
    j.fbq("init", c.metaPixelId);
  }

  if (c.googleAdsId || c.ga4Id) {
    j.dataLayer = j.dataLayer || [];
    j.gtag = function () { j.dataLayer!.push(arguments); }; // gtag exige o objeto arguments
    script(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(c.googleAdsId || c.ga4Id)}`);
    j.gtag("js", new Date());
    // page_view manual: a navegação do site não recarrega a página.
    if (c.googleAdsId) j.gtag("config", c.googleAdsId, { send_page_view: false });
    if (c.ga4Id) j.gtag("config", c.ga4Id, { send_page_view: false });
  }

  if (c.gtmId) {
    j.dataLayer = j.dataLayer || [];
    j.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
    script(`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(c.gtmId)}`);
  }
}

export function rastrear(evento: Evento, dados: Dados = {}) {
  if (!carregado || !config) return;
  const j = w();
  const c = config;
  const valor = dados.valor ? { value: dados.valor, currency: "BRL" } : {};

  if (j.fbq) {
    if (evento === "pagina") j.fbq("track", "PageView");
    if (evento === "veiculo") j.fbq("track", "ViewContent", { content_ids: [dados.id], content_name: dados.nome, content_type: "vehicle", ...valor });
    if (evento === "whatsapp" || evento === "telefone") j.fbq("track", "Contact", { content_name: dados.nome });
    if (evento === "lead") j.fbq("track", "Lead", { content_name: dados.nome, ...valor });
  }

  if (j.gtag) {
    if (evento === "pagina") j.gtag("event", "page_view", { page_location: location.href, page_title: document.title });
    if (evento === "veiculo") j.gtag("event", "view_item", { items: [{ item_id: dados.id, item_name: dados.nome, price: dados.valor }], ...valor });
    if (evento === "whatsapp" && c.googleAdsId && c.googleAdsRotuloWhatsapp) j.gtag("event", "conversion", { send_to: `${c.googleAdsId}/${c.googleAdsRotuloWhatsapp}` });
    if (evento === "whatsapp" || evento === "telefone") j.gtag("event", "contact", { method: evento, item_name: dados.nome });
    if (evento === "lead") {
      j.gtag("event", "generate_lead", { item_name: dados.nome, ...valor });
      if (c.googleAdsId && c.googleAdsRotuloLead) j.gtag("event", "conversion", { send_to: `${c.googleAdsId}/${c.googleAdsRotuloLead}`, ...valor });
    }
  }

  if (c.gtmId && j.dataLayer) j.dataLayer.push({ event: evento, veiculo: dados.nome, veiculo_id: dados.id, valor: dados.valor, origem: dados.origem });
}

const CHAVE_CONSENTIMENTO = "consentimento-cookies";

export function lerConsentimento(): "aceito" | "recusado" | null {
  try {
    const v = localStorage.getItem(CHAVE_CONSENTIMENTO);
    return v === "aceito" || v === "recusado" ? v : null;
  } catch {
    return null;
  }
}

export function gravarConsentimento(valor: "aceito" | "recusado") {
  try { localStorage.setItem(CHAVE_CONSENTIMENTO, valor); } catch { /* navegação privada: vale só nesta visita */ }
}

/**
 * Origem do visitante (utm_*, gclid, fbclid e página de entrada), guardada
 * na primeira página da visita e enviada junto com o formulário — é o que
 * diz ao CRM qual anúncio trouxe o lead.
 */
const CHAVE_ORIGEM = "origem-visita";
const PARAMETROS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid", "gbraid", "wbraid"];

export function registrarOrigem() {
  try {
    const params = new URLSearchParams(location.search);
    const achados = Object.fromEntries(PARAMETROS.filter((p) => params.get(p)).map((p) => [p, params.get(p)!.slice(0, 200)]));
    // Nova campanha na mesma visita substitui a anterior; sem parâmetro, mantém.
    if (Object.keys(achados).length || !sessionStorage.getItem(CHAVE_ORIGEM)) {
      sessionStorage.setItem(CHAVE_ORIGEM, JSON.stringify({
        ...achados,
        pagina_entrada: location.pathname.slice(0, 200),
        referencia: document.referrer.slice(0, 200),
      }));
    }
  } catch { /* sem sessionStorage: segue sem origem */ }
}

export function lerOrigem() {
  try { return sessionStorage.getItem(CHAVE_ORIGEM) ?? ""; } catch { return ""; }
}
