import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { VeiculoPublico } from "@/integrations/supabase/types";

export interface Filtros {
  busca?: string;
  marca_id?: string;
  modelo_id?: string;
  preco_max?: number;
  preco_min?: number;
  ano_min?: number;
  km_max?: number;
  cambio?: string;
  combustivel?: string;
  carroceria?: string;
  cor?: string;
  ordenacao?: "recentes" | "preco_asc" | "preco_desc" | "km_asc" | "ano_desc";
  pagina?: number;
}

export const POR_PAGINA = 12;

/**
 * Listagem do estoque. Todos os filtros viajam na URL (ver Estoque.tsx),
 * então o vendedor consegue mandar uma busca pronta pelo WhatsApp e o
 * Google consegue indexar a combinação.
 */
export function useVeiculos(filtros: Filtros) {
  return useQuery({
    queryKey: ["veiculos", filtros],
    queryFn: async () => {
      const pagina = filtros.pagina ?? 1;
      let q = supabase
        .from("veiculos_publicos")
        .select("*", { count: "exact" })
        .neq("status", "vendido");

      if (filtros.busca) {
        const termo = `%${filtros.busca}%`;
        q = q.or(`marca.ilike.${termo},modelo.ilike.${termo},versao.ilike.${termo}`);
      }
      if (filtros.marca_id) q = q.eq("marca_id", filtros.marca_id);
      if (filtros.modelo_id) q = q.eq("modelo_id", filtros.modelo_id);
      if (filtros.preco_min) q = q.gte("preco_vigente", filtros.preco_min);
      if (filtros.preco_max) q = q.lte("preco_vigente", filtros.preco_max);
      if (filtros.ano_min) q = q.gte("ano_modelo", filtros.ano_min);
      if (filtros.km_max) q = q.lte("km", filtros.km_max);
      if (filtros.cambio) q = q.eq("cambio", filtros.cambio);
      if (filtros.combustivel) q = q.eq("combustivel", filtros.combustivel);
      if (filtros.carroceria) q = q.eq("carroceria", filtros.carroceria);
      if (filtros.cor) q = q.eq("cor", filtros.cor);

      switch (filtros.ordenacao) {
        case "preco_asc":  q = q.order("preco_vigente", { ascending: true }); break;
        case "preco_desc": q = q.order("preco_vigente", { ascending: false }); break;
        case "km_asc":     q = q.order("km", { ascending: true }); break;
        case "ano_desc":   q = q.order("ano_modelo", { ascending: false }); break;
        default:
          q = q.order("destaque", { ascending: false }).order("ordem").order("created_at", { ascending: false });
      }

      const de = (pagina - 1) * POR_PAGINA;
      const { data, error, count } = await q.range(de, de + POR_PAGINA - 1);
      if (error) throw error;
      return { veiculos: (data ?? []) as VeiculoPublico[], total: count ?? 0 };
    },
  });
}

export function useVeiculo(slug?: string) {
  return useQuery({
    queryKey: ["veiculo", slug],
    enabled: Boolean(slug),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("veiculos_publicos").select("*").eq("slug", slug).maybeSingle();
      if (error) throw error;
      if (data) supabase.rpc("registrar_visualizacao", { _veiculo_id: (data as VeiculoPublico).id });
      return data as VeiculoPublico | null;
    },
  });
}

export function useFotos(veiculoId?: string) {
  return useQuery({
    queryKey: ["fotos", veiculoId],
    enabled: Boolean(veiculoId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("veiculo_fotos").select("url, ordem, capa")
        .eq("veiculo_id", veiculoId).order("capa", { ascending: false }).order("ordem");
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Marcas e modelos presentes no estoque — não a base FIPE inteira. */
export function useFiltrosDisponiveis() {
  return useQuery({
    queryKey: ["filtros-disponiveis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("veiculos_publicos")
        .select("marca, marca_id, modelo, modelo_id, cambio, combustivel, carroceria, cor, preco_vigente")
        .neq("status", "vendido");
      if (error) throw error;
      const lista = data ?? [];
      const unicos = <T,>(arr: T[]) => Array.from(new Set(arr.filter(Boolean)));
      return {
        marcas: Array.from(new Map(lista.map((v: any) => [v.marca_id, v.marca])).entries())
          .map(([id, nome]) => ({ id, nome: nome as string }))
          .sort((a, b) => a.nome.localeCompare(b.nome)),
        modelosPorMarca: lista.reduce((acc: Record<string, { id: string; nome: string }[]>, v: any) => {
          const atual = acc[v.marca_id] ?? [];
          if (!atual.some((m) => m.id === v.modelo_id)) atual.push({ id: v.modelo_id, nome: v.modelo });
          acc[v.marca_id] = atual;
          return acc;
        }, {}),
        cambios: unicos(lista.map((v: any) => v.cambio)),
        combustiveis: unicos(lista.map((v: any) => v.combustivel)),
        carrocerias: unicos(lista.map((v: any) => v.carroceria)),
        cores: unicos(lista.map((v: any) => v.cor)),
        precoMax: Math.max(0, ...lista.map((v: any) => Number(v.preco_vigente) || 0)),
      };
    },
    staleTime: 1000 * 60 * 5,
  });
}
