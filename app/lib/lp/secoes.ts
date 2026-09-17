/** Seções das landing pages: quais podem ser ocultadas e em que ordem aparecem. */
export const SECOES_LP = [
  { chave: "menu", rotulo: "Menu superior" },
  { chave: "whatsapp", rotulo: "WhatsApp flutuante" },
  { chave: "conceito", rotulo: "Apresentação" },
  { chave: "destaques", rotulo: "Diferenciais" },
  { chave: "numeros", rotulo: "Números" },
  { chave: "galeria", rotulo: "Galeria de fotos" },
  { chave: "faixa", rotulo: "Faixa de imagem" },
  { chave: "video", rotulo: "Vídeo" },
  { chave: "ficha", rotulo: "Ficha técnica" },
  { chave: "etapas", rotulo: "Como comprar" },
  { chave: "localizacao", rotulo: "Localização da loja" },
  { chave: "cards", rotulo: "Cards de navegação" },
  { chave: "depoimentos", rotulo: "Depoimentos" },
  { chave: "faq", rotulo: "Dúvidas frequentes" },
  { chave: "contato", rotulo: "Formulário final" },
] as const;
export type SecaoLP = (typeof SECOES_LP)[number]["chave"];

/** Fixas: não entram na ordem (menu no topo e botão flutuante). */
export type SecaoOrdenavel = Exclude<SecaoLP, "menu" | "whatsapp">;
export const ehOrdenavel = (k: string): k is SecaoOrdenavel => SECOES_LP.some((s) => s.chave === k) && k !== "menu" && k !== "whatsapp";
export const ehSecao = (k: string): k is SecaoLP => SECOES_LP.some((s) => s.chave === k);

export const ORDEM_PADRAO: SecaoOrdenavel[] = SECOES_LP.map((s) => s.chave).filter(ehOrdenavel);

function lista(json: string | null | undefined): unknown[] {
  try {
    const v = json ? JSON.parse(json) : [];
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function lerOcultas(json: string | null | undefined): Set<SecaoLP> {
  return new Set(lista(json).filter((k): k is SecaoLP => typeof k === "string" && ehSecao(k)));
}

/**
 * Ordem final: a salva, completada com as seções que faltam (ex.: uma seção
 * criada depois). Cada uma entra antes da primeira seção salva que vem depois
 * dela na ordem padrão.
 */
export function lerOrdem(json: string | null | undefined): SecaoOrdenavel[] {
  const salva = [...new Set(lista(json).filter((k): k is SecaoOrdenavel => typeof k === "string" && ehOrdenavel(k)))];
  if (!salva.length) return [...ORDEM_PADRAO];
  for (const k of ORDEM_PADRAO) {
    if (salva.includes(k)) continue;
    const depois = ORDEM_PADRAO.slice(ORDEM_PADRAO.indexOf(k) + 1);
    const i = salva.findIndex((s) => depois.includes(s));
    if (i === -1) salva.push(k);
    else salva.splice(i, 0, k);
  }
  return salva;
}
