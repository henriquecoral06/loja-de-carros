// Recorte tipado do schema. O Lovable regenera este arquivo por completo
// a partir do banco (supabase gen types typescript) — mantido aqui só
// para o projeto compilar antes da primeira geração.

export type VeiculoStatus = "rascunho" | "disponivel" | "reservado" | "vendido" | "oculto";
export type LeadStatus = "novo" | "em_atendimento" | "proposta" | "negociacao" | "vendido" | "perdido";
export type AppRole = "admin" | "vendedor";

export interface VeiculoPublico {
  id: string;
  slug: string;
  codigo_interno: string | null;
  marca: string;
  modelo: string;
  versao: string | null;
  marca_id: string;
  modelo_id: string;
  versao_id: string | null;
  ano_fabricacao: number;
  ano_modelo: number;
  km: number;
  cambio: string;
  combustivel: string;
  cor: string;
  cor_interna: string | null;
  carroceria: string;
  portas: number;
  motor: string | null;
  potencia_cv: number | null;
  blindado: boolean;
  pcd: boolean;
  preco: number;
  preco_promocional: number | null;
  preco_sob_consulta: boolean;
  preco_vigente: number;
  aceita_troca: boolean;
  aceita_financiamento: boolean;
  entrada_minima: number | null;
  valor_fipe: number | null;
  unico_dono: boolean;
  ipva_pago: boolean;
  licenciado: boolean;
  laudo_cautelar: boolean;
  manual_chave: boolean;
  garantia_fabrica: string | null;
  descricao: string | null;
  video_url: string | null;
  status: VeiculoStatus;
  destaque: boolean;
  ordem: number;
  entrada_estoque: string;
  meta_title: string | null;
  meta_description: string | null;
  foto_capa: string | null;
  created_at: string;
}

export interface Banner {
  id: string;
  url: string;
  alt: string;
  link: string | null;
  ordem: number;
  ativo: boolean;
}

export interface Config {
  id: boolean;
  nome: string;
  razao_social: string | null;
  cnpj: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
  latitude: number | null;
  longitude: number | null;
  logo_url: string | null;
  favicon_url: string | null;
  banner_url: string | null;
  cor_primaria: string;
  cor_primaria_fg: string;
  cor_destaque: string;
  texto_home: string | null;
  texto_sobre: string | null;
  horarios: { dia: string; abre?: string; fecha?: string; fechado?: boolean }[];
  redes_sociais: Record<string, string>;
  meta_title: string | null;
  meta_description: string | null;
  ga_measurement_id: string | null;
  meta_pixel_id: string | null;
}

export type Database = any;
