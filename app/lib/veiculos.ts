/** Listas fechadas usadas no schema, nos filtros e nos formulários. */

export const CAMBIOS = ["Manual", "Automático", "CVT", "Automatizado"] as const;
export const COMBUSTIVEIS = ["Flex", "Gasolina", "Etanol", "Diesel", "Híbrido", "Elétrico"] as const;
export const CARROCERIAS = ["Hatch", "Sedã", "SUV", "Picape", "Minivan", "Cupê", "Conversível", "Perua"] as const;
export const STATUS_ANUNCIO = ["ativo", "pausado", "vendido"] as const;
export const STATUS_LEAD = ["novo", "contatado", "negociacao", "vendido", "perdido"] as const;
export type StatusLead = (typeof STATUS_LEAD)[number];
export const ROTULO_STATUS_LEAD: Record<StatusLead, string> = {
  novo: "Novo", contatado: "Contatado", negociacao: "Em negociação", vendido: "Vendido", perdido: "Perdido",
};

export const ORIGENS_LEAD = ["veiculo", "contato", "venda_seu_carro", "landing_page"] as const;
export type OrigemLead = (typeof ORIGENS_LEAD)[number];
export const ROTULO_ORIGEM: Record<OrigemLead, string> = {
  veiculo: "Página do veículo", contato: "Contato", venda_seu_carro: "Venda seu carro", landing_page: "Landing page",
};

export const ESTILOS_LP = ["editorial", "luxo", "noturno", "tech", "moderno", "boutique"] as const;
export type EstiloLP = (typeof ESTILOS_LP)[number];
export const ROTULO_ESTILO_LP: Record<EstiloLP, string> = {
  editorial: "Editorial", luxo: "Luxo", noturno: "Noturno", tech: "Tech", moderno: "Moderno", boutique: "Boutique",
};
export const STATUS_LP = ["ativa", "rascunho"] as const;

/** Código do estoque exibido: 7 → "0007". */
export const codigoVeiculo = (codigo: number) => String(codigo).padStart(4, "0");

export const ROTULO_STATUS = { ativo: "À venda", pausado: "Pausado", vendido: "Vendido" } as const;

export type Cambio = (typeof CAMBIOS)[number];
export type Combustivel = (typeof COMBUSTIVEIS)[number];
export type Carroceria = (typeof CARROCERIAS)[number];
export type StatusAnuncio = (typeof STATUS_ANUNCIO)[number];

export const UFS = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA", "PB",
  "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
] as const;

export const OPCIONAIS = [
  "Ar-condicionado", "Direção elétrica", "Vidros elétricos", "Travas elétricas",
  "Banco de couro", "Piloto automático", "Central multimídia", "Apple CarPlay / Android Auto",
  "Câmera de ré", "Sensor de estacionamento", "Faróis de LED", "Teto solar",
  "Rodas de liga leve", "Airbag", "Freios ABS", "Controle de estabilidade",
  "Isofix", "Chave presencial", "Carregador por indução", "Engate",
] as const;

export const CORES = [
  "Branco", "Preto", "Prata", "Cinza", "Vermelho", "Azul", "Verde", "Marrom", "Bege", "Amarelo", "Laranja", "Dourado",
] as const;

export const ANO_MINIMO = 1950;
// Sempre calculado na hora: no Cloudflare Workers, `new Date()` no
// carregamento do módulo (fora de uma requisição) devolve 1970.
export const anoMaximo = () => new Date().getFullYear() + 1;

/** Anos do mais novo para o mais antigo. Chamar dentro de componente/loader, nunca no topo do módulo. */
export const listaAnos = (quantos?: number) => {
  const max = anoMaximo();
  const total = quantos ?? max - ANO_MINIMO + 1;
  return Array.from({ length: total }, (_, i) => max - i);
};
