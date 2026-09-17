import { eq } from "drizzle-orm";
import { Download, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Form, Link, useFetcher } from "react-router";
import { buscarLeads, descreverOrigem } from "~/.server/consulta-leads";
import { db, schema } from "~/.server/db";
import { exigirUsuario } from "~/.server/sessao";
import { exigirMesmaOrigem } from "~/.server/seguranca";
import { Cabecalho, classeTabela as t, corStatusLead } from "~/components/admin/ui";
import { IconeWhatsApp } from "~/components/WhatsApp";
import { dataHora, linkWhatsApp, telefone } from "~/lib/formato";
import { metaAdmin } from "~/lib/site";
import { cn } from "~/lib/ui";
import { codigoVeiculo, ROTULO_ORIGEM, ROTULO_STATUS_LEAD, STATUS_LEAD, type StatusLead } from "~/lib/veiculos";
import type { Route } from "./+types/leads";

export function meta({ matches }: Route.MetaArgs) {
  return metaAdmin("Leads", matches);
}

export async function loader({ request }: Route.LoaderArgs) {
  await exigirUsuario(request);
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const status = url.searchParams.get("status") ?? "";
  const leads = await buscarLeads(q, status);
  return { leads: leads.map((l) => ({ ...l, origemCampanha: descreverOrigem(l.rastreio) })), filtros: { q, status } };
}

export async function action({ request }: Route.ActionArgs) {
  exigirMesmaOrigem(request);
  await exigirUsuario(request);
  const form = await request.formData();
  const id = String(form.get("id"));
  const intencao = form.get("intencao");

  if (intencao === "excluir") {
    await db.delete(schema.leads).where(eq(schema.leads.id, id));
  } else if (intencao === "status") {
    const status = String(form.get("status"));
    if ((STATUS_LEAD as readonly string[]).includes(status)) {
      await db.update(schema.leads).set({ status: status as StatusLead, atualizadoEm: Date.now() }).where(eq(schema.leads.id, id));
    }
  } else if (intencao === "notas") {
    await db.update(schema.leads).set({ notas: String(form.get("notas") ?? "").slice(0, 4000), atualizadoEm: Date.now() }).where(eq(schema.leads.id, id));
  }
  return { ok: true };
}

export default function Leads({ loaderData }: Route.ComponentProps) {
  const { leads, filtros } = loaderData;
  const csv = `/admin/leads.csv?${new URLSearchParams(Object.entries(filtros).filter(([, v]) => v))}`;

  return (
    <div>
      <Cabecalho titulo="Leads" descricao={`${leads.length} ${leads.length === 1 ? "contato" : "contatos"}${filtros.q || filtros.status ? " com os filtros" : " recebidos"}. O status e as anotações salvam sozinhos.`}>
        <a href={csv} className="botao h-10 border border-tinta bg-white px-4 text-sm text-tinta hover:bg-fundo" download>
          <Download className="size-4" aria-hidden="true" /> Exportar CSV
        </a>
      </Cabecalho>

      <Form method="get" role="search" className="flex flex-wrap gap-2">
        <div className="relative min-w-60 flex-1">
          <label htmlFor="q" className="sr-only">Buscar leads</label>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-fraco" aria-hidden="true" />
          <input id="q" name="q" type="search" defaultValue={filtros.q} placeholder="Buscar por nome, telefone, e-mail ou mensagem" className="campo h-11 pl-10" />
        </div>
        <label htmlFor="f-status" className="sr-only">Status</label>
        <select id="f-status" name="status" defaultValue={filtros.status} className="campo h-11 w-auto min-w-44">
          <option value="">Todos os status</option>
          {STATUS_LEAD.map((s) => <option key={s} value={s}>{ROTULO_STATUS_LEAD[s]}</option>)}
        </select>
        <button className="botao h-11 border border-tinta bg-white px-5 text-tinta hover:bg-fundo">Buscar</button>
      </Form>

      {leads.length === 0 ? (
        <div className="mt-4 rounded-xl border border-linha bg-white px-6 py-14 text-center">
          <h2 className="text-lg font-bold text-tinta">{filtros.q || filtros.status ? "Nenhum lead com esses filtros" : "Nenhum lead ainda"}</h2>
          <p className="mt-1 text-suave">Os contatos do site, das landing pages e do “Venda seu carro” aparecem aqui.</p>
          {(filtros.q || filtros.status) && <Link to="/admin/leads" className="botao-secundario mt-5">Limpar filtros</Link>}
        </div>
      ) : (
        <div className={cn(t.caixa, "mt-4")}>
          <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(260px,1fr)_110px] border-b border-linha bg-[#fafafa] lg:grid">
            {["Contato", "Veículo / mensagem", "Status e notas", ""].map((h, i) => <p key={i} className={cn(t.th, "border-0")}>{h}</p>)}
          </div>
          <ul>{leads.map((l) => <Linha key={l.id} l={l} />)}</ul>
        </div>
      )}
    </div>
  );
}

type Lead = Route.ComponentProps["loaderData"]["leads"][number];

