import { and, count, desc, eq, like, or, sql, type SQL } from "drizzle-orm";
import { Check, Copy, ExternalLink, Pencil, Plus, Rss, Search, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { Form, Link, useFetcher, useSearchParams } from "react-router";
import { db, schema } from "~/.server/db";
import { removerObjetos, urlImagem } from "~/.server/imagens";
import { lojaCompleta, salvarLoja } from "~/.server/loja";
import { anuncioPorId } from "~/.server/meus-anuncios";
import { exigirUsuario } from "~/.server/sessao";
import { exigirMesmaOrigem } from "~/.server/seguranca";
import { novoToken } from "~/.server/token";
import { Aviso, Cabecalho, classeTabela as t, PillVeiculo } from "~/components/admin/ui";
import { VerificadorFeed } from "~/components/admin/VerificadorFeed";
import { CarroPlaceholder } from "~/components/CarroPlaceholder";
import { anos, data, km, moeda } from "~/lib/formato";
import { metaAdmin } from "~/lib/site";
import { cn } from "~/lib/ui";
import { CARROCERIAS, codigoVeiculo, ROTULO_STATUS, STATUS_ANUNCIO, type StatusAnuncio } from "~/lib/veiculos";
import type { Route } from "./+types/veiculos";

export function meta({ matches }: Route.MetaArgs) {
  return metaAdmin("Veículos", matches);
}

export async function loader({ request }: Route.LoaderArgs) {
  await exigirUsuario(request);
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 60);
  const status = url.searchParams.get("status") ?? "";
  const carroceria = url.searchParams.get("carroceria") ?? "";

  const { anuncios, marcas, modelos, fotos, leads } = schema;
  const condicoes: SQL[] = [];
  if ((STATUS_ANUNCIO as readonly string[]).includes(status)) condicoes.push(eq(anuncios.status, status as StatusAnuncio));
  if ((CARROCERIAS as readonly string[]).includes(carroceria)) condicoes.push(eq(anuncios.carroceria, carroceria as never));
  for (const palavra of q.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 5)) {
    const termo = `%${palavra.replace(/[%_]/g, "")}%`;
    const numero = Number(palavra.replace(/^0+/, ""));
    condicoes.push(or(
      like(sql`lower(${marcas.nome})`, termo), like(sql`lower(${modelos.nome})`, termo), like(sql`lower(${anuncios.versao})`, termo),
      ...(Number.isInteger(numero) && numero > 0 ? [eq(anuncios.codigo, numero)] : []),
    )!);
  }

  const [lista, [{ total }], loja, [{ total: aVenda }]] = await Promise.all([
    db.select({
      id: anuncios.id, codigo: anuncios.codigo, slug: anuncios.slug, versao: anuncios.versao, preco: anuncios.preco,
      anoFabricacao: anuncios.anoFabricacao, anoModelo: anuncios.anoModelo, km: anuncios.km, cambio: anuncios.cambio,
      carroceria: anuncios.carroceria, status: anuncios.status, destaque: anuncios.destaque, atualizadoEm: anuncios.atualizadoEm,
      marca: marcas.nome, modelo: modelos.nome, visualizacoes: anuncios.visualizacoes,
      capa: sql<string | null>`(select ${fotos.chave} from ${fotos} where ${fotos.anuncioId} = ${anuncios.id} order by ${fotos.ordem} limit 1)`,
      leads: sql<number>`(select count(*) from ${leads} where ${leads.anuncioId} = ${anuncios.id})`,
    }).from(anuncios)
      .innerJoin(marcas, eq(marcas.id, anuncios.marcaId))
      .innerJoin(modelos, eq(modelos.id, anuncios.modeloId))
      .where(condicoes.length ? and(...condicoes) : undefined)
      .orderBy(desc(anuncios.atualizadoEm)).limit(500),
    db.select({ total: count() }).from(anuncios),
    lojaCompleta(),
    db.select({ total: count() }).from(anuncios).where(eq(anuncios.status, "ativo")),
  ]);

  return {
    veiculos: lista.map((a) => ({ ...a, capa: a.capa ? urlImagem(a.capa) : null })),
    total, filtros: { q, status, carroceria },
    feed: { ativo: loja.feedAtivo, url: loja.feedToken ? `${url.origin}/feed/estoque.xml?token=${loja.feedToken}` : "", aVenda },
  };
}

