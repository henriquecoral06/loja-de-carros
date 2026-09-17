import { and, count, desc, eq, gte } from "drizzle-orm";
import { Inbox, LayoutTemplate, Plus, Settings } from "lucide-react";
import { Link } from "react-router";
import { db, schema } from "~/.server/db";
import { exigirUsuario } from "~/.server/sessao";
import { Cabecalho, classeTabela as t, PillLead } from "~/components/admin/ui";
import { dataHora, telefone } from "~/lib/formato";
import { metaAdmin } from "~/lib/site";
import { cn } from "~/lib/ui";
import { codigoVeiculo, ROTULO_ORIGEM } from "~/lib/veiculos";
import type { Route } from "./+types/dashboard";

export function meta({ matches }: Route.MetaArgs) {
  return metaAdmin("Dashboard", matches);
}

export async function loader({ request }: Route.LoaderArgs) {
  await exigirUsuario(request);
  const { leads, anuncios, landingPages, marcas, modelos } = schema;
  const trintaDias = Date.now() - 30 * 86_400_000;

  const [[novos], [ultimos30], veiculosPorStatus, lpsPorStatus, recentes] = await Promise.all([
    db.select({ n: count() }).from(leads).where(eq(leads.status, "novo")),
    db.select({ n: count() }).from(leads).where(gte(leads.criadoEm, trintaDias)),
    db.select({ status: anuncios.status, n: count() }).from(anuncios).groupBy(anuncios.status),
    db.select({ status: landingPages.status, n: count() }).from(landingPages).groupBy(landingPages.status),
    db.select({
      id: leads.id, nome: leads.nome, telefone: leads.telefone, email: leads.email, status: leads.status, origem: leads.origem, criadoEm: leads.criadoEm,
      codigo: anuncios.codigo, marca: marcas.nome, modelo: modelos.nome, anoModelo: anuncios.anoModelo,
    }).from(leads)
      .leftJoin(anuncios, eq(anuncios.id, leads.anuncioId))
      .leftJoin(marcas, eq(marcas.id, anuncios.marcaId))
      .leftJoin(modelos, eq(modelos.id, anuncios.modeloId))
      .orderBy(desc(leads.criadoEm)).limit(6),
  ]);

  const soma = (l: { n: number }[]) => l.reduce((s, x) => s + x.n, 0);
  const de = <T extends string>(l: { status: T; n: number }[], s: T) => l.find((x) => x.status === s)?.n ?? 0;
  return {
    novos: novos.n, ultimos30: ultimos30.n,
    veiculos: { ativos: de(veiculosPorStatus, "ativo"), total: soma(veiculosPorStatus), pausados: de(veiculosPorStatus, "pausado") },
    lps: { ativas: de(lpsPorStatus, "ativa"), total: soma(lpsPorStatus) },
    recentes,
  };
}

export default function Dashboard({ loaderData: d }: Route.ComponentProps) {
  const cards = [
    { rotulo: "Leads novos", valor: d.novos, detalhe: "Aguardando contato", destaque: d.novos > 0, to: "/admin/leads?status=novo" },
    { rotulo: "Leads nos últimos 30 dias", valor: d.ultimos30, detalhe: "Todas as origens", to: "/admin/leads" },
    { rotulo: "Veículos à venda", valor: d.veiculos.ativos, detalhe: `${d.veiculos.total} no total · ${d.veiculos.pausados} pausados`, to: "/admin/veiculos" },
    { rotulo: "Landing pages ativas", valor: d.lps.ativas, detalhe: `${d.lps.total} no total`, to: "/admin/landing-pages" },
  ];
  const atalhos = [
    { to: "/admin/veiculos/novo", titulo: "Cadastrar veículo", texto: "Dados, fotos e opcionais", icone: Plus },
    { to: "/admin/landing-pages/nova", titulo: "Nova landing page", texto: "Página de campanha em 3 passos", icone: LayoutTemplate },
    { to: "/admin/leads?status=novo", titulo: "Responder leads novos", texto: d.novos === 1 ? "1 aguardando contato" : `${d.novos} aguardando contato`, icone: Inbox },
    { to: "/admin/configuracoes", titulo: "Configurar o site", texto: "Logo, cores, contatos e banner", icone: Settings },
  ];

  return (
    <div>
      <Cabecalho titulo="Dashboard" descricao="Visão geral do estoque e dos contatos recebidos.">
        <Link to="/admin/veiculos/novo" className="botao-primario h-10 px-4 text-sm"><Plus className="size-4" aria-hidden="true" /> Novo veículo</Link>
      </Cabecalho>

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <li key={c.rotulo}>
            <Link to={c.to} className={cn("block h-full rounded-xl border p-5 transition-shadow hover:shadow-card-hover",
              c.destaque ? "border-marca-200 bg-marca-50" : "border-linha bg-white")}>
              <p className="text-sm text-suave">{c.rotulo}</p>
              <p className="numeros mt-2 text-3xl font-bold text-tinta">{c.valor}</p>
              <p className="mt-1 text-xs text-suave">{c.detalhe}</p>
            </Link>
          </li>
        ))}
      </ul>

      <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {atalhos.map(({ to, titulo, texto, icone: Icone }) => (
          <li key={to}>
            <Link to={to} className="flex h-full items-center gap-3 rounded-xl border border-linha bg-white p-4 transition-colors hover:border-linha-forte">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-marca-50 text-marca-700"><Icone className="size-5" aria-hidden="true" /></span>
              <span className="min-w-0">
                <span className="block font-semibold text-tinta">{titulo}</span>
                <span className="block truncate text-sm text-suave">{texto}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mb-3 mt-10 flex items-center justify-between">
        <h2 className="text-lg font-bold text-tinta">Últimos leads</h2>
        <Link to="/admin/leads" className="py-1 text-sm font-semibold text-tinta hover:underline">Ver todos</Link>
      </div>
      {d.recentes.length === 0 ? (
        <p className="rounded-xl border border-linha bg-white p-8 text-center text-suave">Nenhum lead ainda. Os contatos do site aparecem aqui.</p>
      ) : (
        <div className={cn(t.caixa, "overflow-x-auto")}>
          <table className="w-full min-w-[720px]">
            <thead><tr>{["Nome", "Contato", "Veículo", "Status", "Data"].map((h) => <th key={h} className={t.th}>{h}</th>)}</tr></thead>
            <tbody>
              {d.recentes.map((l) => (
                <tr key={l.id}>
                  <td className={cn(t.td, "font-medium text-tinta")}><Link to={`/admin/leads?q=${encodeURIComponent(l.nome)}`} className="hover:underline">{l.nome}</Link></td>
                  <td className={cn(t.td, "text-suave")}>{telefone(l.telefone)}{l.email && ` · ${l.email}`}</td>
                  <td className={cn(t.td, "max-w-[320px] truncate text-suave")}>
                    {l.codigo ? `${codigoVeiculo(l.codigo)} · ${l.marca} ${l.modelo} ${l.anoModelo}` : ROTULO_ORIGEM[l.origem]}
                  </td>
                  <td className={t.td}><PillLead status={l.status} /></td>
                  <td className={cn(t.td, "numeros whitespace-nowrap text-suave")}>{dataHora(l.criadoEm)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export { ErroPainel as ErrorBoundary } from "~/components/admin/ErroPainel";
