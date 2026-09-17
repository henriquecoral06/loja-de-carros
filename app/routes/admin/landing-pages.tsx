import { waitUntil } from "cloudflare:workers";
import { desc, eq } from "drizzle-orm";
import { Check, CopyPlus, ExternalLink, Link2, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, redirect, useFetcher } from "react-router";
import { db, schema } from "~/.server/db";
import { arquivosDaLP, removerArquivosSemUso } from "~/.server/landing";
import { exigirUsuario } from "~/.server/sessao";
import { exigirMesmaOrigem } from "~/.server/seguranca";
import { Cabecalho, classeTabela as t } from "~/components/admin/ui";
import { data as formatarData } from "~/lib/formato";
import { metaAdmin } from "~/lib/site";
import { cn } from "~/lib/ui";
import { codigoVeiculo, ROTULO_ESTILO_LP } from "~/lib/veiculos";
import type { Route } from "./+types/landing-pages";

export function meta({ matches }: Route.MetaArgs) {
  return metaAdmin("Landing Pages", matches);
}

export async function loader({ request }: Route.LoaderArgs) {
  await exigirUsuario(request);
  const { landingPages: lp, anuncios, marcas, modelos } = schema;
  const lista = await db.select({
    id: lp.id, slug: lp.slug, titulo: lp.titulo, estilo: lp.estilo, status: lp.status, visitas: lp.visitas, atualizadoEm: lp.atualizadoEm,
    codigo: anuncios.codigo, marca: marcas.nome, modelo: modelos.nome, versao: anuncios.versao, anoModelo: anuncios.anoModelo, statusVeiculo: anuncios.status,
  }).from(lp)
    .innerJoin(anuncios, eq(anuncios.id, lp.anuncioId))
    .innerJoin(marcas, eq(marcas.id, anuncios.marcaId))
    .innerJoin(modelos, eq(modelos.id, anuncios.modeloId))
    .orderBy(desc(lp.atualizadoEm));
  return { lista, origem: new URL(request.url).origin };
}

export async function action({ request }: Route.ActionArgs) {
  exigirMesmaOrigem(request);
  await exigirUsuario(request);
  const form = await request.formData();
  const id = String(form.get("id"));
  const [atual] = await db.select().from(schema.landingPages).where(eq(schema.landingPages.id, id)).limit(1);
  if (!atual) return { ok: false };

  if (form.get("intencao") === "excluir") {
    await db.delete(schema.landingPages).where(eq(schema.landingPages.id, id));
    waitUntil(removerArquivosSemUso(arquivosDaLP(atual), id));
    return { ok: true };
  }
  if (form.get("intencao") === "duplicar") {
    const novoId = crypto.randomUUID();
    const agora = Date.now();
    await db.insert(schema.landingPages).values({
      ...atual, id: novoId, slug: `${atual.slug.slice(0, 60)}-copia-${novoId.slice(0, 4)}`, titulo: `${atual.titulo} (cópia)`,
      status: "rascunho", visitas: 0, criadoEm: agora, atualizadoEm: agora,
    });
    throw redirect(`/admin/landing-pages/${novoId}`);
  }
  return { ok: false };
}

