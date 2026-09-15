import { useState } from "react";
import { Link } from "react-router-dom";
import { Archive, Eye, PencilSimple, Plus } from "@phosphor-icons/react";
import { useVeiculosAdmin, useArquivarVeiculo, useSalvarVeiculo } from "@/hooks/useAdmin";
import { useAuth } from "@/hooks/useAuth";
import { moeda, numero } from "@/lib/utils";
import { Badge, Button, Input, Select, Table, type Coluna } from "@/components/ui";

const STATUS = [
  { valor: "rascunho", rotulo: "Rascunho" },
  { valor: "disponivel", rotulo: "Disponível" },
  { valor: "reservado", rotulo: "Reservado" },
  { valor: "vendido", rotulo: "Vendido" },
  { valor: "oculto", rotulo: "Oculto" },
];

export default function Veiculos() {
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("");
  const { data: veiculos, isLoading } = useVeiculosAdmin({ busca, status });
  const arquivar = useArquivarVeiculo();
  const salvar = useSalvarVeiculo();
  const { isAdmin } = useAuth();

  const colunas: Coluna<any>[] = [
    {
      key: "veiculo", header: "Veículo", sortable: true,
      sortValue: (v) => `${v.marca} ${v.modelo}`,
      render: (v) => (
        <div>
          <p className="font-medium text-ink">{[v.marca, v.modelo, v.versao].filter(Boolean).join(" ")}</p>
          <p className="text-caption text-faint">
            {v.ano_fabricacao}/{v.ano_modelo} · {numero(v.km)} km{v.codigo_interno && ` · ${v.codigo_interno}`}
          </p>
        </div>
      ),
    },
    { key: "preco", header: "Preço", numeric: true, sortable: true, sortValue: (v) => Number(v.preco), render: (v) => moeda(v.preco) },
    ...(isAdmin ? [{
      key: "margem", header: "Margem", numeric: true, sortable: true,
      sortValue: (v: any) => Number(v.margem ?? 0),
      // Zero vira travessão: coluna repetindo R$ 0 linha após linha é ruído.
      render: (v: any) => v.margem ? <span className="text-body">{moeda(v.margem)}</span> : <span className="text-faint">—</span>,
    } as Coluna<any>] : []),
    {
      key: "dias_parado", header: "Parado", numeric: true, sortable: true,
      sortValue: (v) => v.dias_parado ?? 0,
      render: (v) => v.dias_parado > 60
        ? <Badge tone="danger">{v.dias_parado} d</Badge>
        : <span className="text-mute">{v.dias_parado} d</span>,
    },
    {
      key: "status", header: "Status",
      render: (v) => (
        <Select value={v.status} aria-label="Alterar status" className="h-8 w-[130px] text-label-md"
          onChange={(e) => salvar.mutate({ id: v.id, dados: { status: e.target.value } })}>
          {STATUS.map((s) => <option key={s.valor} value={s.valor}>{s.rotulo}</option>)}
        </Select>
      ),
    },
    {
      key: "acoes", header: "", align: "right",
      render: (v) => (
        <div className="flex justify-end gap-0.5">
          {v.slug && (
            <a href={`/carros/${v.slug}`} target="_blank" rel="noreferrer" title="Ver no site"
              className="ds-focus rounded-ds-sm p-2 text-mute transition-colors hover:bg-ink/[0.05] hover:text-ink">
              <Eye size={16} />
            </a>
          )}
          <Link to={`/admin/veiculos/${v.id}`} title="Editar"
            className="ds-focus rounded-ds-sm p-2 text-mute transition-colors hover:bg-ink/[0.05] hover:text-ink">
            <PencilSimple size={16} />
          </Link>
          {isAdmin && (
            <button title="Arquivar"
              className="ds-focus rounded-ds-sm p-2 text-mute transition-colors hover:bg-ink/[0.05] hover:text-ink"
              onClick={() => confirm("Arquivar este veículo? Ele sai do site, mas o histórico e os leads são preservados.")
                && arquivar.mutate(v.id)}>
              <Archive size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5 p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-heading-xl text-ink">Estoque</h1>
        <Link to="/admin/veiculos/novo">
          <Button icon={<Plus size={14} weight="bold" />}>Cadastrar veículo</Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2.5">
        <Input value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar"
          placeholder="Buscar por marca, modelo ou código" className="min-w-[240px] flex-1" />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status" className="w-[180px]">
          <option value="">Todos os status</option>
          {STATUS.map((s) => <option key={s.valor} value={s.valor}>{s.rotulo}</option>)}
        </Select>
      </div>

      {isLoading ? (
        <p className="text-body-sm text-mute">Carregando…</p>
      ) : (
        <Table
          columns={colunas}
          rows={veiculos ?? []}
          rowKey={(v: any) => v.id}
          empty={
            <span>
              Nenhum veículo por aqui.{" "}
              <Link to="/admin/veiculos/novo" className="font-semibold text-ink hover:underline">Cadastre o primeiro.</Link>
            </span>
          }
        />
      )}
    </div>
  );
}
