import { ArrowRight, BadgeCheck, Clock, FileCheck2, MapPin, Search, Wrench } from "lucide-react";
import { useState } from "react";
import { Form, Link } from "react-router";
import { destaques, marcasComEstoque, modelosComEstoque } from "~/.server/anuncios";
import { AnuncioCard } from "~/components/AnuncioCard";
import { CarroPlaceholder } from "~/components/CarroPlaceholder";
import { IconeWhatsApp } from "~/components/WhatsApp";
import { inteiro, linkWhatsApp, moeda } from "~/lib/formato";
import { lojaDasRotas } from "~/lib/site";
import { useLoja } from "~/lib/useLoja";
import type { Route } from "./+types/home";

export async function loader({ request }: Route.LoaderArgs) {
  const [vitrine, marcas, modelos] = await Promise.all([destaques(8), marcasComEstoque(), modelosComEstoque()]);
  return { vitrine, marcas, modelos, origem: new URL(request.url).origin };
}

export function meta({ loaderData, matches }: Route.MetaArgs) {
  const loja = lojaDasRotas(matches);
  const total = loaderData?.marcas.reduce((s, m) => s + m.total, 0) ?? 0;
  const onde = loja.cidade ? ` em ${loja.cidade}` : "";
  return [
    { title: `${loja.nome} — carros seminovos${onde}` },
    { name: "description", content: `${inteiro(total)} carros seminovos à venda${onde} — ${loja.nome}. ${loja.slogan}`.trim() },
    { property: "og:title", content: `${loja.nome} — carros seminovos${onde}` },
    ...(loaderData ? [{ tagName: "link", rel: "canonical", href: `${loaderData.origem}/` }] : []),
  ];
}

const FAIXAS_PRECO = [50000, 80000, 100000, 150000, 200000, 300000];
const CATEGORIAS = ["SUV", "Sedã", "Hatch", "Picape"];
// Textos genéricos de propósito: cada loja ajusta aqui ao que realmente oferece.
const DIFERENCIAIS = [
  { icone: FileCheck2, titulo: "Carros selecionados", texto: "Documentação conferida antes de o carro entrar no estoque." },
  { icone: Wrench, titulo: "Seu carro na troca", texto: "Traga o seu para avaliação e use como parte do pagamento." },
  { icone: BadgeCheck, titulo: "Financiamento", texto: "Simulamos com os bancos parceiros para achar a melhor parcela." },
];

