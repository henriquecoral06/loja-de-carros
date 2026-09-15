import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Archive, Eye } from "lucide-react";
import { useVeiculosAdmin, useArquivarVeiculo, useSalvarVeiculo } from "@/hooks/useAdmin";
import { useAuth } from "@/hooks/useAuth";
import { moeda, numero } from "@/lib/utils";

const STATUS = [
  { valor: "rascunho", rotulo: "Rascunho", cor: "bg-muted text-muted-foreground" },
  { valor: "disponivel", rotulo: "Disponível", cor: "bg-[hsl(var(--whatsapp))] text-white" },
  { valor: "reservado", rotulo: "Reservado", cor: "bg-amber-500 text-white" },
  { valor: "vendido", rotulo: "Vendido", cor: "bg-slate-600 text-white" },
  { valor: "oculto", rotulo: "Oculto", cor: "bg-muted text-muted-foreground" },
];

export default function Veiculos() {
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("");
  const { data: veiculos, isLoading } = useVeiculosAdmin({ busca, status });
  const arquivar = useArquivarVeiculo();
  const salvar = useSalvarVeiculo();
  const { isAdmin } = useAuth();

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">Estoque</h1>
        <Link to="/admin/veiculos/novo"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          <Plus className="h-4 w-4" /> Cadastrar veículo
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <input value={busca} onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por marca, modelo ou código" aria-label="Buscar"
          className="min-w-[220px] flex-1 rounded-md border bg-background px-3 py-2 text-sm" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status"
          className="rounded-md border bg-background px-3 py-2 text-sm">
          <option value="">Todos os status</option>
          {STATUS.map((s) => <option key={s.valor} value={s.valor}>{s.rotulo}</option>)}
        </select>
      </div>

      {isLoading ? (
        <p className="mt-8 text-muted-foreground">Carregando…</p>
      ) : !veiculos?.length ? (
        <div className="mt-8 rounded-lg border border-dashed p-12 text-center">
          <p className="font-display font-semibold">Nenhum veículo por aqui.</p>
          <Link to="/admin/veiculos/novo" className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            Cadastrar o primeiro
          </Link>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border bg-card">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="p-3">Veículo</th>
                <th className="p-3">Preço</th>
                {isAdmin && <th className="p-3">Margem</th>}
                <th className="p-3">Parado</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {veiculos.map((v: any) => (
                <tr key={v.id} className="border-b last:border-0">
                  <td className="p-3">
                    <p className="font-medium">{[v.marca, v.modelo, v.versao].filter(Boolean).join(" ")}</p>
                    <p className="text-xs text-muted-foreground">
                      {v.ano_fabricacao}/{v.ano_modelo} · {numero(v.km)} km
                      {v.codigo_interno && ` · ${v.codigo_interno}`}
                    </p>
                  </td>
                  <td className="p-3 tabular-nums">{moeda(v.preco)}</td>
                  {isAdmin && (
                    <td className="p-3 tabular-nums text-muted-foreground">
                      {v.margem != null ? moeda(v.margem) : "—"}
                    </td>
                  )}
                  <td className={`p-3 tabular-nums ${v.dias_parado > 60 ? "font-semibold text-destructive" : "text-muted-foreground"}`}>
                    {v.dias_parado} d
                  </td>
                  <td className="p-3">
                    <select value={v.status}
                      onChange={(e) => salvar.mutate({ id: v.id, dados: { status: e.target.value } })}
                      aria-label="Alterar status"
                      className="rounded-md border bg-background px-2 py-1 text-xs">
                      {STATUS.map((s) => <option key={s.valor} value={s.valor}>{s.rotulo}</option>)}
                    </select>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      {v.slug && (
                        <a href={`/carros/${v.slug}`} target="_blank" rel="noreferrer"
                          title="Ver no site" className="rounded p-2 hover:bg-muted">
                          <Eye className="h-4 w-4" />
                        </a>
                      )}
                      <Link to={`/admin/veiculos/${v.id}`} title="Editar" className="rounded p-2 hover:bg-muted">
                        <Pencil className="h-4 w-4" />
                      </Link>
                      {isAdmin && (
                        <button title="Arquivar" className="rounded p-2 hover:bg-muted"
                          onClick={() => confirm("Arquivar este veículo? Ele sai do site, mas o histórico e os leads são preservados.")
                            && arquivar.mutate(v.id)}>
                          <Archive className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
