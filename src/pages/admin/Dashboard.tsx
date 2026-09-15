import { useState } from "react";
import { Link } from "react-router-dom";
import { useDashboard } from "@/hooks/useAdmin";
import { useAuth } from "@/hooks/useAuth";
import { moeda } from "@/lib/utils";

function Tile({ rotulo, valor, apoio, tom }: { rotulo: string; valor: string; apoio?: string; tom?: "alerta" | "bom" }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{rotulo}</p>
      <p className={`mt-1 font-display text-2xl font-bold tabular-nums ${
        tom === "alerta" ? "text-destructive" : tom === "bom" ? "text-[hsl(var(--whatsapp))]" : ""}`}>
        {valor}
      </p>
      {apoio && <p className="mt-0.5 text-xs text-muted-foreground">{apoio}</p>}
    </div>
  );
}

export default function Dashboard() {
  const [dias, setDias] = useState(30);
  const { data: d, isLoading } = useDashboard(dias);
  const { isAdmin } = useAuth();

  if (isLoading || !d) return <div className="p-6 text-muted-foreground">Carregando…</div>;

  const variacao = d.leadsAnterior
    ? Math.round(((d.leadsTotal - d.leadsAnterior) / d.leadsAnterior) * 100)
    : null;

  const conversao = d.leadsTotal ? Math.round((d.leadsGanhos / d.leadsTotal) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">Dashboard</h1>
        <select value={dias} onChange={(e) => setDias(Number(e.target.value))}
          aria-label="Período" className="rounded-md border bg-background px-3 py-1.5 text-sm">
          <option value={7}>Últimos 7 dias</option>
          <option value={30}>Últimos 30 dias</option>
          <option value={90}>Últimos 90 dias</option>
        </select>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Estoque</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Tile rotulo="Disponíveis" valor={String(d.disponiveis)} />
          <Tile rotulo="Reservados" valor={String(d.reservados)} />
          <Tile rotulo="Vendidos" valor={String(d.vendidos)} apoio="no período todo" />
          <Tile rotulo="Parados +60 dias" valor={String(d.parados)}
            tom={d.parados > 0 ? "alerta" : undefined}
            apoio={`giro médio de ${d.giroMedio} dias`} />
        </div>
        {isAdmin && (
          <p className="mt-2 text-sm text-muted-foreground">
            Valor do estoque disponível: <b className="text-foreground">{moeda(d.valorEstoque)}</b>
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Leads</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Tile rotulo="Recebidos" valor={String(d.leadsTotal)}
            apoio={variacao === null ? "sem período anterior" : `${variacao >= 0 ? "+" : ""}${variacao}% vs. anterior`} />
          <Tile rotulo="Aguardando resposta" valor={String(d.leadsNovos)}
            tom={d.leadsNovos > 0 ? "alerta" : undefined} />
          <Tile rotulo="Tempo de 1ª resposta"
            valor={d.tempoMedioMin === null ? "—" : d.tempoMedioMin < 60 ? `${d.tempoMedioMin} min` : `${(d.tempoMedioMin / 60).toFixed(1)} h`}
            tom={d.tempoMedioMin !== null && d.tempoMedioMin > 15 ? "alerta" : "bom"}
            apoio="meta: até 15 min" />
          <Tile rotulo="Conversão em venda" valor={`${conversao}%`} apoio={`${d.leadsGanhos} de ${d.leadsTotal}`} />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <h2 className="text-sm font-semibold">Mais vistos no período</h2>
          {d.maisVistos.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Ainda sem visualizações registradas. Elas aparecem conforme o site recebe visitas.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {d.maisVistos.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-3 text-sm">
                  <Link to={`/admin/veiculos/${v.id}`} className="truncate hover:underline">
                    {v.id.slice(0, 8)}…
                  </Link>
                  <span className="whitespace-nowrap text-muted-foreground tabular-nums">
                    {v.views} visitas · {v.leads} leads
                    {v.views >= 20 && v.leads === 0 && (
                      <b className="ml-2 text-destructive">revisar preço/fotos</b>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h2 className="text-sm font-semibold">Origem dos leads</h2>
          <ul className="mt-3 space-y-2">
            {Object.entries(d.porOrigem).length === 0 && (
              <li className="text-sm text-muted-foreground">Nenhum lead no período.</li>
            )}
            {Object.entries(d.porOrigem).map(([origem, total]) => (
              <li key={origem} className="flex items-center gap-3 text-sm">
                <span className="w-24 capitalize">{origem}</span>
                <div className="h-2 flex-1 overflow-hidden rounded bg-muted">
                  <div className="h-full bg-primary"
                    style={{ width: `${Math.round((Number(total) / d.leadsTotal) * 100)}%` }} />
                </div>
                <span className="w-8 text-right tabular-nums text-muted-foreground">{String(total)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