export default function Home({ loaderData }: Route.ComponentProps) {
  const { vitrine, marcas, modelos } = loaderData;
  const loja = useLoja();
  const total = marcas.reduce((s, m) => s + m.total, 0);
  const [marcaSel, setMarcaSel] = useState("");
  const anoAtual = new Date().getFullYear();

  return (
    <>
      <section className="relative overflow-hidden bg-noite">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_0%,rgb(211_20_31/0.45),transparent_55%)]" />
        <div aria-hidden="true" className="absolute -right-24 top-0 hidden h-full w-[46%] -skew-x-12 bg-marca-600/90 lg:block" />
        <div aria-hidden="true" className="absolute -right-24 top-0 hidden h-full w-[40%] -skew-x-12 bg-noite-2 lg:block" />
        <div className="conteiner relative pb-28 pt-12 sm:pt-16">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-marca-200">{loja.nome}</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl">
            {loja.slogan || "Seu próximo carro está aqui."}
          </h1>
          <p className="mt-4 max-w-xl text-lg text-white/75">
            <span className="numeros font-semibold text-white">{inteiro(total)}</span> {total === 1 ? "carro disponível" : "carros disponíveis"}
            {loja.cidade && <> em {loja.cidade}</>}.
          </p>
        </div>
      </section>

      {/* O cartão de busca sobe sobre a faixa escura: é a ação principal da página. */}
      <section aria-labelledby="titulo-busca" className="conteiner relative -mt-20">
        {/* GET simples para /carros: a rota de busca converte ?marca= e ?modelo=
            no caminho. Funciona igual com e sem JavaScript. */}
        <Form method="get" action="/carros" className="rounded-xl bg-white p-5 shadow-flutuante sm:p-6">
          <h2 id="titulo-busca" className="text-lg font-bold text-tinta">Encontre seu carro</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
            <div>
              <label htmlFor="h-marca" className="rotulo">Marca</label>
              <select id="h-marca" name="marca" className="campo" value={marcaSel} onChange={(e) => setMarcaSel(e.target.value)}>
                <option value="">Todas as marcas</option>
                {marcas.map((m) => <option key={m.slug} value={m.slug}>{m.nome}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="h-modelo" className="rotulo">Modelo</label>
              <select id="h-modelo" name="modelo" className="campo" disabled={!marcaSel}>
                <option value="">{marcaSel ? "Todos os modelos" : "Escolha a marca"}</option>
                {(modelos[marcaSel] ?? []).map((m) => <option key={m.slug} value={m.slug}>{m.nome}</option>)}
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

      <section aria-labelledby="titulo-vitrine" className="conteiner mt-14">
        <div className="flex items-end justify-between gap-4">
          <h2 id="titulo-vitrine" className="text-2xl font-extrabold tracking-tight text-tinta">Destaques do estoque</h2>
          <Link to="/carros" className="-my-2 inline-flex items-center gap-1 py-2 text-sm font-semibold text-marca-700 hover:underline">
            Ver estoque completo <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        {vitrine.length ? (
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {vitrine.map((a, i) => <li key={a.id}><AnuncioCard anuncio={a} prioridade={i < 4} /></li>)}
          </ul>
        ) : (
          <p className="cartao mt-5 p-8 text-suave">O estoque está sendo atualizado. Fale com a gente para saber das novidades.</p>
        )}
      </section>

      <section aria-labelledby="titulo-categorias" className="conteiner mt-16">
        <h2 id="titulo-categorias" className="text-2xl font-extrabold tracking-tight text-tinta">Busque por categoria</h2>
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CATEGORIAS.map((c) => (
            <li key={c}>
              <Link to={`/carros?carroceria=${encodeURIComponent(c)}`}
                className="group block overflow-hidden rounded-xl border border-linha bg-white shadow-card transition-shadow hover:shadow-card-hover">
                <CarroPlaceholder carroceria={c} className="aspect-[16/9] w-full transition-transform duration-500 group-hover:scale-[1.04]" />
                <span className="flex items-center justify-between px-4 py-3 font-bold text-tinta">
                  {c}
                  <ArrowRight className="size-4 text-fraco transition-transform group-hover:translate-x-0.5 group-hover:text-marca-600" aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {marcas.length > 0 && (
        <section aria-labelledby="titulo-marcas" className="conteiner mt-16">
          <h2 id="titulo-marcas" className="text-2xl font-extrabold tracking-tight text-tinta">Marcas no estoque</h2>
          <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {marcas.map((m) => (
              <li key={m.slug}>
                <Link to={`/carros/${m.slug}`} className="flex h-full flex-col rounded-xl border border-linha bg-white px-4 py-3.5 transition-colors hover:border-marca-600">
                  <span className="font-bold text-tinta">{m.nome}</span>
                  <span className="numeros text-sm text-suave">{m.total} {m.total === 1 ? "carro" : "carros"}</span>
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

      <section aria-labelledby="titulo-loja" className="conteiner mt-16">
        <div className="grid overflow-hidden rounded-2xl bg-noite text-white lg:grid-cols-[1.1fr_1fr]">
          <div className="p-6 sm:p-10">
            <h2 id="titulo-loja" className="text-3xl font-extrabold tracking-tight">Por que comprar com a gente</h2>
            <ul className="mt-6 grid gap-5">
              {DIFERENCIAIS.map(({ icone: Icone, titulo, texto }) => (
                <li key={titulo} className="flex gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-marca-600"><Icone className="size-5" aria-hidden="true" /></span>
                  <div>
                    <h3 className="font-bold">{titulo}</h3>
                    <p className="mt-0.5 text-sm text-white/70">{texto}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col justify-center gap-4 border-t border-white/10 bg-noite-2 p-6 sm:p-10 lg:border-l lg:border-t-0">
            <p className="text-lg font-semibold">Quer ver um carro de perto ou avaliar o seu na troca?</p>
            <div className="flex flex-wrap gap-3">
              {loja.whatsapp && (
                <a href={linkWhatsApp(loja.whatsapp, `Olá! Vim pelo site ${loja.nome}.`)} target="_blank" rel="noopener noreferrer" className="botao-primario">
                  <IconeWhatsApp className="size-[18px]" /> Chamar no WhatsApp
                </a>
              )}
              <Link to="/contato" className="botao border border-white/30 text-white hover:bg-white/10">
                <MapPin className="size-[18px]" aria-hidden="true" /> Como chegar
              </Link>
            </div>
            <p className="flex items-center gap-2 text-sm text-white/70">
              <Clock className="size-4" aria-hidden="true" /> Atendimento com hora marcada ou direto na loja.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
