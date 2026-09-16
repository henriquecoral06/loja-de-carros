import { ArrowRight, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Form, Link } from "react-router";
import { catalogo, marcasComEstoque, recentes } from "~/.server/anuncios";
import { db, schema } from "~/.server/db";
import { AnuncioCard } from "~/components/AnuncioCard";
import { CarroPlaceholder } from "~/components/CarroPlaceholder";
import { inteiro, moeda } from "~/lib/formato";
import { SITE } from "~/lib/site";
import { count, eq } from "drizzle-orm";
import type { Route } from "./+types/home";

export function meta({ loaderData }: Route.MetaArgs) {
  const total = loaderData?.total ?? 0;
  return [
    { title: `${SITE.nome} — carros usados e seminovos à venda` },
    { name: "description", content: `${inteiro(total)} ofertas de carros de particulares e lojas. ${SITE.descricao}` },
    { property: "og:title", content: `${SITE.nome} — carros usados e seminovos` },
    { property: "og:description", content: SITE.descricao },
  ];
}

export async function loader() {
  const [lista, marcas, cat, [{ total }]] = await Promise.all([
    recentes(8),
    marcasComEstoque(),
    catalogo(),
    db.select({ total: count() }).from(schema.anuncios).where(eq(schema.anuncios.status, "ativo")),
  ]);
  return { recentes: lista, marcas, catalogo: cat, total };
}

const FAIXAS_PRECO = [30000, 50000, 70000, 100000, 150000, 200000, 300000];
const categorias = [
  { nome: "SUV", carroceria: "SUV" },
  { nome: "Sedã", carroceria: "Sedã" },
  { nome: "Hatch", carroceria: "Hatch" },
  { nome: "Picape", carroceria: "Picape" },
];