function Linha({ l }: { l: Lead }) {
  const fetcher = useFetcher();
  const notas = useFetcher();
  const [texto, setTexto] = useState(l.notas);
  useEffect(() => setTexto(l.notas), [l.notas]);
  if (fetcher.formData?.get("intencao") === "excluir") return null;

  const status = (fetcher.formData?.get("intencao") === "status" ? fetcher.formData.get("status") : l.status) as StatusLead;
  const veiculo = l.codigo ? `${codigoVeiculo(l.codigo)} · ${l.marca} ${l.modelo} ${l.versao} ${l.anoModelo}` : null;
  const resposta = `Olá, ${l.nome.split(" ")[0]}! ${veiculo ? `Sobre o ${l.marca} ${l.modelo} ${l.anoModelo} que você viu no nosso site: ` : "Recebemos seu contato pelo site. "}`;
  const salvando = notas.state !== "idle";

  return (
    <li className="grid gap-4 border-b border-linha p-4 last:border-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(260px,1fr)_110px] lg:items-start lg:gap-0 lg:p-0">
      <div className="min-w-0 lg:px-4 lg:py-4">
        <p className="font-semibold text-tinta">{l.nome}</p>
        <p className="mt-0.5 break-words text-sm text-suave">
          <span className="numeros">{telefone(l.telefone)}</span>{l.email && <> · {l.email}</>}
        </p>
        <p className="numeros mt-1 text-xs text-fraco">{dataHora(l.criadoEm)}</p>
      </div>

      <div className="min-w-0 lg:px-4 lg:py-4">
        {veiculo && l.slug
          ? <a href={`/carro/${l.slug}`} target="_blank" rel="noopener" className="font-medium text-tinta hover:underline">{veiculo}</a>
          : <p className="font-medium text-suave">{ROTULO_ORIGEM[l.origem]}</p>}
        {l.texto && <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-suave">{l.texto}</p>}
        <p className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
          {veiculo && <span className="rounded bg-fundo px-1.5 py-0.5 text-texto">{ROTULO_ORIGEM[l.origem]}{l.landingPage && `: ${l.landingPage}`}</span>}
          {l.origemCampanha && <span className="rounded bg-fundo px-1.5 py-0.5 text-texto">{l.origemCampanha}</span>}
          {l.vendedor && <span className="rounded bg-fundo px-1.5 py-0.5 text-texto">Vendedor: {l.vendedor}</span>}
        </p>
      </div>

      <div className="grid gap-2 lg:px-4 lg:py-4">
        <fetcher.Form method="post">
          <input type="hidden" name="id" value={l.id} />
          <input type="hidden" name="intencao" value="status" />
          <label htmlFor={`status-${l.id}`} className="sr-only">Status de {l.nome}</label>
          <select id={`status-${l.id}`} name="status" value={status} onChange={(e) => fetcher.submit(e.currentTarget.form)}
            className={cn("h-9 w-full cursor-pointer rounded-lg border py-0 pl-3 pr-8 text-sm font-semibold", corStatusLead(status))}>
            {STATUS_LEAD.map((s) => <option key={s} value={s}>{ROTULO_STATUS_LEAD[s]}</option>)}
          </select>
        </fetcher.Form>
        <notas.Form method="post" className="relative">
          <input type="hidden" name="id" value={l.id} />
          <input type="hidden" name="intencao" value="notas" />
          <label htmlFor={`notas-${l.id}`} className="sr-only">Anotações sobre {l.nome}</label>
          <textarea id={`notas-${l.id}`} name="notas" rows={2} value={texto} onChange={(e) => setTexto(e.target.value)}
            onBlur={(e) => { if (texto !== l.notas) notas.submit(e.currentTarget.form); }}
            placeholder="Anotações internas (salva ao sair do campo)" className="campo min-h-16 text-sm" />
          <span aria-live="polite" className="absolute bottom-1.5 right-3 text-[11px] text-fraco">{salvando ? "Salvando…" : ""}</span>
        </notas.Form>
      </div>

      <div className="flex items-center gap-2 lg:flex-col lg:items-end lg:px-4 lg:py-4">
        <a href={linkWhatsApp(l.telefone, resposta)} target="_blank" rel="noopener noreferrer"
          onClick={() => { if (status === "novo") fetcher.submit({ id: l.id, intencao: "status", status: "contatado" }, { method: "post" }); }}
          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#128c4a] px-3 text-xs font-semibold text-white hover:bg-[#0f7a40]"
          title="Abrir conversa (lead novo passa para Contatado)">
          <IconeWhatsApp className="size-3.5" /> WhatsApp
        </a>
        <fetcher.Form method="post" onSubmit={(e) => { if (!confirm(`Excluir o lead de ${l.nome}?`)) e.preventDefault(); }}>
          <input type="hidden" name="id" value={l.id} />
          <button name="intencao" value="excluir" className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-erro hover:bg-erro-fundo">
            <Trash2 className="size-3.5" aria-hidden="true" /> Excluir
          </button>
        </fetcher.Form>
      </div>
    </li>
  );
}

export { ErroPainel as ErrorBoundary } from "~/components/admin/ErroPainel";
