/** Listas fechadas usadas no schema, nos filtros e nos formulários. */

export const CAMBIOS = ["Manual", "Automático", "CVT", "Automatizado"] as const;
export const COMBUSTIVEIS = ["Flex", "Gasolina", "Etanol", "Diesel", "Híbrido", "Elétrico"] as const;
export const CARROCERIAS = ["Hatch", "Sedã", "SUV", "Picape", "Minivan", "Cupê", "Conversível", "Perua"] as const;
export const STATUS_ANUNCIO = ["ativo", "pausado", "vendido"] as const;

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
export const anoMaximo = () => new Date().getFullYear() + 1;
