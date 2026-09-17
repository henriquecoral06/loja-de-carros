/**
 * Meta Pixel, Google Ads, GA4 e Google Tag Manager, configurados em
 * Admin → Integrações. Tudo aqui roda só no navegador.
 *
 * Eventos:
 *   pagina      → PageView (Meta) · page_view (Google) — a cada navegação
 *   veiculo     → ViewContent · view_item               — página de um carro
 *   formulario  → evento escolhido no painel + conversão — formulário enviado
 *   whatsapp    → evento escolhido no painel + conversão — clique no WhatsApp
 *   ligar       → evento escolhido no painel + conversão — clique no telefone
 * Com GTM, os mesmos nomes vão para o dataLayer (`event: "formulario"` etc.).
 * O `eventId` do formulário é o mesmo que o servidor manda à API de
 * Conversões: o Meta conta uma vez só.
 */
import type { ConfigRastreamento } from "~/.server/integracoes";
import { eventoMetaDe, type TipoConversao } from "./conversoes";
import { CHAVE_CONSENTIMENTO, scriptTags, temTags, urlGtag } from "./tags";

type Evento = "pagina" | "veiculo" | TipoConversao;
type Dados = { id?: string; nome?: string; valor?: number; origem?: string; eventId?: string };

type Janela = Window & {
  fbq?: ((...args: unknown[]) => void) & { callMethod?: unknown; queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown };
  _fbq?: unknown;
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

let config: ConfigRastreamento | null = null;
let carregado = false;
const w = () => window as unknown as Janela & { __tagsLoja?: boolean };

/**
 * Liga o rastreamento. As tags normalmente já vieram no <head> do HTML
 * (ver app/lib/tags.ts); se a página foi aberta por navegação interna a
 * partir de uma tela sem tags, instala o mesmo código agora.
 */
export function iniciarTags(c: ConfigRastreamento) {
  config = c;
  if (carregado || !temTags(c)) return;
  carregado = true;
  if (w().__tagsLoja) return;
  const init = document.createElement("script");
  init.textContent = scriptTags(c);
  document.head.appendChild(init);
  const gtag = urlGtag(c);
  if (gtag) {
    const s = document.createElement("script");
    s.async = true;
    s.src = gtag;
    document.head.appendChild(s);
  }
}

/** "Aceitar" no aviso de cookies: libera Google (Modo de Consentimento) e Meta. */
export function concederConsentimento() {
  const j = w();
  j.gtag?.("consent", "update", { ad_storage: "granted", analytics_storage: "granted", ad_user_data: "granted", ad_personalization: "granted" });
  j.gtag?.("set", "ads_data_redaction", false);
  if (j.fbq) {
    j.fbq("consent", "grant");
    // O PageView desta página foi retido enquanto o consentimento estava negado.
    j.fbq("track", "PageView");
  }
  // O Google guarda os eventos anteriores e os reenvia ao receber o consentimento.
  j.dataLayer?.push({ event: "consentimento_aceito" });
}

export function rastrear(evento: Evento, dados: Dados = {}) {
  if (!carregado || !config) return;
  const j = w();
  const c = config;
  const valor = dados.valor ? { value: dados.valor, currency: "BRL" } : {};

  if (evento === "pagina" || evento === "veiculo") {
    if (evento === "pagina") {
      j.fbq?.("track", "PageView");
      j.gtag?.("event", "page_view", { page_location: location.href, page_title: document.title });
      // Remarketing do Google Ads: só marca com o page_view endereçado à conta.
      if (c.googleAdsId) j.gtag?.("event", "page_view", { send_to: c.googleAdsId, page_location: location.href });
    } else {
      j.fbq?.("track", "ViewContent", { content_ids: [dados.id], content_name: dados.nome, content_type: "vehicle", ...valor });
      j.gtag?.("event", "view_item", { items: [{ item_id: dados.id, item_name: dados.nome, price: dados.valor }], ...valor });
    }
  } else {
    const conf = c.conversoes[evento];
    if (!conf.rastrear) return;
    const meta = eventoMetaDe(conf);
    if (meta && j.fbq) {
      const opcoes = dados.eventId ? { eventID: dados.eventId } : undefined;
      j.fbq(meta.personalizado ? "trackCustom" : "track", meta.nome, { content_name: dados.nome, ...valor }, opcoes);
    }
    if (j.gtag) {
      j.gtag("event", evento === "formulario" ? "generate_lead" : "contact", { method: evento, item_name: dados.nome, ...valor });
      if (c.googleAdsId && conf.rotuloGoogle) j.gtag("event", "conversion", { send_to: `${c.googleAdsId}/${conf.rotuloGoogle}`, ...valor });
    }
  }

  if (c.gtmId && j.dataLayer) j.dataLayer.push({ event: evento, veiculo: dados.nome, veiculo_id: dados.id, valor: dados.valor, origem: dados.origem });
}


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