export default function Home({ loaderData }: Route.ComponentProps) {
  const { recentes: lista, marcas, catalogo: cat, total } = loaderData;
  const [marcaSel, setMarcaSel] = useState("");
  const modelos = useMemo(() => cat.find((m) => m.slug === marcaSel)?.modelos ?? [], [cat, marcaSel]);
  const anoAtual = new Date().getFullYear();

  return (
    <>
      <section className="relative overflow-hidden bg-noite">
        {/* Grade sutil de fundo: textura sem precisar de foto de banco. */}
        <div aria-hidden="true" className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgb(255_255_255)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255)_1px,transparent_1px)] [background-size:44px_44px]" />
        <div aria-hidden="true" className="absolute -right-40 -top-40 size-[520px] rounded-full bg-marca-600/30 blur-3xl" />

        <div className="conteiner relative pb-24 pt-14 sm:pt-20">
          <h1 className="max-w-2xl text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl">
            Encontre o carro certo, direto de quem vende.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-white/75">
            <span className="numeros font-semibold text-white">{inteiro(total)}</span> ofertas de particulares e lojas em todo o Brasil.
          </p>
        </div>
      </section>

      {/* O cartão de busca sobe sobre a faixa escura: é a ação principal da página. */}
      <section aria-labelledby="titulo-busca" className="conteiner relative -mt-16">
        {/* GET simples para /carros: a rota de busca converte ?marca= e ?modelo=
            no caminho. Funciona igual com e sem JavaScript. */}
        <Form method="get" action="/carros" className="cartao p-5 shadow-flutuante sm:p-6">
          <h2 id="titulo-busca" className="text-lg font-bold text-tinta">Buscar carros</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
            <div>
              <label htmlFor="h-marca" className="rotulo">Marca</label>
              <select id="h-marca" name="marca" className="campo" value={marcaSel} onChange={(e) => setMarcaSel(e.target.value)}>
                <option value="">Todas as marcas</option>
                {cat.map((m) => <option key={m.slug} value={m.slug}>{m.nome}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="h-modelo" className="rotulo">Modelo</label>
              <select id="h-modelo" name="modelo" className="campo" disabled={!marcaSel}>
                <option value="">{marcaSel ? "Todos os modelos" : "Escolha a marca"}</option>
                {modelos.map((m) => <option key={m.slug} value={m.slug}>{m.nome}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="h-preco" className="rotulo">Preço até</label>
              <select id="h-preco" name="preco_max" className="campo" defaultValue="">
                <option value="">Qualquer preço</option>
                {FAIXAS_PRECO.map((v) => <option key={v} value={v}>{moeda(v)}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="h-ano" className="rotulo">Ano a partir de</label>
              <select id="h-ano" name="ano_min" className="campo" defaultValue="">
                <option value="">Qualquer ano</option>
                {Array.from({ length: 16 }, (_, i) => anoAtual - i).map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button type="submit" className="botao-primario w-full lg:w-auto lg:px-7">
                <Search className="size-[18px]" aria-hidden="true" /> Buscar
              </button>
            </div>
          </div>
        </Form>
      </section>

      <section aria-labelledby="titulo-categorias" className="conteiner mt-14">
        <h2 id="titulo-categorias" className="text-2xl font-extrabold tracking-tight text-tinta">Explore por categoria</h2>
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {categorias.map((c) => (
            <li key={c.nome}>
              <Link to={`/carros?carroceria=${encodeURIComponent(c.carroceria)}`}
                className="group block overflow-hidden rounded-2xl border border-linha bg-white shadow-card transition-shadow hover:shadow-card-hover">
                <CarroPlaceholder carroceria={c.carroceria} className="aspect-[16/9] w-full transition-transform duration-500 group-hover:scale-[1.04]" />
                <span className="flex items-center justify-between px-4 py-3 font-bold text-tinta">
                  {c.nome}
                  <ArrowRight className="size-4 text-fraco transition-transform group-hover:translate-x-0.5 group-hover:text-marca-600" aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="titulo-recentes" className="conteiner mt-16">
        <div className="flex items-end justify-between gap-4">
          <h2 id="titulo-recentes" className="text-2xl font-extrabold tracking-tight text-tinta">Anúncios recentes</h2>
          <Link to="/carros" className="-my-2 inline-flex items-center gap-1 py-2 text-sm font-semibold text-marca-700 hover:underline">
            Ver todos <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        {lista.length ? (
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {lista.map((a, i) => <li key={a.id}><AnuncioCard anuncio={a} prioridade={i < 4} /></li>)}
          </ul>
        ) : (
          <p className="cartao mt-5 p-8 text-suave">Ainda não há anúncios. <Link to="/painel/anuncios/novo" className="font-semibold text-marca-700 underline">Seja o primeiro a anunciar.</Link></p>
        )}
      </section>

      {marcas.length > 0 && (
        <section aria-labelledby="titulo-marcas" className="conteiner mt-16">
          <h2 id="titulo-marcas" className="text-2xl font-extrabold tracking-tight text-tinta">Marcas mais procuradas</h2>
          <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {marcas.map((m) => (
              <li key={m.slug}>
                <Link to={`/carros/${m.slug}`} className="flex h-full flex-col rounded-xl border border-linha bg-white px-4 py-3.5 transition-colors hover:border-marca-600">
                  <span className="font-bold text-tinta">{m.nome}</span>
                  <span className="numeros text-sm text-suave">{m.total} {m.total === 1 ? "oferta" : "ofertas"}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="titulo-preco" className="conteiner mt-16">
        <h2 id="titulo-preco" className="text-2xl font-extrabold tracking-tight text-tinta">Por faixa de preço</h2>
        <ul className="mt-5 flex flex-wrap gap-2">
          {FAIXAS_PRECO.map((v) => (
            <li key={v}>
              <Link to={`/carros?preco_max=${v}`} className="numeros inline-flex h-10 items-center rounded-full border border-linha-forte bg-white px-4 text-sm font-semibold text-tinta transition-colors hover:border-marca-600 hover:text-marca-700">
                Até {moeda(v)}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="titulo-vender" className="conteiner mt-16">
        <div className="relative overflow-hidden rounded-3xl bg-marca-600 px-6 py-10 text-white sm:px-10 sm:py-12">
          <div aria-hidden="true" className="absolute -bottom-24 -right-16 size-80 rounded-full bg-white/10" />
          <div className="relative grid items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <h2 id="titulo-vender" className="text-3xl font-extrabold tracking-tight">Vender seu carro é grátis</h2>
              <p className="mt-3 max-w-md text-white/85">Crie o anúncio em poucos minutos e receba as mensagens dos interessados no seu painel.</p>
              <Link to="/painel/anuncios/novo" className="botao mt-6 bg-white text-marca-700 hover:bg-marca-50">
                Anunciar agora <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
            {/* Etapas são uma sequência real, então a numeração carrega informação. */}
            <ol className="grid gap-3">
              {["Crie sua conta", "Cadastre o carro com fotos", "Converse com os compradores"].map((etapa, i) => (
                <li key={etapa} className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3">
                  <span className="numeros grid size-8 shrink-0 place-items-center rounded-full bg-white text-sm font-bold text-marca-700">{i + 1}</span>
                  <span className="font-semibold">{etapa}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </>
  );
}