export async function action({ request }: Route.ActionArgs) {
  exigirMesmaOrigem(request);
  await exigirUsuario(request);
  const form = await request.formData();
  const intencao = form.get("intencao");

  if (intencao === "feed") {
    const loja = await lojaCompleta();
    const ativo = form.get("ativo") === "true";
    const regerar = form.get("regerar") === "true";
    await salvarLoja({ feedAtivo: ativo, feedToken: regerar || !loja.feedToken ? novoToken("feed") : loja.feedToken });
    return { ok: true };
  }

  const anuncio = await anuncioPorId(String(form.get("id")));
  if (intencao === "excluir") {
    const chaves = await db.select({ chave: schema.fotos.chave }).from(schema.fotos).where(eq(schema.fotos.anuncioId, anuncio.id));
    // Apaga o cadastro primeiro: se apagar as fotos falhar, sobra arquivo órfão, mas nunca um veículo apontando para foto que não existe.
    await db.delete(schema.anuncios).where(eq(schema.anuncios.id, anuncio.id));
    await removerObjetos(chaves.map((c) => c.chave));
    return { ok: true };
  }
  if (intencao === "destaque") {
    await db.update(schema.anuncios).set({ destaque: form.get("valor") === "true", atualizadoEm: Date.now() }).where(eq(schema.anuncios.id, anuncio.id));
    return { ok: true };
  }
  if (intencao === "status") {
    const status = String(form.get("status"));
    if ((STATUS_ANUNCIO as readonly string[]).includes(status)) {
      await db.update(schema.anuncios).set({ status: status as StatusAnuncio, atualizadoEm: Date.now() }).where(eq(schema.anuncios.id, anuncio.id));
    }
    return { ok: true };
  }
  return { ok: false };
}