export default function LandingPages({ loaderData }: Route.ComponentProps) {
  const { lista, origem } = loaderData;
  return (
    <div>
      <Cabecalho titulo="Landing Pages" descricao="Páginas de campanha por veículo, com 8 estilos e seções que você escolhe e reordena.">
        <Link to="/admin/landing-pages/nova" className="botao-primario h-10 px-4 text-sm"><Plus className="size-4" aria-hidden="true" /> Nova landing page</Link>
      </Cabecalho>

      {lista.length === 0 ? (
        <div className="rounded-xl border border-linha bg-white px-6 py-14 text-center">
          <h2 className="text-lg font-bold text-tinta">Nenhuma landing page</h2>
          <p className="mx-auto mt-1 max-w-md text-suave">Crie uma página de campanha para um carro do estoque e use o link nos anúncios do Meta e do Google.</p>
          <Link to="/admin/landing-pages/nova" className="botao-primario mt-5">Criar a primeira</Link>
        </div>
      ) : (
        <div className={cn(t.caixa, "overflow-x-auto")}>
          <table className="w-full min-w-[900px]">
            <thead>
              <tr>{["Landing page", "Veículo", "Estilo", "Status", "Visitas", "Atualizada", ""].map((h, i) => <th key={i} className={t.th}>{h}</th>)}</tr>
            </thead>
            <tbody>{lista.map((l) => <Linha key={l.id} l={l} origem={origem} />)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Linha({ l, origem }: { l: Route.ComponentProps["loaderData"]["lista"][number]; origem: string }) {
  const fetcher = useFetcher();
  const [copiado, setCopiado] = useState(false);
  if (fetcher.formData?.get("intencao") === "excluir") return null;
  const icone = "grid size-9 place-items-center rounded-lg text-texto hover:bg-fundo";
  const url = `${origem}/lp/${l.slug}`;

  return (
    <tr className={cn(fetcher.state !== "idle" && "opacity-60")}>
      <td className={t.td}>
        <Link to={`/admin/landing-pages/${l.id}`} className="font-semibold text-tinta hover:underline">{l.titulo}</Link>
        <p className="mt-0.5 text-xs text-suave">/lp/{l.slug}</p>
      </td>
      <td className={cn(t.td, "max-w-[280px] text-suave")}>
        <p className="truncate">{codigoVeiculo(l.codigo)} · {l.marca} {l.modelo} {l.versao} {l.anoModelo}</p>
        {l.statusVeiculo !== "ativo" && <p className="text-xs font-medium text-alerta">Veículo {l.statusVeiculo}: visitantes não veem a página</p>}
      </td>
      <td className={cn(t.td, "text-suave")}>{ROTULO_ESTILO_LP[l.estilo]}</td>
      <td className={t.td}>
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", l.status === "ativa" ? "bg-sucesso-fundo text-sucesso" : "bg-alerta-fundo text-alerta")}>
          {l.status === "ativa" ? "Ativa" : "Rascunho"}
        </span>
      </td>
      <td className={cn(t.td, "numeros text-suave")}>{l.visitas}</td>
      <td className={cn(t.td, "numeros whitespace-nowrap text-suave")}>{formatarData(l.atualizadoEm)}</td>
      <td className={t.td}>
        <div className="flex items-center justify-end gap-0.5">
          <fetcher.Form method="post">
            <input type="hidden" name="id" value={l.id} />
            <button name="intencao" value="duplicar" className={icone} title="Duplicar" aria-label={`Duplicar ${l.titulo}`}><CopyPlus className="size-[18px]" /></button>
          </fetcher.Form>
          <button type="button" className={icone} title="Copiar link" aria-label={`Copiar link de ${l.titulo}`}
            onClick={() => { navigator.clipboard.writeText(url); setCopiado(true); setTimeout(() => setCopiado(false), 2000); }}>
            {copiado ? <Check className="size-[18px] text-sucesso" /> : <Link2 className="size-[18px]" />}
          </button>
          <a href={url} target="_blank" rel="noopener" className={icone} title="Abrir" aria-label={`Abrir ${l.titulo}`}><ExternalLink className="size-[18px]" /></a>
          <Link to={`/admin/landing-pages/${l.id}`} className={icone} title="Editar" aria-label={`Editar ${l.titulo}`}><Pencil className="size-[18px]" /></Link>
          <fetcher.Form method="post" onSubmit={(e) => { if (!confirm(`Excluir a landing page "${l.titulo}"? Anúncios que usam este link vão parar de funcionar.`)) e.preventDefault(); }}>
            <input type="hidden" name="id" value={l.id} />
            <button name="intencao" value="excluir" className={cn(icone, "text-erro hover:bg-erro-fundo")} title="Excluir" aria-label={`Excluir ${l.titulo}`}><Trash2 className="size-[18px]" /></button>
          </fetcher.Form>
        </div>
      </td>
    </tr>
  );
}

export { ErroPainel as ErrorBoundary } from "~/components/admin/ErroPainel";
