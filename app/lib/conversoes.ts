/**
 * Conversões configuráveis em Admin → Integrações: o que rastrear e qual
 * evento disparar em cada plataforma. Compartilhado entre servidor
 * (API de Conversões) e navegador (Pixel e gtag).
 */

export const TIPOS_CONVERSAO = ["formulario", "whatsapp", "ligar"] as const;
export type TipoConversao = (typeof TIPOS_CONVERSAO)[number];

export const EVENTOS_META = [
  { valor: "Lead", rotulo: "Lead" },
  { valor: "Contact", rotulo: "Contact" },
  { valor: "CompleteRegistration", rotulo: "CompleteRegistration" },
  { valor: "SubmitApplication", rotulo: "SubmitApplication" },
  { valor: "Schedule", rotulo: "Schedule" },
  { valor: "personalizado", rotulo: "Evento personalizado" },
] as const;

export type ConfigConversao = { rastrear: boolean; eventoMeta: string; eventoPersonalizado: string; rotuloGoogle: string };
export type Conversoes = Record<TipoConversao, ConfigConversao>;

export const DESCRICAO_CONVERSAO: Record<TipoConversao, { titulo: string; texto: string }> = {
  formulario: { titulo: "Envio de formulário", texto: "Formulários da página do veículo, Contato, Venda seu carro e landing pages." },
  whatsapp: { titulo: "Clique no WhatsApp", texto: "Botões de WhatsApp em todo o site e nas landing pages." },
  ligar: { titulo: "Clique em ligar", texto: "Botões com o telefone (tel:)." },
};

export const CONVERSOES_PADRAO: Conversoes = {
  formulario: { rastrear: true, eventoMeta: "Lead", eventoPersonalizado: "", rotuloGoogle: "" },
  whatsapp: { rastrear: true, eventoMeta: "Contact", eventoPersonalizado: "", rotuloGoogle: "" },
  ligar: { rastrear: false, eventoMeta: "Contact", eventoPersonalizado: "", rotuloGoogle: "" },
};

const EVENTO_VALIDO = /^[A-Za-z][A-Za-z0-9_]{0,39}$/;
const ROTULO_VALIDO = /^[\w-]{4,60}$/;

/** Lê o JSON do banco aceitando só valores seguros (vão para scripts no navegador). */
export function lerConversoes(json: string): Conversoes {
  let bruto: Partial<Record<TipoConversao, Partial<ConfigConversao>>> = {};
  try { bruto = JSON.parse(json || "{}"); } catch { /* usa o padrão */ }
  return Object.fromEntries(TIPOS_CONVERSAO.map((tipo) => {
    const padrao = CONVERSOES_PADRAO[tipo];
    const b = bruto[tipo] ?? {};
    const eventoMeta = EVENTOS_META.some((e) => e.valor === b.eventoMeta) ? b.eventoMeta! : padrao.eventoMeta;
    return [tipo, {
      rastrear: typeof b.rastrear === "boolean" ? b.rastrear : padrao.rastrear,
      eventoMeta,
      eventoPersonalizado: EVENTO_VALIDO.test(b.eventoPersonalizado ?? "") ? b.eventoPersonalizado! : "",
      rotuloGoogle: ROTULO_VALIDO.test(b.rotuloGoogle ?? "") ? b.rotuloGoogle! : "",
    }];
  })) as Conversoes;
}

export const validarEventoPersonalizado = (v: string) => EVENTO_VALIDO.test(v);
export const validarRotuloGoogle = (v: string) => ROTULO_VALIDO.test(v);

/** Nome do evento do Meta para um tipo, ou null se desligado/incompleto. */
export function eventoMetaDe(c: ConfigConversao) {
  if (!c.rastrear) return null;
  if (c.eventoMeta === "personalizado") return c.eventoPersonalizado ? { nome: c.eventoPersonalizado, personalizado: true } : null;
  return { nome: c.eventoMeta, personalizado: false };
}
