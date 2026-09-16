import { and, count, desc, eq, like, or, sql, type SQL } from "drizzle-orm";
import { CircleCheck, Eye, Inbox, Pause, Pencil, Play, Search, Star, Trash2 } from "lucide-react";
import { Form, Link, useFetcher, useSearchParams, useSubmit } from "react-router";
import { db, schema } from "~/.server/db";
import { removerObjetos, urlImagem } from "~/.server/imagens";
import { anuncioPorId } from "~/.server/meus-anuncios";
import { exigirUsuario } from "~/.server/sessao";
import { exigirMesmaOrigem } from "~/.server/seguranca";
import { CarroPlaceholder } from "~/components/CarroPlaceholder";
import { anos, inteiro, km, moeda, tempoRelativo } from "~/lib/formato";
import { metaAdmin } from "~/lib/site";
import { cn } from "~/lib/ui";
import { ROTULO_STATUS, STATUS_ANUNCIO, type StatusAnuncio } from "~/lib/veiculos";
import type { Route } from "./+types/estoque";

export function meta({ matches }: Route.MetaArgs) {
  return metaAdmin("Estoque", matches);
}

export async function loader({ request }: Route.LoaderArgs) {
  await exigirUsuario(request);
  const url = new URL(request.url);
  const status = (STATUS_ANUNCIO as readonly string[]).includes(url.searchParams.get("status") ?? "")
    ? (url.searchParams.get("status") as StatusAnuncio) : null;
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 60);

  const { anuncios, marcas, modelos, fotos, mensagens } = schema;
  const condicoes: SQL[] = [];
  if (status) condicoes.push(eq(anuncios.status, status));
  for (const palavra of q.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 5)) {
    const termo = `%${palavra.replace(/[%_]/g, "")}%`;
    condicoes.push(or(like(sql`lower(${marcas.nome})`, termo), like(sql`lower(${modelos.nome})`, termo), like(sql`lower(${anuncios.versao})`, termo))!);
  }

  const [lista, totais] = await Promise.all([
    db.select({
      id: anuncios.id, slug: anuncios.slug, versao: anuncios.versao, preco: anuncios.preco,
      anoFabricacao: anuncios.anoFabricacao, anoModelo: anuncios.anoModelo, km: anuncios.km,
      carroceria: anuncios.carroceria, status: anuncios.status, destaque: anuncios.destaque,
      visualizacoes: anuncios.visualizacoes, criadoEm: anuncios.criadoEm, marca: marcas.nome, modelo: modelos.nome,
      capa: sql<string | null>`(select ${fotos.chave} from ${fotos} where ${fotos.anuncioId} = ${anuncios.id} order by ${fotos.ordem} limit 1)`,
      mensagens: sql<number>`(select count(*) from ${mensagens} where ${mensagens.anuncioId} = ${anuncios.id})`,
    }).from(anuncios)
      .innerJoin(marcas, eq(marcas.id, anuncios.marcaId))
      .innerJoin(modelos, eq(modelos.id, anuncios.modeloId))
      .where(condicoes.length ? and(...condicoes) : undefined)
      .orderBy(desc(anuncios.criadoEm)).limit(300),
    db.select({ status: anuncios.status, total: count() }).from(anuncios).groupBy(anuncios.status),
  ]);

  const porStatus = Object.fromEntries(STATUS_ANUNCIO.map((s) => [s, totais.find((t) => t.status === s)?.total ?? 0])) as Record<StatusAnuncio, number>;
  return { anuncios: lista.map((a) => ({ ...a, capa: a.capa ? urlImagem(a.capa) : null })), porStatus, status, q };
}

export async function action({ request }: Route.ActionArgs) {
  exigirMesmaOrigem(request);
  await exigirUsuario(request);
  const form = await request.formData();
  const anuncio = await anuncioPorId(String(form.get("id")));
  const intencao = form.get("intencao");

  if (intencao === "excluir") {
    const chaves = await db.select({ chave: schema.fotos.chave }).from(schema.fotos).where(eq(schema.fotos.anuncioId, anuncio.id));
    // Apaga a linha primeiro: se o R2 falhar, sobra arquivo órfão no
    // bucket, mas nunca um veículo apontando para foto que não existe.
    await db.delete(schema.anuncios).where(eq(schema.anuncios.id, anuncio.id));
    await removerObjetos(chaves.map((c) => c.chave));
    return { ok: true };
  }

  if (intencao === "destaque") {
    await db.update(schema.anuncios).set({ destaque: form.get("valor") === "true", atualizadoEm: Date.now() })
      .where(eq(schema.anuncios.id, anuncio.id));
    return { ok: true };
  }

  const novoStatus = { pausar: "pausado", reativar: "ativo", vendido: "vendido" }[String(intencao)] as StatusAnuncio | undefined;
  if (!novoStatus) return { ok: false };
  await db.update(schema.anuncios).set({ status: novoStatus, atualizadoEm: Date.now() }).where(eq(schema.anuncios.id, anuncio.id));
  return { ok: true };
}

