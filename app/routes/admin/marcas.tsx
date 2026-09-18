import { asc, count, eq } from "drizzle-orm";
import { ArrowLeft, Check, ChevronRight, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { data, Link, useFetcher, useSearchParams } from "react-router";
import { criarMarca, criarModelo, excluirMarca, excluirModelo, renomearMarca, renomearModelo, type Resultado } from "~/.server/catalogo";
import { db, schema } from "~/.server/db";
import { exigirUsuario } from "~/.server/sessao";
import { exigirMesmaOrigem } from "~/.server/seguranca";
import { normalizar } from "~/components/admin/SeletorBusca";
import { Cabecalho } from "~/components/admin/ui";
import { metaAdmin } from "~/lib/site";
import { cn } from "~/lib/ui";
import type { Route } from "./+types/marcas";

export function meta({ matches }: Route.MetaArgs) {
  return metaAdmin("Marcas e modelos", matches);
}

export async function loader({ request }: Route.LoaderArgs) {
  await exigirUsuario(request);
  const { marcas, modelos, anuncios } = schema;
  const [listaMarcas, listaModelos, porMarca, porModelo] = await Promise.all([
    db.select().from(marcas).orderBy(asc(marcas.nome)),
    db.select().from(modelos).orderBy(asc(modelos.nome)),
    db.select({ id: anuncios.marcaId, n: count() }).from(anuncios).groupBy(anuncios.marcaId),
    db.select({ id: anuncios.modeloId, n: count() }).from(anuncios).groupBy(anuncios.modeloId),
  ]);
  const carrosMarca = new Map(porMarca.map((m) => [m.id, m.n]));
  const carrosModelo = new Map(porModelo.map((m) => [m.id, m.n]));
  return {
    marcas: listaMarcas.map((m) => ({
      id: m.id, nome: m.nome, carros: carrosMarca.get(m.id) ?? 0,
      modelos: listaModelos.filter((mo) => mo.marcaId === m.id).map((mo) => ({ id: mo.id, nome: mo.nome, carros: carrosModelo.get(mo.id) ?? 0 })),
    })),
  };
}

/**
 * Também é chamada pelo cadastro de veículo ("+ Adicionar marca/modelo"),
 * por isso devolve o id do que foi criado.
 */
export async function action({ request }: Route.ActionArgs) {
  exigirMesmaOrigem(request);
  await exigirUsuario(request);
  const form = await request.formData();
  const intencao = String(form.get("intencao") ?? "");
  const id = Number(form.get("id"));
  const nome = String(form.get("nome") ?? "");
  let r: Resultado;
  switch (intencao) {
    case "criar-marca": r = await criarMarca(nome); break;
    case "criar-modelo": r = await criarModelo(Number(form.get("marcaId")), nome); break;
    case "renomear-marca": r = await renomearMarca(id, nome); break;
    case "renomear-modelo": r = await renomearModelo(id, nome); break;
    case "excluir-marca": r = await excluirMarca(id); break;
    case "excluir-modelo": r = await excluirModelo(id); break;
    default: return data({ ok: false as const, erro: "Ação inválida.", intencao }, { status: 400 });
  }
  return data({ ...r, intencao }, { status: r.ok ? 200 : 400 });
}

type Marca = Route.ComponentProps["loaderData"]["marcas"][number];

export default function Marcas({ loaderData }: Route.ComponentProps) {
  const { marcas } = loaderData;
  const [params, setParams] = useSearchParams();
  const [busca, setBusca] = useState("");
  const selecionada = marcas.find((m) => String(m.id) === params.get("marca")) ?? null;
  const filtradas = useMemo(() => {
    const t = normalizar(busca);
    return t ? marcas.filter((m) => normalizar(m.nome).includes(t) || m.modelos.some((mo) => normalizar(mo.nome).includes(t))) : marcas;
  }, [marcas, busca]);
  const totalModelos = marcas.reduce((s, m) => s + m.modelos.length, 0);

  // Marca recém-criada: abre direto nela para cadastrar os modelos.
  const nova = useFetcher<typeof action>();
  useEffect(() => {
    if (nova.state === "idle" && nova.data?.ok && nova.data.intencao === "criar-marca") {
      setParams({ marca: String(nova.data.id) }, { preventScrollReset: true });
      setBusca("");
    }
  }, [nova.state, nova.data, setParams]);
  const criarPelaBusca = busca.trim() && !marcas.some((m) => normalizar(m.nome) === normalizar(busca));

  return (
    <div className="max-w-5xl">
      <Cabecalho titulo="Marcas e modelos" descricao={`${marcas.length} marcas e ${totalModelos} modelos disponíveis no cadastro de veículos.`} />

      <div className="grid items-start gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* No celular, com uma marca aberta, a lista dá lugar aos modelos. */}
        <section className={cn("rounded-xl border border-linha bg-white", selecionada && "hidden lg:block")} aria-label="Marcas">
          <div className="border-b border-linha p-4">
            <label htmlFor="busca-marca" className="sr-only">Buscar marca ou modelo</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fraco" aria-hidden="true" />
              <input id="busca-marca" type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar ou adicionar marca" className="campo pl-9" autoComplete="off" />
            </div>
            {criarPelaBusca && (
              <nova.Form method="post" className="mt-2">
                <input type="hidden" name="intencao" value="criar-marca" />
                <input type="hidden" name="nome" value={busca} />
                <button className="botao-secundario h-10 w-full justify-start px-3 text-sm" disabled={nova.state !== "idle"}>
                  <Plus className="size-4" aria-hidden="true" /> Adicionar a marca “{busca.trim()}”
                </button>
              </nova.Form>
            )}
            {nova.data && !nova.data.ok && <p className="mt-2 text-sm text-erro">{nova.data.erro}</p>}
          </div>
          <ul className="max-h-[65vh] overflow-y-auto p-1.5">
            {filtradas.map((m) => (
              <li key={m.id}>
                <Link to={`?marca=${m.id}`} preventScrollReset aria-current={m.id === selecionada?.id ? "true" : undefined}
                  className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-fundo", m.id === selecionada?.id && "bg-marca-50 hover:bg-marca-50")}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-tinta">{m.nome}</span>
                    <span className="numeros text-xs text-suave">{m.modelos.length} {m.modelos.length === 1 ? "modelo" : "modelos"} · {m.carros} {m.carros === 1 ? "carro" : "carros"}</span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-fraco" aria-hidden="true" />
                </Link>
              </li>
            ))}
            {!filtradas.length && <li className="px-3 py-6 text-center text-sm text-suave">Nenhuma marca com esse nome.</li>}
          </ul>
        </section>

        {selecionada
          ? <PainelMarca key={selecionada.id} marca={selecionada} />
          : (
            <div className="hidden rounded-xl border border-dashed border-linha-forte bg-white px-6 py-16 text-center text-suave lg:block">
              Escolha uma marca para ver e cadastrar os modelos.<br />Para uma marca nova, digite o nome na busca.
            </div>
          )}
      </div>
    </div>
  );
}

function PainelMarca({ marca }: { marca: Marca }) {
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState(false);
  const renomear = useFetcher<typeof action>();
  const excluir = useFetcher<typeof action>();
  const novo = useFetcher<typeof action>();
  const campoNovo = useRef<HTMLInputElement>(null);
  const [nomeNovo, setNomeNovo] = useState("");

  useEffect(() => { if (renomear.state === "idle" && renomear.data?.ok) setEditando(false); }, [renomear.state, renomear.data]);
  useEffect(() => {
    if (novo.state === "idle" && novo.data?.ok) { setNomeNovo(""); setBusca(""); campoNovo.current?.focus(); }
  }, [novo.state, novo.data]);

  const filtrados = useMemo(() => {
    const t = normalizar(busca);
    return t ? marca.modelos.filter((m) => normalizar(m.nome).includes(t)) : marca.modelos;
  }, [marca.modelos, busca]);

  return (
    <section className="rounded-xl border border-linha bg-white" aria-labelledby="titulo-marca">
      <div className="border-b border-linha p-4 sm:p-5">
        <Link to="?" preventScrollReset className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-suave hover:text-tinta lg:hidden">
          <ArrowLeft className="size-4" aria-hidden="true" /> Todas as marcas
        </Link>
        {editando ? (
          <renomear.Form method="post" className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="intencao" value="renomear-marca" />
            <input type="hidden" name="id" value={marca.id} />
            <label htmlFor="nome-marca" className="sr-only">Nome da marca</label>
            <input id="nome-marca" name="nome" defaultValue={marca.nome} maxLength={40} autoFocus className="campo h-10 max-w-xs flex-1" />
            <button className="botao-primario h-10 px-4 text-sm" disabled={renomear.state !== "idle"}><Check className="size-4" aria-hidden="true" /> Salvar</button>
            <button type="button" onClick={() => setEditando(false)} className="botao-fantasma h-10 px-3 text-sm">Cancelar</button>
          </renomear.Form>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 id="titulo-marca" className="truncate text-xl font-bold text-tinta">{marca.nome}</h2>
              <p className="numeros text-sm text-suave">{marca.modelos.length} {marca.modelos.length === 1 ? "modelo" : "modelos"} · {marca.carros} {marca.carros === 1 ? "carro" : "carros"} no estoque</p>
            </div>
            <div className="flex gap-1">
              <button type="button" onClick={() => setEditando(true)} className="botao-fantasma h-9 px-3 text-sm"><Pencil className="size-4" aria-hidden="true" /> Renomear</button>
              <excluir.Form method="post" onSubmit={(e) => { if (!confirm(`Excluir a marca ${marca.nome} e todos os modelos dela?`)) e.preventDefault(); }}>
                <input type="hidden" name="intencao" value="excluir-marca" />
                <input type="hidden" name="id" value={marca.id} />
                <button disabled={marca.carros > 0} title={marca.carros > 0 ? "Há veículos desta marca" : undefined}
                  className="botao-fantasma h-9 px-3 text-sm text-erro hover:bg-erro-fundo disabled:cursor-not-allowed disabled:opacity-40">
                  <Trash2 className="size-4" aria-hidden="true" /> Excluir
                </button>
              </excluir.Form>
            </div>
          </div>
        )}
        {renomear.data && !renomear.data.ok && <p className="mt-2 text-sm text-erro">{renomear.data.erro}</p>}
        {excluir.data && !excluir.data.ok && <p className="mt-2 text-sm text-erro">{excluir.data.erro}</p>}
      </div>

      <div className="grid gap-3 border-b border-linha p-4 sm:grid-cols-2 sm:p-5">
        <novo.Form method="post" className="flex gap-2 sm:col-span-2">
          <input type="hidden" name="intencao" value="criar-modelo" />
          <input type="hidden" name="marcaId" value={marca.id} />
          <label htmlFor="novo-modelo" className="sr-only">Novo modelo</label>
          <input ref={campoNovo} id="novo-modelo" name="nome" value={nomeNovo} onChange={(e) => setNomeNovo(e.target.value)} maxLength={40}
            placeholder={`Novo modelo da ${marca.nome} (ex.: Corolla)`} className="campo h-10 flex-1" autoComplete="off" />
          <button className="botao-primario h-10 shrink-0 px-4 text-sm" disabled={!nomeNovo.trim() || novo.state !== "idle"}><Plus className="size-4" aria-hidden="true" /> Adicionar</button>
        </novo.Form>
        {novo.data && !novo.data.ok && <p className="text-sm text-erro sm:col-span-2">{novo.data.erro}</p>}
        {marca.modelos.length > 8 && (
          <div className="relative sm:col-span-2">
            <label htmlFor="busca-modelo" className="sr-only">Buscar modelo</label>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fraco" aria-hidden="true" />
            <input id="busca-modelo" type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar modelo" className="campo h-10 pl-9" autoComplete="off" />
          </div>
        )}
      </div>

      {marca.modelos.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-suave">Nenhum modelo ainda. Adicione o primeiro acima.</p>
      ) : (
        <ul className="grid gap-px bg-linha sm:grid-cols-2">
          {filtrados.map((m) => <LinhaModelo key={m.id} modelo={m} />)}
          {filtrados.length % 2 === 1 && <li className="hidden bg-white sm:block" aria-hidden="true" />}
          {!filtrados.length && <li className="bg-white px-5 py-6 text-sm text-suave sm:col-span-2">Nenhum modelo com esse nome.</li>}
        </ul>
      )}
    </section>
  );
}

