import { useState } from "react";
import { Link } from "react-router-dom";
import { useDashboard } from "@/hooks/useAdmin";
import { useAuth } from "@/hooks/useAuth";
import { moeda } from "@/lib/utils";
import { Card, MetricCard, SegmentedControl, Table, type Coluna } from "@/components/ui";

type Vista = { id: string; views: number; leads: number };

export default function Dashboard() {
  const [dias, setDias] = useState<7 | 30 | 90>(30);
  const { data: d, isLoading } = useDashboard(dias);
  const { isAdmin } = useAuth();

  if (isLoading || !d) return <div className="p-6 text-body-sm text-mute">Carregando…</div>;

  // Sem janela anterior inteira o delta diz qualquer coisa: só existe
  // quando há um período anterior completo para comparar.
  const variacao = d.leadsAnterior > 0
    ? ((d.leadsTotal - d.leadsAnterior) / d.leadsAnterior) * 100
    : null;
  const comparacao = `vs. ${dias} dias anteriores`;
  const conversao = d.leadsTotal ? Math.round((d.leadsGanhos / d.leadsTotal) * 100) : 0;

  const colunas: Coluna<Vista>[] = [
    {
      key: "id", header: "Veículo", sortable: true,
      sortValue: (v) => v.id,
      render: (v) => <Link to={`/admin/veiculos/${v.id}`} className="ds-focus rounded-ds-xs font-medium text-ink hover:underline">{v.id.slice(0, 8)}…</Link>,
    },
    { key: "views", header: "Visitas", numeric: true, sortable: true, render: (v) => v.views.toLocaleString("pt-BR") },
    { key: "leads", header: "Leads", numeric: true, sortable: true, render: (v) => v.leads },
    {
      key: "sinal", header: "", align: "right",
      render: (v) => v.views >= 20 && v.leads === 0
        ? <span className="text-caption font-semibold text-danger-deep">revisar preço ou fotos</span>
        : <span className="text-faint">—</span>,
    },
  ];

  return (
    <div className="space-y-7 p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-heading-xl text-ink">Dashboard</h1>
        <SegmentedControl
          value={dias}
          onChange={(v) => setDias(v)}
          options={[{ value: 7, label: "7 dias" }, { value: 30, label: "30 dias" }, { value: 90, label: "90 dias" }]}
        />
      </div>

      <section>
        <p className="mb-2.5 text-eyebrow text-mute">Estoque</p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Disponíveis" value={String(d.disponiveis)}
            hint={isAdmin ? `${moeda(d.valorEstoque)} em estoque` : undefined} />
          <MetricCard label="Reservados" value={String(d.reservados)} />
          <MetricCard label="Vendidos" value={String(d.vendidos)} hint="no período todo" />
          {/* Cair é a boa notícia: dias parados sobe = ruim. */}
          <MetricCard label="Parados +60 dias" value={String(d.parados)}
            higherIsBetter={false} hint={`giro médio de ${d.giroMedio} dias`} />
        </div>
      </section>

      <section>
        <p className="mb-2.5 text-eyebrow text-mute">Leads</p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Recebidos" value={String(d.leadsTotal)}
            delta={variacao} comparison={variacao === null ? undefined : comparacao}
            hint={variacao === null ? "sem período anterior completo" : undefined} />
          <MetricCard label="Aguardando resposta" value={String(d.leadsNovos)}
            higherIsBetter={false}
            hint={d.leadsNovos > 0 ? "responda em até 15 min" : "nenhum na fila"} />
          <MetricCard
            label="Tempo de 1ª resposta"
            value={d.tempoMedioMin === null ? "—"
              : d.tempoMedioMin < 60 ? `${d.tempoMedioMin} min` : `${(d.tempoMedioMin / 60).toFixed(1)} h`}
            higherIsBetter={false}
            hint={d.tempoMedioMin === null ? "nenhum lead respondido" : "meta: até 15 min"} />
          <MetricCard label="Conversão em venda" value={`${conversao}%`}
            hint={`${d.leadsGanhos} de ${d.leadsTotal}`} />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="mb-2.5 text-eyebrow text-mute">Mais vistos no período</p>
          <Table
            columns={colunas}
            rows={d.maisVistos as Vista[]}
            rowKey={(v) => v.id}
            defaultSort={{ key: "views", dir: "desc" }}
            empty="Sem visualizações registradas. Elas aparecem conforme o site recebe visitas."
          />
        </div>

        <div>
          <p className="mb-2.5 text-eyebrow text-mute">Origem dos leads</p>
          <Card className="p-4">
            {Object.entries(d.porOrigem).length === 0 ? (
              <p className="py-6 text-center text-body-sm text-faint">Nenhum lead no período.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {Object.entries(d.porOrigem).map(([origem, total], i) => (
                  <li key={origem} className="flex items-center gap-3 text-body-sm">
                    <span className="w-24 shrink-0 capitalize text-body">{origem}</span>
                    {/* Marca com teto de 24px; o resto do slot é ar. */}
                    <div className="h-6 flex-1">
                      <div className="h-full max-h-6 rounded-ds-xs"
                        style={{
                          width: `${Math.max(3, Math.round((Number(total) / d.leadsTotal) * 100))}%`,
                          backgroundColor: `var(--chart-${(i % 3) + 1})`,
                        }} />
                    </div>
                    <span className="w-8 shrink-0 text-right tabular-nums text-mute">{String(total)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </section>
    </div>
  );
}