const ROTULO_ABA: Record<StatusAnuncio, string> = { ativo: "À venda", pausado: "Pausados", vendido: "Vendidos" };

const ESTILO_STATUS: Record<StatusAnuncio, string> = {
  ativo: "bg-sucesso-fundo text-sucesso",
  pausado: "bg-alerta-fundo text-alerta",
  vendido: "bg-fundo text-suave",
};

export default function Estoque({ loaderData }: Route.ComponentProps) {
  const { anuncios, porStatus, status, q } = loaderData;
  const [params] = useSearchParams();
  const submit = useSubmit();
  const salvo = params.get("salvo");
  const total = porStatus.ativo + porStatus.pausado + porStatus.vendido;
  const abas = [
    { valor: null, rotulo: "Todos", total },
    ...STATUS_ANUNCIO.map((s) => ({ valor: s, rotulo: ROTULO_ABA[s], total: porStatus[s] })),
  ];
  const linkAba = (valor: string | null) => {
    const p = new URLSearchParams();
    if (valor) p.set("status", valor);
    if (q) p.set("q", q);
    return `/admin${p.size ? `?${p}` : ""}`;
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-tinta">Estoque</h1>

      {salvo && (
        <div role="status" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sucesso/20 bg-sucesso-fundo px-4 py-3 text-sucesso">
          <p className="font-semibold">Veículo salvo.</p>
          <Link to={`/carro/${salvo}`} className="text-sm font-semibold underline">Ver no site</Link>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Situação" className="-mx-1 flex max-w-full overflow-x-auto pb-1">
          {abas.map((aba) => (
            <Link key={aba.rotulo} to={linkAba(aba.valor)} aria-current={status === aba.valor ? "page" : undefined}
              className={cn("numeros mx-1 shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors",
                status === aba.valor ? "bg-tinta text-white" : "bg-white text-suave hover:text-tinta")}>
              {aba.rotulo} <span className={status === aba.valor ? "text-white/70" : "text-fraco"}>{aba.total}</span>
            </Link>
          ))}
        </nav>
        <Form method="get" role="search" className="relative w-full sm:w-64"
          onChange={(e) => { const f = e.currentTarget; window.clearTimeout(Number(f.dataset.t)); f.dataset.t = String(window.setTimeout(() => submit(f, { replace: true }), 400)); }}>
          {status && <input type="hidden" name="status" value={status} />}
          <label htmlFor="busca-estoque" className="sr-only">Buscar no estoque</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fraco" aria-hidden="true" />
          <input id="busca-estoque" name="q" type="search" defaultValue={q} placeholder="Marca, modelo ou versão" className="campo h-10 pl-9 text-sm" />
        </Form>
      </div>

      {anuncios.length === 0 ? (
        <div className="cartao mt-4 px-6 py-14 text-center">
          {total === 0 ? (
            <>
              <h2 className="text-lg font-bold text-tinta">Nenhum veículo cadastrado</h2>
              <p className="mx-auto mt-2 max-w-sm text-suave">Cadastre o primeiro carro do estoque para ele aparecer no site.</p>
              <Link to="/admin/veiculos/novo" className="botao-primario mt-6">Cadastrar veículo</Link>
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold text-tinta">Nada encontrado</h2>
              <Link to="/admin" className="botao-secundario mt-6">Ver todo o estoque</Link>
            </>
          )}
        </div>
      ) : (
        <ul className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3">
          {anuncios.map((a) => <Linha key={a.id} anuncio={a} />)}
        </ul>
      )}
    </div>
  );
}

function Linha({ anuncio: a }: { anuncio: Route.ComponentProps["loaderData"]["anuncios"][number] }) {
  const fetcher = useFetcher();
  // Otimista: mostra o estado novo enquanto o servidor confirma.
  const intencao = fetcher.formData?.get("intencao");
  const status: StatusAnuncio = intencao === "pausar" ? "pausado" : intencao === "reativar" ? "ativo" : intencao === "vendido" ? "vendido" : a.status;
  const destaque = intencao === "destaque" ? fetcher.formData?.get("valor") === "true" : a.destaque;
  if (intencao === "excluir") return null;

  return (
    <li className={cn("cartao grid grid-cols-[96px_minmax(0,1fr)] gap-x-3 gap-y-4 p-4 sm:flex sm:items-center sm:gap-4", fetcher.state !== "idle" && "opacity-70")}>
      <Link to={`/admin/veiculos/${a.id}`} className="block shrink-0 self-start overflow-hidden rounded-lg bg-fundo sm:w-40 sm:self-center" tabIndex={-1} aria-hidden="true">
        {a.capa
          ? <img src={a.capa} alt="" className="aspect-[4/3] w-full object-cover" loading="lazy" />
          : <CarroPlaceholder carroceria={a.carroceria} className="aspect-[4/3] w-full" />}
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("rounded-md px-2 py-0.5 text-xs font-bold", ESTILO_STATUS[status])}>{ROTULO_STATUS[status]}</span>
          {destaque && <span className="rounded-md bg-marca-50 px-2 py-0.5 text-xs font-bold text-marca-700">Destaque</span>}
          <span className="text-xs text-suave">cadastrado {tempoRelativo(a.criadoEm)}</span>
        </div>
        <h2 className="mt-1.5 truncate font-bold uppercase text-tinta">
          <Link to={`/admin/veiculos/${a.id}`} className="hover:underline">{a.marca} {a.modelo}</Link>
        </h2>
        <p className="truncate text-sm text-suave">{a.versao} · {anos(a.anoFabricacao, a.anoModelo)} · {km(a.km)}</p>
        <p className="numeros mt-1 text-lg font-extrabold text-tinta">{moeda(a.preco)}</p>
        <p className="numeros mt-1 flex flex-wrap gap-x-4 text-sm text-suave">
          <span className="inline-flex items-center gap-1"><Eye className="size-4" aria-hidden="true" /> {inteiro(a.visualizacoes)} visitas</span>
          <span className="inline-flex items-center gap-1"><Inbox className="size-4" aria-hidden="true" /> {a.mensagens} mensagens</span>
          {status !== "pausado" && <Link to={`/carro/${a.slug}`} className="py-0.5 font-medium text-marca-700 hover:underline">Ver no site</Link>}
        </p>
      </div>

      <fetcher.Form method="post" className="col-span-2 grid grid-cols-2 gap-2 sm:w-48 sm:shrink-0"
        onSubmit={(e) => {
          const botao = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
          if (botao?.value === "excluir" && !confirm(`Excluir ${a.marca} ${a.modelo}? As fotos também serão apagadas. Para tirar do site sem apagar, use "Pausar" ou "Vendido".`)) {
            e.preventDefault();
          }
        }}>
        <input type="hidden" name="id" value={a.id} />
        {/* Só o botão Destaque usa: liga se está desligado e vice-versa. */}
        <input type="hidden" name="valor" value={String(!destaque)} />
        <Link to={`/admin/veiculos/${a.id}`} className="botao-secundario h-9 px-3 text-sm">
          <Pencil className="size-4" aria-hidden="true" /> Editar
        </Link>
        <button name="intencao" value="destaque" className={cn("botao-secundario h-9 px-3 text-sm", destaque && "border-marca-200 text-marca-700")}
          aria-pressed={destaque}>
          <Star className={cn("size-4", destaque && "fill-current")} aria-hidden="true" /> Destaque
        </button>
        {status === "ativo" ? (
          <button name="intencao" value="pausar" className="botao-secundario h-9 px-3 text-sm">
            <Pause className="size-4" aria-hidden="true" /> Pausar
          </button>
        ) : (
          <button name="intencao" value="reativar" className="botao-secundario h-9 px-3 text-sm">
            <Play className="size-4" aria-hidden="true" /> À venda
          </button>
        )}
        {status !== "vendido" ? (
          <button name="intencao" value="vendido" className="botao-secundario h-9 px-3 text-sm">
            <CircleCheck className="size-4" aria-hidden="true" /> Vendido
          </button>
        ) : <span />}
        <button name="intencao" value="excluir" className="botao-perigo col-span-2 h-9 px-3 text-sm">
          <Trash2 className="size-4" aria-hidden="true" /> Excluir
        </button>
      </fetcher.Form>
    </li>
  );
}
