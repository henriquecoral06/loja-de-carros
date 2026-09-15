import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/** Vendedor não tem SELECT na tabela veiculos: lê sempre pela view do papel. */
export function useVeiculosAdmin(filtro?: { status?: string; busca?: string }) {
  const { isAdmin } = useAuth();
  return useQuery({
    queryKey: ["admin-veiculos", isAdmin, filtro],
    queryFn: async () => {
      let q = supabase
        .from(isAdmin ? "veiculos_admin" : "veiculos_vendedor")
        .select("*")
        .order("ordem")
        .order("created_at", { ascending: false });
      if (filtro?.status) q = q.eq("status", filtro.status);
      if (filtro?.busca) {
        const t = `%${filtro.busca}%`;
        q = q.or(`marca.ilike.${t},modelo.ilike.${t},codigo_interno.ilike.${t}`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useVeiculoAdmin(id?: string) {
  const { isAdmin } = useAuth();
  return useQuery({
    queryKey: ["admin-veiculo", id, isAdmin],
    enabled: Boolean(id) && id !== "novo",
    queryFn: async () => {
      const { data, error } = await supabase
        .from(isAdmin ? "veiculos_admin" : "veiculos_vendedor")
        .select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useSalvarVeiculo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dados }: { id?: string; dados: Record<string, any> }) => {
      if (id) {
        // Sem .select(): vendedor não tem permissão de leitura na tabela,
        // e pedir o retorno faria o update falhar por RLS.
        const { error } = await supabase.from("veiculos").update(dados).eq("id", id);
        if (error) throw error;
        return id;
      }
      const { data, error } = await supabase.from("veiculos").insert(dados).select("id").single();
      if (error) throw error;
      return (data as any).id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-veiculos"] });
      qc.invalidateQueries({ queryKey: ["veiculos"] });
      qc.invalidateQueries({ queryKey: ["filtros-disponiveis"] });
    },
  });
}

/** Exclusão lógica: preserva histórico e os leads apontados para o veículo. */
export function useArquivarVeiculo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("veiculos")
        .update({ deleted_at: new Date().toISOString(), status: "oculto" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-veiculos"] });
      qc.invalidateQueries({ queryKey: ["veiculos"] });
    },
  });
}

export function useBaseFipe() {
  return useQuery({
    queryKey: ["base-fipe"],
    staleTime: Infinity,
    queryFn: async () => {
      const [marcas, modelos, versoes] = await Promise.all([
        supabase.from("marcas").select("id, nome").order("nome"),
        supabase.from("modelos").select("id, nome, marca_id").order("nome"),
        supabase.from("versoes").select("id, nome, modelo_id, combustivel").order("nome"),
      ]);
      return {
        marcas: marcas.data ?? [],
        modelos: modelos.data ?? [],
        versoes: versoes.data ?? [],
      };
    },
  });
}

export function useOpcionais() {
  return useQuery({
    queryKey: ["opcionais"],
    staleTime: Infinity,
    queryFn: async () => {
      const { data } = await supabase.from("opcionais").select("*").order("ordem");
      return data ?? [];
    },
  });
}

export function useOpcionaisDoVeiculo(veiculoId?: string) {
  return useQuery({
    queryKey: ["veiculo-opcionais", veiculoId],
    enabled: Boolean(veiculoId) && veiculoId !== "novo",
    queryFn: async () => {
      const { data } = await supabase
        .from("veiculo_opcionais").select("opcional_id").eq("veiculo_id", veiculoId);
      return (data ?? []).map((o: any) => o.opcional_id as string);
    },
  });
}

export function useLeads() {
  return useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*, veiculos:veiculo_id (slug, versao_id)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAtualizarLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dados }: { id: string; dados: Record<string, any> }) => {
      const { error } = await supabase.from("leads").update(dados).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });
}

