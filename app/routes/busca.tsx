import { and, eq } from "drizzle-orm";
import { ChevronLeft, ChevronRight, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { data, Form, Link, redirect, useLocation, useNavigation, useSubmit } from "react-router";
import { buscar } from "~/.server/anuncios";
import { db, schema } from "~/.server/db";
import { AnuncioCard } from "~/components/AnuncioCard";
import { lerFiltros, ORDENACOES, urlBusca } from "~/lib/busca";
import { inteiro, km as fmtKm, moeda } from "~/lib/formato";
import { SITE } from "~/lib/site";
import { cn } from "~/lib/ui";
import { CAMBIOS, CARROCERIAS, COMBUSTIVEIS, UFS } from "~/lib/veiculos";
import type { Route } from "./+types/busca";

export async function loader({ request, params }: Route.LoaderArgs) {
  const url = new URL(request.url);

  // O formulário da home manda ?marca=&modelo=; a URL canônica leva os dois no caminho.
  if (url.searchParams.has("marca") || url.searchParams.has("modelo")) {
    const marca = url.searchParams.get("marca");
    const modelo = url.searchParams.get("modelo");
    url.searchParams.delete("marca");
    url.searchParams.delete("modelo");
    const caminho = ["/carros", marca, marca && modelo].filter(Boolean).join("/");
    const qs = new URLSearchParams([...url.searchParams].filter(([, v]) => v !== "")).toString();
    throw redirect(`${caminho}${qs ? `?${qs}` : ""}`, 301);
  }

  // Sem JavaScript o formulário manda todo campo, até os vazios
  // (?preco_min=&uf=...). Uma URL só por resultado: melhor para
  // compartilhar e para o buscador não indexar duplicatas.
  if ([...url.searchParams.values()].some((v) => v === "")) {
    const limpa = new URLSearchParams([...url.searchParams].filter(([, v]) => v !== ""));
    throw redirect(`${url.pathname}${limpa.size ? `?${limpa}` : ""}`, 301);
  }

  const filtros = lerFiltros(url, params);
  const resultado = await buscar(filtros);
  if (resultado.inexistente) throw data("Marca ou modelo não encontrado", { status: 404 });

  let marcaNome: string | undefined;
  let modeloNome: string | undefined;
  if (filtros.marca) {
    const [m] = await db.select({ nome: schema.marcas.nome, id: schema.marcas.id }).from(schema.marcas)
      .where(eq(schema.marcas.slug, filtros.marca)).limit(1);
    marcaNome = m?.nome;
    if (m && filtros.modelo) {
      const [mo] = await db.select({ nome: schema.modelos.nome }).from(schema.modelos)
        .where(and(eq(schema.modelos.marcaId, m.id), eq(schema.modelos.slug, filtros.modelo))).limit(1);
      modeloNome = mo?.nome;
    }
  }

  return { ...resultado, filtros, marcaNome, modeloNome, origem: url.origin };
}

const tituloDe = (marca?: string, modelo?: string) =>
  marca ? `${marca}${modelo ? ` ${modelo}` : ""} usados e seminovos` : "Carros usados e seminovos";

export function meta({ loaderData, location }: Route.MetaArgs) {
  if (!loaderData) return [{ title: `Busca — ${SITE.nome}` }];
  const titulo = tituloDe(loaderData.marcaNome, loaderData.modeloNome);
  const canonica = new URL(location.pathname + location.search, loaderData.origem);
  canonica.searchParams.delete("ordem");
  return [
    { title: `${titulo} à venda — ${SITE.nome}` },
    { name: "description", content: `${inteiro(loaderData.total)} ofertas de ${titulo.toLowerCase()} de particulares e lojas.` },
    { tagName: "link", rel: "canonical", href: canonica.toString() },
  ];
}

const ANOS = Array.from({ length: 30 }, (_, i) => new Date().getFullYear() + 1 - i);
const KMS = [10000, 30000, 50000, 80000, 100000, 150000];

export default function Busca({ loaderData }: Route.ComponentProps) {
  const { anuncios, total, marcasFaceta, modelosFaceta, filtros, marcaNome, modeloNome } = loaderData;
  const location = useLocation();
  const url = new URL(location.pathname + location.search, "http://x");
  const navigation = useNavigation();
  const carregando = navigation.state === "loading" && navigation.location?.pathname.startsWith("/carros");
  const [gaveta, setGaveta] = useState(false);
  const submit = useSubmit();
  const formRef = useRef<HTMLFormElement>(null);
  const titulo = tituloDe(marcaNome, modeloNome);
  const totalPaginas = Math.max(1, Math.ceil(total / SITE.porPagina));

  // Fecha a gaveta ao trocar de marca/modelo (muda o caminho). Mudança de
  // filtro não fecha: no celular a pessoa marca vários e aplica de uma vez.
  useEffect(() => setGaveta(false), [location.pathname]);

  // Os campos são não controlados. Quando o filtro muda por fora do
  // formulário — um chip removido, "limpar tudo", voltar no navegador —
  // eles ficariam com o valor antigo. Remontar o formulário resolveria,
  // mas tiraria o foco de quem está digitando o preço; então sincroniza
  // campo a campo e pula o que está em foco.
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const sp = new URLSearchParams(location.search);
    for (const el of Array.from(form.elements)) {
      if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement) || !el.name) continue;
      if (el instanceof HTMLInputElement && el.type === "hidden") continue;
      if (el instanceof HTMLInputElement && el.type === "checkbox") el.checked = sp.getAll(el.name).includes(el.value);
      else if (el instanceof HTMLInputElement && el.type === "radio") el.checked = (sp.get(el.name) ?? "") === el.value;
      else if (document.activeElement !== el) el.value = sp.get(el.name) ?? "";
    }
  }, [location.search]);

  // Filtro aplica sozinho ao mudar. Campos numéricos esperam a pessoa
  // parar de digitar, senão cada tecla dispara uma busca.
  const temporizador = useRef<number>(undefined);
  const enviarLimpo = (substituir: boolean) => {
    if (!formRef.current) return;
    const limpos = new URLSearchParams();
    for (const [k, v] of new FormData(formRef.current)) if (v !== "") limpos.append(k, String(v));
    submit(limpos, { method: "get", action: location.pathname, replace: substituir, preventScrollReset: true });
  };
  const aplicar = (atraso = 0) => {
    window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(() => enviarLimpo(true), atraso);
  };

  const ativos: { rotulo: string; href: string }[] = [
    ...(filtros.q ? [{ rotulo: `“${filtros.q}”`, href: urlBusca(url, { q: null }) }] : []),
    ...(marcaNome ? [{ rotulo: modeloNome ? `${marcaNome} ${modeloNome}` : marcaNome, href: urlBusca(url, {}, modeloNome ? `/carros/${filtros.marca}` : "/carros") }] : []),
    ...(filtros.precoMin ? [{ rotulo: `A partir de ${moeda(filtros.precoMin)}`, href: urlBusca(url, { preco_min: null }) }] : []),
    ...(filtros.precoMax ? [{ rotulo: `Até ${moeda(filtros.precoMax)}`, href: urlBusca(url, { preco_max: null }) }] : []),
    ...(filtros.anoMin ? [{ rotulo: `Ano ≥ ${filtros.anoMin}`, href: urlBusca(url, { ano_min: null }) }] : []),
    ...(filtros.anoMax ? [{ rotulo: `Ano ≤ ${filtros.anoMax}`, href: urlBusca(url, { ano_max: null }) }] : []),
    ...(filtros.kmMax ? [{ rotulo: `Até ${fmtKm(filtros.kmMax)}`, href: urlBusca(url, { km_max: null }) }] : []),
    ...filtros.cambio.map((c) => ({ rotulo: c, href: urlBusca(url, { cambio: filtros.cambio.filter((x) => x !== c) }) })),
    ...filtros.combustivel.map((c) => ({ rotulo: c, href: urlBusca(url, { combustivel: filtros.combustivel.filter((x) => x !== c) }) })),
    ...filtros.carroceria.map((c) => ({ rotulo: c, href: urlBusca(url, { carroceria: filtros.carroceria.filter((x) => x !== c) }) })),
    ...(filtros.uf ? [{ rotulo: filtros.uf, href: urlBusca(url, { uf: null }) }] : []),
    ...(filtros.vendedor ? [{ rotulo: filtros.vendedor === "loja" ? "Lojas" : "Particulares", href: urlBusca(url, { vendedor: null }) }] : []),
  ];

  return (
    <div className="conteiner pt-6">
      <nav aria-label="Trilha" className="text-sm text-suave">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link to="/" className="hover:text-tinta hover:underline">Início</Link></li>
          <li aria-hidden="true">/</li>
          <li>{marcaNome ? <Link to="/carros" className="hover:text-tinta hover:underline">Carros</Link> : <span className="text-tinta">Carros</span>}</li>
          {marcaNome && (<><li aria-hidden="true">/</li><li>{modeloNome ? <Link to={`/carros/${filtros.marca}`} className="hover:text-tinta hover:underline">{marcaNome}</Link> : <span className="text-tinta">{marcaNome}</span>}</li></>)}
          {modeloNome && (<><li aria-hidden="true">/</li><li className="text-tinta">{modeloNome}</li></>)}
        </ol>
      </nav>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-tinta sm:text-3xl">{titulo}</h1>
          <p className="numeros mt-1 text-suave" aria-live="polite">
            {inteiro(total)} {total === 1 ? "anúncio encontrado" : "anúncios encontrados"}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Um formulário só: barra lateral no desktop, gaveta no celular. */}
        <div className={cn(gaveta ? "fixed inset-0 z-50 bg-tinta/40 lg:static lg:bg-transparent" : "hidden lg:block")}
          onClick={(e) => e.target === e.currentTarget && setGaveta(false)}>
          <aside aria-label="Filtros"
            className={cn("bg-white lg:sticky lg:top-24 lg:self-start lg:rounded-2xl lg:border lg:border-linha lg:shadow-card",
              gaveta && "absolute inset-y-0 left-0 w-[88%] max-w-sm overflow-y-auto shadow-flutuante lg:relative lg:w-auto lg:max-w-none lg:overflow-visible")}>
            <div className="flex items-center justify-between border-b border-linha px-5 py-4">
              <h2 className="font-bold text-tinta">Filtros</h2>
              <button type="button" onClick={() => setGaveta(false)} className="botao-fantasma h-9 w-9 px-0 lg:hidden" aria-label="Fechar filtros">
                <X className="size-5" />
              </button>
            </div>

            <div className="border-b border-linha px-5 py-4">
              <h3 className="text-sm font-semibold text-tinta">{marcaNome ? "Modelo" : "Marca"}</h3>
              <ul className="mt-2 max-h-72 space-y-0.5 overflow-y-auto pr-1">
                {marcaNome ? (
                  <>
                    <li><Link to={urlBusca(url, {}, `/carros/${filtros.marca}`)} className={cn("flex justify-between rounded-md px-2 py-1.5 text-sm hover:bg-fundo", !modeloNome && "font-semibold text-marca-700")}>Todos os modelos</Link></li>
                    {modelosFaceta.map((m) => (
                      <li key={m.slug}>
                        <Link to={urlBusca(url, {}, `/carros/${filtros.marca}/${m.slug}`)}
                          className={cn("flex justify-between rounded-md px-2 py-1.5 text-sm hover:bg-fundo", filtros.modelo === m.slug ? "font-semibold text-marca-700" : "text-texto")}>
                          <span>{m.nome}</span><span className="numeros text-fraco">{m.total}</span>
                        </Link>
                      </li>
                    ))}
                  </>
                ) : marcasFaceta.map((m) => (
                  <li key={m.slug}>
                    <Link to={urlBusca(url, {}, `/carros/${m.slug}`)} className="flex justify-between rounded-md px-2 py-1.5 text-sm text-texto hover:bg-fundo">
                      <span>{m.nome}</span><span className="numeros text-fraco">{m.total}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <Form ref={formRef} method="get" action={location.pathname} className="divide-y divide-linha"
              // Desktop: aplica ao mudar. Na gaveta do celular, espera o botão.
              onChange={(e) => !gaveta && aplicar((e.target as unknown as HTMLInputElement).type === "number" ? 700 : 0)}
              onSubmit={(e) => { e.preventDefault(); enviarLimpo(false); setGaveta(false); }}>
              {filtros.q && <input type="hidden" name="q" value={filtros.q} />}
              {filtros.ordem !== "recentes" && <input type="hidden" name="ordem" value={filtros.ordem} />}

              <fieldset className="px-5 py-4">
                <legend className="text-sm font-semibold text-tinta">Preço</legend>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="f-preco-min" className="sr-only">Preço mínimo</label>
                    <input id="f-preco-min" name="preco_min" type="number" inputMode="numeric" min={0} step={1000} placeholder="Mínimo" defaultValue={filtros.precoMin} className="campo h-10 text-sm" />
                  </div>
                  <div>
                    <label htmlFor="f-preco-max" className="sr-only">Preço máximo</label>
                    <input id="f-preco-max" name="preco_max" type="number" inputMode="numeric" min={0} step={1000} placeholder="Máximo" defaultValue={filtros.precoMax} className="campo h-10 text-sm" />
                  </div>
                </div>
              </fieldset>

              <fieldset className="px-5 py-4">
                <legend className="text-sm font-semibold text-tinta">Ano</legend>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="f-ano-min" className="sr-only">Ano a partir de</label>
                    <select id="f-ano-min" name="ano_min" defaultValue={filtros.anoMin ?? ""} className="campo h-10 text-sm">
                      <option value="">De</option>
                      {ANOS.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="f-ano-max" className="sr-only">Ano até</label>
                    <select id="f-ano-max" name="ano_max" defaultValue={filtros.anoMax ?? ""} className="campo h-10 text-sm">
                      <option value="">Até</option>
                      {ANOS.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                </div>
              </fieldset>

              <div className="px-5 py-4">
                <label htmlFor="f-km" className="text-sm font-semibold text-tinta">Quilometragem</label>
                <select id="f-km" name="km_max" defaultValue={filtros.kmMax ?? ""} className="campo mt-2 h-10 text-sm">
                  <option value="">Qualquer</option>
                  {KMS.map((k) => <option key={k} value={k}>Até {fmtKm(k)}</option>)}
                </select>
              </div>

              {([
                ["carroceria", "Carroceria", CARROCERIAS, filtros.carroceria],
                ["cambio", "Câmbio", CAMBIOS, filtros.cambio],
                ["combustivel", "Combustível", COMBUSTIVEIS, filtros.combustivel],
              ] as const).map(([nome, rotulo, opcoes, marcados]) => (
                <fieldset key={nome} className="px-5 py-4">
                  <legend className="text-sm font-semibold text-tinta">{rotulo}</legend>
                  <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1">
                    {opcoes.map((o) => (
                      <label key={o} className="flex cursor-pointer items-center gap-2 rounded-md py-1 text-sm text-texto">
                        <input type="checkbox" name={nome} value={o} defaultChecked={(marcados as readonly string[]).includes(o)}
                          className="size-4 rounded border-linha-forte accent-marca-600" />
                        {o}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}

              <div className="px-5 py-4">
                <label htmlFor="f-uf" className="text-sm font-semibold text-tinta">Estado</label>
                <select id="f-uf" name="uf" defaultValue={filtros.uf ?? ""} className="campo mt-2 h-10 text-sm">
                  <option value="">Todo o Brasil</option>
                  {UFS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>

              <fieldset className="px-5 py-4">
                <legend className="text-sm font-semibold text-tinta">Anunciante</legend>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  {[["", "Todos"], ["particular", "Particular"], ["loja", "Loja"]].map(([valor, rotulo]) => (
                    <label key={valor} className="flex cursor-pointer items-center gap-2 py-1 text-sm text-texto">
                      <input type="radio" name="vendedor" value={valor} defaultChecked={(filtros.vendedor ?? "") === valor} className="size-4 accent-marca-600" />
                      {rotulo}
                    </label>
                  ))}
                </div>
              </fieldset>

              {/* Sem JavaScript o filtro não aplica sozinho: o botão cobre esse caso e fecha a gaveta no celular. */}
              <div className="sticky bottom-0 bg-white px-5 py-4 lg:static">
                {/* O total aqui seria o da busca anterior, não o dos filtros ainda
                    não aplicados — por isso o rótulo não mostra número. */}
                <button type="submit" className="botao-primario w-full">Aplicar filtros</button>
              </div>
            </Form>
          </aside>
        </div>

        <section aria-labelledby="titulo-resultados">
          {/* No celular a barra de filtros (com o h2 dela) fica escondida; sem
              este título a hierarquia saltaria do h1 direto para os h3 dos cards. */}
          <h2 id="titulo-resultados" className="sr-only">Resultados</h2>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setGaveta(true)} className="botao-secundario h-10 px-4 text-sm lg:hidden">
              <SlidersHorizontal className="size-4" aria-hidden="true" /> Filtros{ativos.length > 0 && ` (${ativos.length})`}
            </button>

            {ativos.map((a) => (
              <Link key={a.rotulo} to={a.href} preventScrollReset
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-marca-200 bg-marca-50 pl-3 pr-2 text-sm font-medium text-marca-800 hover:border-marca-600"
                aria-label={`Remover filtro ${a.rotulo}`}>
                {a.rotulo} <X className="size-3.5" aria-hidden="true" />
              </Link>
            ))}
            {ativos.length > 1 && (
              <Link to="/carros" className="text-sm font-semibold text-suave underline hover:text-tinta">Limpar tudo</Link>
            )}

            <Form method="get" action={location.pathname} className="ml-auto flex items-center gap-2">
              {[...url.searchParams].filter(([k]) => k !== "ordem" && k !== "pagina").map(([k, v], i) => (
                <input key={`${k}-${i}`} type="hidden" name={k} value={v} />
              ))}
              <label htmlFor="ordem" className="text-sm text-suave">Ordenar</label>
              <select id="ordem" name="ordem" defaultValue={filtros.ordem} className="campo h-10 w-auto text-sm"
                onChange={(e) => submit(e.currentTarget.form, { preventScrollReset: true })}>
                {ORDENACOES.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
              </select>
            </Form>
          </div>

          {anuncios.length ? (
            <ul className={cn("mt-5 grid gap-4 transition-opacity sm:grid-cols-2 xl:grid-cols-3", carregando && "opacity-50")}>
              {anuncios.map((a, i) => <li key={a.id}><AnuncioCard anuncio={a} prioridade={i < 3} /></li>)}
            </ul>
          ) : (
            <div className="cartao mt-5 px-6 py-14 text-center">
              <h2 className="text-lg font-bold text-tinta">Nenhum carro com esses filtros</h2>
              <p className="mx-auto mt-2 max-w-sm text-suave">Tire algum filtro para ampliar a busca.</p>
              <Link to="/carros" className="botao-secundario mt-6">Ver todos os carros</Link>
            </div>
          )}

          {totalPaginas > 1 && (
            <nav aria-label="Paginação" className="mt-10 flex items-center justify-center gap-1">
              {filtros.pagina > 1 && (
                <Link to={urlBusca(url, { pagina: String(filtros.pagina - 1) })} className="botao-secundario h-10 w-10 px-0" aria-label="Página anterior">
                  <ChevronLeft className="size-4" />
                </Link>
              )}
              {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPaginas || Math.abs(p - filtros.pagina) <= 2)
                .map((p, i, lista) => (
                  <span key={p} className="flex items-center gap-1">
                    {i > 0 && p - lista[i - 1] > 1 && <span className="px-1 text-fraco">…</span>}
                    <Link to={urlBusca(url, { pagina: String(p) })} aria-current={p === filtros.pagina ? "page" : undefined}
                      className={cn("numeros grid h-10 min-w-10 place-items-center rounded-lg px-3 text-sm font-semibold",
                        p === filtros.pagina ? "bg-tinta text-white" : "border border-linha-forte bg-white text-tinta hover:border-tinta")}>
                      {p}
                    </Link>
                  </span>
                ))}
              {filtros.pagina < totalPaginas && (
                <Link to={urlBusca(url, { pagina: String(filtros.pagina + 1) })} className="botao-secundario h-10 w-10 px-0" aria-label="Próxima página">
                  <ChevronRight className="size-4" />
                </Link>
              )}
            </nav>
          )}
        </section>
      </div>
    </div>
  );
}
