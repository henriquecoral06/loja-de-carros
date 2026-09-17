/**
 * Modelo do corpo do webhook: cada CRM espera o lead num formato próprio
 * (ex.: `{ "entity": "Lead", "data": { "name": … } }`). O modelo é um JSON
 * com marcadores `{{lead.nome}}`; um valor que é só o marcador mantém o tipo
 * (número continua número), dentro de um texto vira texto.
 * Usado no servidor (envio) e no painel (prévia).
 */

export const CAMPOS_MODELO: { campo: string; descricao: string }[] = [
  { campo: "lead.nome", descricao: "Nome completo" },
  { campo: "lead.primeiro_nome", descricao: "Primeiro nome" },
  { campo: "lead.email", descricao: "E-mail (pode vir vazio)" },
  { campo: "lead.telefone", descricao: "Telefone com DDI, só números (5548999990000)" },
  { campo: "lead.telefone_formatado", descricao: "Telefone com +, ex.: +5548999990000" },
  { campo: "lead.mensagem", descricao: "Mensagem escrita pelo visitante" },
  { campo: "origem", descricao: "veiculo, contato, venda_seu_carro ou landing_page" },
  { campo: "origem_rotulo", descricao: "Página do veículo, Contato, Venda seu carro, Landing page" },
  { campo: "veiculo.titulo", descricao: "Marca, modelo, versão e ano" },
  { campo: "veiculo.codigo", descricao: "Código do estoque (0001)" },
  { campo: "veiculo.marca", descricao: "Marca" },
  { campo: "veiculo.modelo", descricao: "Modelo" },
  { campo: "veiculo.versao", descricao: "Versão" },
  { campo: "veiculo.ano_modelo", descricao: "Ano do modelo (número)" },
  { campo: "veiculo.preco", descricao: "Preço em reais (número)" },
  { campo: "veiculo.url", descricao: "Link da página do carro" },
  { campo: "vendedor.nome", descricao: "Vendedor do carro" },
  { campo: "vendedor.whatsapp", descricao: "WhatsApp do vendedor" },
  { campo: "vendedor.email", descricao: "E-mail do vendedor" },
  { campo: "landing_page.titulo", descricao: "Nome da landing page" },
  { campo: "landing_page.url", descricao: "Link da landing page" },
  { campo: "rastreio.utm_source", descricao: "utm_source" },
  { campo: "rastreio.utm_medium", descricao: "utm_medium" },
  { campo: "rastreio.utm_campaign", descricao: "utm_campaign" },
  { campo: "rastreio.utm_term", descricao: "utm_term" },
  { campo: "rastreio.utm_content", descricao: "utm_content" },
  { campo: "rastreio.gclid", descricao: "gclid (Google Ads)" },
  { campo: "rastreio.fbclid", descricao: "fbclid (Meta)" },
  { campo: "rastreio.pagina_entrada", descricao: "Primeira página da visita" },
  { campo: "loja.nome", descricao: "Nome da loja" },
  { campo: "id", descricao: "ID do lead no site" },
  { campo: "criado_em", descricao: "Data e hora (ISO 8601)" },
  { campo: "evento", descricao: "lead.novo ou teste" },
];

const ROTULOS_ORIGEM: Record<string, string> = {
  veiculo: "Página do veículo", contato: "Contato", venda_seu_carro: "Venda seu carro", landing_page: "Landing page",
};

export const MODELO_EXEMPLO = `{
  "entity": "Lead",
  "data": {
    "name": "{{lead.nome}}",
    "email": "{{lead.email}}",
    "phone": "{{lead.telefone}}",
    "message": "{{lead.mensagem}}",
    "source": "Site — {{origem_rotulo}}",
    "vehicle": "{{veiculo.titulo}}",
    "utm_campaign": "{{rastreio.utm_campaign}}"
  }
}`;

const MARCADOR = /\{\{\s*([\w.]+)\s*\}\}/g;
const SO_MARCADOR = /^\{\{\s*([\w.]+)\s*\}\}$/;
const CONHECIDOS = new Set(CAMPOS_MODELO.map((c) => c.campo));

type Base = Record<string, unknown>;

function valor(payload: Base, campo: string): unknown {
  if (campo === "origem_rotulo") return ROTULOS_ORIGEM[String(payload.origem)] ?? String(payload.origem ?? "");
  if (campo === "lead.primeiro_nome") return String((payload.lead as Base | null)?.nome ?? "").split(/\s+/)[0] ?? "";
  if (campo === "lead.telefone_formatado") {
    const t = String((payload.lead as Base | null)?.telefone ?? "");
    return t ? `+${t}` : "";
  }
  let atual: unknown = payload;
  for (const parte of campo.split(".")) atual = atual && typeof atual === "object" ? (atual as Base)[parte] : undefined;
  return atual ?? null;
}

/** Marcadores que o modelo usa e o sistema não conhece. */
export function camposDesconhecidos(modelo: string) {
  return [...new Set([...modelo.matchAll(MARCADOR)].map((m) => m[1]).filter((c) => !CONHECIDOS.has(c)))];
}

/** `null` se válido; senão, a mensagem de erro. */
export function validarModelo(modelo: string): string | null {
  if (!modelo.trim()) return null;
  if (modelo.length > 8000) return "Modelo grande demais (até 8.000 caracteres).";
  let json: unknown;
  try { json = JSON.parse(modelo); } catch (e) { return `JSON inválido: ${e instanceof Error ? e.message : "confira aspas e vírgulas"}.`; }
  if (!json || typeof json !== "object" || Array.isArray(json)) return "O modelo precisa ser um objeto JSON: { … }.";
  const desconhecidos = camposDesconhecidos(modelo);
  if (desconhecidos.length) return `Campo desconhecido: ${desconhecidos.map((c) => `{{${c}}}`).join(", ")}.`;
  return null;
}

/** Monta o corpo a partir do modelo e dos dados do lead. */
export function aplicarModelo(modelo: string, payload: Base): unknown {
  const trocar = (no: unknown): unknown => {
    if (typeof no === "string") {
      const inteiro = SO_MARCADOR.exec(no);
      if (inteiro) return valor(payload, inteiro[1]);
      return no.replace(MARCADOR, (_, campo: string) => {
        const v = valor(payload, campo);
        return v == null ? "" : String(v);
      });
    }
    if (Array.isArray(no)) return no.map(trocar);
    if (no && typeof no === "object") return Object.fromEntries(Object.entries(no).map(([k, v]) => [k, trocar(v)]));
    return no;
  };
  return trocar(JSON.parse(modelo));
}