export function useInteracoes(leadId?: string) {
  return useQuery({
    queryKey: ["interacoes", leadId],
    enabled: Boolean(leadId),
    queryFn: async () => {
      const { data } = await supabase
        .from("lead_interacoes").select("*").eq("lead_id", leadId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });
}

export function useRegistrarInteracao() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ leadId, texto, canal }: { leadId: string; texto: string; canal?: string }) => {
      const { error } = await supabase.from("lead_interacoes").insert({
        lead_id: leadId, usuario_id: user?.id, texto, canal: canal ?? "nota",
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["interacoes", v.leadId] });
      qc.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

export function useDashboard(dias = 30) {
  const { isAdmin } = useAuth();
  return useQuery({
    queryKey: ["dashboard", dias, isAdmin],
    queryFn: async () => {
      const desde = new Date(Date.now() - dias * 86400000).toISOString();
      const anterior = new Date(Date.now() - dias * 2 * 86400000).toISOString();

      const [veiculos, leads, leadsAnterior, visualizacoes] = await Promise.all([
        supabase.from(isAdmin ? "veiculos_admin" : "veiculos_vendedor").select("status, dias_parado, preco"),
        supabase.from("leads").select("id, status, created_at, veiculo_id, primeira_resposta_em, origem").gte("created_at", desde),
        supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", anterior).lt("created_at", desde),
        supabase.from("visualizacoes").select("veiculo_id, total").gte("dia", desde.slice(0, 10)),
      ]);

      const lista = (veiculos.data ?? []) as any[];
      const porStatus = (s: string) => lista.filter((v) => v.status === s).length;
      const leadsLista = (leads.data ?? []) as any[];

      const respondidos = leadsLista.filter((l) => l.primeira_resposta_em);
      const tempoMedioMin = respondidos.length
        ? Math.round(respondidos.reduce((acc, l) =>
            acc + (new Date(l.primeira_resposta_em).getTime() - new Date(l.created_at).getTime()) / 60000, 0) / respondidos.length)
        : null;

      const viewsPorVeiculo = (visualizacoes.data ?? []).reduce((acc: Record<string, number>, v: any) => {
        acc[v.veiculo_id] = (acc[v.veiculo_id] ?? 0) + v.total;
        return acc;
      }, {});

      const leadsPorVeiculo = leadsLista.reduce((acc: Record<string, number>, l) => {
        if (l.veiculo_id) acc[l.veiculo_id] = (acc[l.veiculo_id] ?? 0) + 1;
        return acc;
      }, {});

      return {
        disponiveis: porStatus("disponivel"),
        reservados: porStatus("reservado"),
        vendidos: porStatus("vendido"),
        rascunhos: porStatus("rascunho"),
        totalEstoque: lista.filter((v) => v.status !== "vendido").length,
        valorEstoque: lista.filter((v) => v.status === "disponivel")
          .reduce((a, v) => a + Number(v.preco ?? 0), 0),
        parados: lista.filter((v) => v.status === "disponivel" && (v.dias_parado ?? 0) > 60).length,
        giroMedio: lista.length
          ? Math.round(lista.reduce((a, v) => a + (v.dias_parado ?? 0), 0) / lista.length) : 0,
        leadsTotal: leadsLista.length,
        leadsAnterior: leadsAnterior.count ?? 0,
        leadsNovos: leadsLista.filter((l) => l.status === "novo").length,
        leadsGanhos: leadsLista.filter((l) => l.status === "vendido").length,
        tempoMedioMin,
        maisVistos: Object.entries(viewsPorVeiculo)
          .map(([id, views]) => ({ id, views, leads: leadsPorVeiculo[id] ?? 0 }))
          .sort((a, b) => b.views - a.views).slice(0, 5),
        porOrigem: leadsLista.reduce((acc: Record<string, number>, l) => {
          const k = l.origem ?? "direto";
          acc[k] = (acc[k] ?? 0) + 1;
          return acc;
        }, {}),
      };
    },
  });
}