function LinhaModelo({ modelo }: { modelo: Marca["modelos"][number] }) {
  const [editando, setEditando] = useState(false);
  const f = useFetcher<typeof action>();
  const apagando = f.formData?.get("intencao") === "excluir-modelo" && f.state !== "idle";
  useEffect(() => { if (f.state === "idle" && f.data?.ok && f.data.intencao === "renomear-modelo") setEditando(false); }, [f.state, f.data]);
  if (apagando) return null;
  const icone = "grid size-8 place-items-center rounded-lg text-texto hover:bg-fundo";

  return (
    <li className="bg-white px-4 py-2.5 sm:px-5">
      {editando ? (
        <f.Form method="post" className="flex items-center gap-1.5">
          <input type="hidden" name="intencao" value="renomear-modelo" />
          <input type="hidden" name="id" value={modelo.id} />
          <label htmlFor={`modelo-${modelo.id}`} className="sr-only">Nome do modelo</label>
          <input id={`modelo-${modelo.id}`} name="nome" defaultValue={modelo.nome} maxLength={40} autoFocus className="campo h-9 min-w-0 flex-1 text-sm"
            onKeyDown={(e) => e.key === "Escape" && setEditando(false)} />
          <button className={cn(icone, "text-marca-700")} aria-label="Salvar nome"><Check className="size-4" /></button>
          <button type="button" onClick={() => setEditando(false)} className={icone} aria-label="Cancelar"><X className="size-4" /></button>
        </f.Form>
      ) : (
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-tinta">{modelo.nome}</span>
            <span className="numeros text-xs text-suave">{modelo.carros} {modelo.carros === 1 ? "carro" : "carros"}</span>
          </span>
          <button type="button" onClick={() => setEditando(true)} className={icone} aria-label={`Renomear ${modelo.nome}`} title="Renomear"><Pencil className="size-4" /></button>
          <f.Form method="post" onSubmit={(e) => { if (!confirm(`Excluir o modelo ${modelo.nome}?`)) e.preventDefault(); }}>
            <input type="hidden" name="intencao" value="excluir-modelo" />
            <input type="hidden" name="id" value={modelo.id} />
            <button disabled={modelo.carros > 0} className={cn(icone, "text-erro hover:bg-erro-fundo disabled:cursor-not-allowed disabled:opacity-30")}
              aria-label={`Excluir ${modelo.nome}`} title={modelo.carros > 0 ? "Há veículos deste modelo" : "Excluir"}><Trash2 className="size-4" /></button>
          </f.Form>
        </div>
      )}
      {f.data && !f.data.ok && <p className="mt-1 text-xs text-erro">{f.data.erro}</p>}
    </li>
  );
}

export { ErroPainel as ErrorBoundary } from "~/components/admin/ErroPainel";