export default function Veiculos({ loaderData }: Route.ComponentProps) {
  const { veiculos, total, filtros, feed } = loaderData;
  const [params] = useSearchParams();
  const salvo = params.get("salvo");

  return (
    <div>
      <Cabecalho titulo="Veículos" descricao={`${total} ${total === 1 ? "veículo cadastrado" : "veículos cadastrados"}`}>
        <Link to="/admin/veiculos/novo" className="botao-primario h-10 px-4 text-sm"><Plus className="size-4" aria-hidden="true" /> Novo veículo</Link>
      </Cabecalho>

      {salvo && <Aviso tipo="sucesso">Veículo salvo. <Link to={`/carro/${salvo}`} className="underline">Ver no site</Link></Aviso>}

      <Feed feed={feed} />

      <Form method="get" role="search" className="mt-4 flex flex-wrap gap-2">
        <div className="relative min-w-60 flex-1">
          <label htmlFor="q" className="sr-only">Buscar veículos</label>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-fraco" aria-hidden="true" />
          <input id="q" name="q" type="search" defaultValue={filtros.q} placeholder="Buscar por marca, modelo, versão ou código" className="campo h-11 pl-10" />
        </div>
        <label htmlFor="f-status" className="sr-only">Status</label>
        <select id="f-status" name="status" defaultValue={filtros.status} className="campo h-11 w-auto min-w-40">
          <option value="">Todos os status</option>
          {STATUS_ANUNCIO.map((s) => <option key={s} value={s}>{ROTULO_STATUS[s]}</option>)}
        </select>
        <label htmlFor="f-carroceria" className="sr-only">Carroceria</label>
        <select id="f-carroceria" name="carroceria" defaultValue={filtros.carroceria} className="campo h-11 w-auto min-w-44">
          <option value="">Todas as carrocerias</option>
          {CARROCERIAS.map((c) => <option key={c}>{c}</option>)}
        </select>
        <button className="botao h-11 border border-tinta bg-white px-5 text-tinta hover:bg-fundo">Buscar</button>
      </Form>

      {veiculos.length === 0 ? (
        <div className="mt-4 rounded-xl border border-linha bg-white px-6 py-14 text-center">
          <h2 className="text-lg font-bold text-tinta">{total ? "Nada encontrado" : "Nenhum veículo cadastrado"}</h2>
          <p className="mt-1 text-suave">{total ? "Tente outra busca ou limpe os filtros." : "Cadastre o primeiro carro para ele aparecer no site."}</p>
          <Link to={total ? "/admin/veiculos" : "/admin/veiculos/novo"} className="botao-primario mt-5">{total ? "Limpar filtros" : "Cadastrar veículo"}</Link>
        </div>
      ) : (
        <div className={cn(t.caixa, "mt-4")}>
          <table className="w-full">
            <thead className="hidden md:table-header-group">
              <tr>
                <th className={cn(t.th, "w-20")}><span className="sr-only">Foto</span></th>
                <th className={t.th}>Veículo</th>
                <th className={cn(t.th, "hidden 2xl:table-cell")}>Carroceria</th>
                <th className={t.th}>Preço</th>
                <th className={t.th}>Status</th>
                <th className={cn(t.th, "hidden xl:table-cell")}>Atualizado</th>
                <th className={t.th}><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>{veiculos.map((v) => <Linha key={v.id} v={v} />)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

type Veiculo = Route.ComponentProps["loaderData"]["veiculos"][number];

function Linha({ v }: { v: Veiculo }) {
  const fetcher = useFetcher();
  const intencao = fetcher.formData?.get("intencao");
  if (intencao === "excluir") return null;
  const destaque = intencao === "destaque" ? fetcher.formData?.get("valor") === "true" : v.destaque;
  const status = (intencao === "status" ? fetcher.formData?.get("status") : v.status) as StatusAnuncio;
  const titulo = `${v.marca} ${v.modelo} ${v.versao}`;
  const botaoIcone = "grid size-8 place-items-center rounded-lg text-texto hover:bg-fundo md:size-9";

  return (
    <tr className={cn("grid grid-cols-[64px_minmax(0,1fr)_auto] gap-x-3 gap-y-2 border-b border-linha p-4 last:border-0 md:table-row md:p-0", fetcher.state !== "idle" && "opacity-60")}>
      <td className="row-span-2 md:border-b md:border-linha md:py-3 md:pl-4 md:pr-0 md:align-middle">
        <Link to={`/admin/veiculos/${v.id}`} tabIndex={-1} aria-hidden="true" className="block size-14 overflow-hidden rounded-lg bg-fundo">
          {v.capa ? <img src={v.capa.startsWith("https://images.unsplash.com") ? v.capa.replace(/w=\d+&h=\d+/, "w=160&h=160") : v.capa} alt="" loading="lazy" className="size-full object-cover" /> : <CarroPlaceholder carroceria={v.carroceria} className="size-full" />}
        </Link>
      </td>
      <td className="col-span-2 min-w-0 md:w-full md:max-w-0 md:border-b md:border-linha md:px-4 md:py-3 md:align-middle">
        <Link to={`/admin/veiculos/${v.id}`} className="block truncate font-semibold text-tinta hover:underline">{titulo}</Link>
        <p className="numeros mt-0.5 truncate text-xs text-suave">
          {codigoVeiculo(v.codigo)} · {anos(v.anoFabricacao, v.anoModelo)} · {km(v.km)} · {v.leads} {v.leads === 1 ? "lead" : "leads"}
          {destaque && <span className="text-marca-700"> · ★ Destaque</span>}
        </p>
        <p className="numeros mt-1 font-bold text-tinta md:hidden">{moeda(v.preco)}</p>
      </td>
      <td className="hidden whitespace-nowrap text-sm text-suave 2xl:table-cell 2xl:border-b 2xl:border-linha 2xl:px-4 2xl:align-middle">{v.carroceria} · {v.cambio}</td>
      <td className="numeros hidden whitespace-nowrap font-semibold text-tinta md:table-cell md:border-b md:border-linha md:px-4 md:align-middle">{moeda(v.preco)}</td>
      <td className="col-start-2 min-w-0 self-center md:border-b md:border-linha md:px-4 md:align-middle">
        <fetcher.Form method="post">
          <input type="hidden" name="id" value={v.id} />
          <input type="hidden" name="intencao" value="status" />
          <label htmlFor={`status-${v.id}`} className="sr-only">Status de {titulo}</label>
          <select id={`status-${v.id}`} name="status" value={status} onChange={(e) => fetcher.submit(e.currentTarget.form)}
            className={cn("h-8 w-[6.5rem] cursor-pointer rounded-full border-0 py-0 pl-3 pr-6 text-xs font-semibold md:w-auto md:pr-7",
              status === "ativo" ? "bg-sucesso-fundo text-sucesso" : status === "pausado" ? "bg-alerta-fundo text-alerta" : "bg-fundo text-suave")}>
            {STATUS_ANUNCIO.map((s) => <option key={s} value={s}>{ROTULO_STATUS[s]}</option>)}
          </select>
        </fetcher.Form>
      </td>
      <td className="numeros hidden whitespace-nowrap text-sm text-suave xl:table-cell xl:border-b xl:border-linha xl:px-4 xl:align-middle">{data(v.atualizadoEm)}</td>
      <td className="col-start-3 self-center md:border-b md:border-linha md:pl-2 md:pr-4 md:align-middle">
        <div className="flex items-center justify-end gap-0.5">
          <fetcher.Form method="post">
            <input type="hidden" name="id" value={v.id} />
            <input type="hidden" name="valor" value={String(!destaque)} />
            <button name="intencao" value="destaque" className={cn(botaoIcone, destaque && "text-marca-700")} aria-pressed={destaque}
              title={destaque ? "Tirar do destaque" : "Destacar na home"} aria-label={destaque ? `Tirar ${titulo} do destaque` : `Destacar ${titulo}`}>
              <Star className={cn("size-[18px]", destaque && "fill-current")} />
            </button>
          </fetcher.Form>
          {status !== "pausado" && (
            <a href={`/carro/${v.slug}`} target="_blank" rel="noopener" className={botaoIcone} title="Ver no site" aria-label={`Ver ${titulo} no site`}>
              <ExternalLink className="size-[18px]" />
            </a>
          )}
          <Link to={`/admin/veiculos/${v.id}`} className={botaoIcone} title="Editar" aria-label={`Editar ${titulo}`}><Pencil className="size-[18px]" /></Link>
          <fetcher.Form method="post" onSubmit={(e) => {
            if (!confirm(`Excluir ${titulo}? As fotos também serão apagadas. Para só tirar do site, mude o status para Pausado ou Vendido.`)) e.preventDefault();
          }}>
            <input type="hidden" name="id" value={v.id} />
            <button name="intencao" value="excluir" className={cn(botaoIcone, "text-erro hover:bg-erro-fundo")} title="Excluir" aria-label={`Excluir ${titulo}`}>
              <Trash2 className="size-[18px]" />
            </button>
          </fetcher.Form>
        </div>
      </td>
    </tr>
  );
}

function Feed({ feed }: { feed: { ativo: boolean; url: string; aVenda: number } }) {
  const fetcher = useFetcher();
  const [copiado, setCopiado] = useState(false);
  const ativo = fetcher.formData ? fetcher.formData.get("ativo") === "true" : feed.ativo;

  return (
    <details className="group rounded-xl border border-linha bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
        <span className="flex items-center gap-2.5 font-semibold text-tinta"><Rss className="size-[18px] text-marca-700" aria-hidden="true" /> Exportar para portais (XML)</span>
        <span className={cn("text-xs font-medium", ativo ? "text-sucesso" : "text-suave")}>{ativo ? "Feed ativo" : "Feed desativado"}</span>
      </summary>
      <div className="border-t border-linha px-5 py-4 text-sm">
        <p className="text-suave">Um endereço XML com todos os veículos à venda, fotos e opcionais, atualizado sozinho. Envie o link ao integrador ou portal que aceita importação por XML.</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <fetcher.Form method="post">
            <input type="hidden" name="intencao" value="feed" />
            <input type="hidden" name="ativo" value={String(!ativo)} />
            <button className={ativo ? "botao-secundario h-9 px-3 text-sm" : "botao-primario h-9 px-3 text-sm"}>{ativo ? "Desativar feed" : "Ativar feed"}</button>
          </fetcher.Form>
          {ativo && feed.url && (
            <fetcher.Form method="post" onSubmit={(e) => { if (!confirm("Gerar um novo link? O link atual para de funcionar.")) e.preventDefault(); }}>
              <input type="hidden" name="intencao" value="feed" />
              <input type="hidden" name="ativo" value="true" />
              <input type="hidden" name="regerar" value="true" />
              <button className="botao-fantasma h-9 px-3 text-sm">Gerar novo link</button>
            </fetcher.Form>
          )}
        </div>
        {ativo && feed.url && (
          <div className="mt-3 flex gap-2">
            <input readOnly value={feed.url} aria-label="Endereço do feed" onFocus={(e) => e.currentTarget.select()} className="campo numeros h-10 text-xs" />
            <button type="button" className="botao-secundario h-10 shrink-0 px-3 text-sm"
              onClick={() => { navigator.clipboard.writeText(feed.url); setCopiado(true); setTimeout(() => setCopiado(false), 2000); }}>
              {copiado ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />} {copiado ? "Copiado" : "Copiar"}
            </button>
          </div>
        )}
        {ativo && feed.url && !fetcher.formData && <VerificadorFeed key={feed.url} url={feed.url} aVenda={feed.aVenda} />}
      </div>
    </details>
  );
}

export { ErroPainel as ErrorBoundary } from "~/components/admin/ErroPainel";
