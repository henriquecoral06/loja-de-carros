import { ArrowRight, BadgeCheck, FileCheck2, MapPin, Search, Wrench } from "lucide-react";
import { useState } from "react";
import { Form, Link } from "react-router";
import { destaques, marcasComEstoque, modelosComEstoque } from "~/.server/anuncios";
import { AnuncioCard } from "~/components/AnuncioCard";
import { IconeWhatsApp, LinkWhatsApp } from "~/components/WhatsApp";
import { inteiro, moeda } from "~/lib/formato";
import { lojaDasRotas } from "~/lib/site";
import { useLoja } from "~/lib/useLoja";
import { videoDeFundo, type VideoFundo } from "~/lib/video";
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

// Fotos do Unsplash (licença livre, uso comercial permitido).
const foto = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&h=520&q=70`;
const CATEGORIAS = [
  { nome: "SUV", imagem: foto("1506015391300-4802dc74de2e") },
  { nome: "Sedã", imagem: foto("1722088386522-7cafb8a7e234") },
  { nome: "Hatch", imagem: foto("1572811298797-9eecadf6cb24") },
  { nome: "Picape", imagem: foto("1552745998-234af3caf5b6") },
];

// Textos genéricos de propósito: cada loja ajusta aqui ao que realmente oferece.
const DIFERENCIAIS = [
  { icone: FileCheck2, titulo: "Carros selecionados", texto: "Documentação conferida antes de o carro entrar no estoque." },
  { icone: Wrench, titulo: "Seu carro na troca", texto: "Traga o seu para avaliação e use como parte do pagamento." },
  { icone: BadgeCheck, titulo: "Financiamento", texto: "Simulamos com os bancos parceiros para achar a melhor parcela." },
];

const tituloSecao = "text-2xl font-extrabold tracking-tight text-tinta sm:text-[28px]";

export default function Home({ loaderData }: Route.ComponentProps) {
  const { vitrine, marcas, modelos } = loaderData;
  const loja = useLoja();
  const total = marcas.reduce((s, m) => s + m.total, 0);
  const [marcaSel, setMarcaSel] = useState("");
  const anoAtual = new Date().getFullYear();
  const video = videoDeFundo(loja.heroVideo);

  return (
    <>
      <section className="relative isolate overflow-hidden bg-noite">
        <img src={loja.banner} alt="" className="absolute inset-0 -z-10 size-full object-cover" fetchPriority="high" />
        {video && <VideoHero video={video} />}
        {/* Degradê garante leitura do texto branco sobre qualquer foto de banner. */}
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-noite via-noite/85 to-noite/30" />
        <div className="conteiner pb-32 pt-14 sm:pb-36 sm:pt-20">
          <h1 className="max-w-2xl text-balance text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl">
            {loja.heroTitulo || loja.slogan || "Seu próximo carro está aqui"}
          </h1>
          <p className="mt-4 max-w-xl text-lg text-white/80">
            {loja.heroSubtitulo || (
              <><span className="numeros font-bold text-white">{inteiro(total)}</span> {total === 1 ? "carro disponível" : "carros disponíveis"}{loja.cidade ? ` em ${loja.cidade}` : ""}</>
            )}
          </p>
        </div>
      </section>

      {/* O cartão de busca sobe sobre o banner: é a ação principal da página. */}
      <section aria-labelledby="titulo-busca" className="conteiner relative -mt-20">
        {/* GET simples para /carros: a rota de busca converte ?marca= e ?modelo=
            no caminho. Funciona igual com e sem JavaScript. */}
        <Form method="get" action="/carros" className="rounded-2xl bg-white p-5 shadow-flutuante sm:p-6">
          <h2 id="titulo-busca" className="text-lg font-bold text-tinta">Encontre seu carro</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto] lg:items-end">
            <div>
              <label htmlFor="h-marca" className="rotulo">Marca</label>
              <select id="h-marca" name="marca" className="campo" value={marcaSel} onChange={(e) => setMarcaSel(e.target.value)}>
                <option value="">Todas</option>
                {marcas.map((m) => <option key={m.slug} value={m.slug}>{m.nome}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="h-modelo" className="rotulo">Modelo</label>
              <select id="h-modelo" name="modelo" className="campo" disabled={!marcaSel}>
                <option value="">Todos</option>
                {(modelos[marcaSel] ?? []).map((m) => <option key={m.slug} value={m.slug}>{m.nome}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="h-preco" className="rotulo">Preço até</label>
              <select id="h-preco" name="preco_max" className="campo" defaultValue="">
                <option value="">Qualquer</option>
                {FAIXAS_PRECO.map((v) => <option key={v} value={v}>{moeda(v)}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="h-ano" className="rotulo">Ano mínimo</label>
              <select id="h-ano" name="ano_min" className="campo" defaultValue="">
                <option value="">Qualquer</option>
                {Array.from({ length: 16 }, (_, i) => anoAtual - i).map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <button type="submit" className="botao-primario col-span-2 w-full lg:col-span-1 lg:w-auto lg:px-8">
              <Search className="size-[18px]" aria-hidden="true" /> Buscar
            </button>
          </div>
        </Form>
      </section>

      <section aria-labelledby="titulo-vitrine" className="conteiner mt-16">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <h2 id="titulo-vitrine" className={tituloSecao}>Destaques do estoque</h2>
          <Link to="/carros" className="inline-flex items-center gap-1 py-2 text-sm font-semibold text-marca-700 hover:underline">
            Ver todos os {inteiro(total)} carros <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        {vitrine.length ? (
          // Celular: carrossel com rolagem lateral (os 8 destaques empilhados davam uma rolagem enorme).
          <ul className="-mx-4 mt-5 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
            {vitrine.map((a, i) => <li key={a.id} className="w-[78%] shrink-0 snap-start sm:w-auto"><AnuncioCard anuncio={a} prioridade={i < 4} /></li>)}
          </ul>
        ) : (
          <p className="cartao mt-5 p-8 text-suave">O estoque está sendo atualizado. Fale com a gente para saber das novidades.</p>
        )}
      </section>

      <section aria-labelledby="titulo-categorias" className="conteiner mt-16">
        <h2 id="titulo-categorias" className={tituloSecao}>Busque por categoria</h2>
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {CATEGORIAS.map((c) => (
            <li key={c.nome}>
              <Link to={`/carros?carroceria=${encodeURIComponent(c.nome)}`}
                className="group relative block aspect-[4/3] overflow-hidden rounded-xl bg-noite shadow-card sm:aspect-[16/10]">
                <img src={c.imagem} alt="" loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                <span className="absolute inset-x-0 bottom-0 flex items-center justify-between p-4 text-lg font-bold text-white">
                  {c.nome}
                  <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {marcas.length > 0 && (
        <section aria-labelledby="titulo-marcas" className="conteiner mt-16">
          <h2 id="titulo-marcas" className={tituloSecao}>Marcas no estoque</h2>
          <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {marcas.map((m) => (
              <li key={m.slug}>
                <Link to={`/carros/${m.slug}`} className="flex h-full items-center justify-between gap-2 rounded-xl border border-linha bg-white px-4 py-3.5 transition-colors hover:border-marca-600">
                  <span className="min-w-0 text-[15px] font-bold leading-tight text-tinta">{m.nome}</span>
                  <span className="numeros shrink-0 rounded-full bg-fundo px-2 py-0.5 text-xs font-semibold text-suave">{m.total}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="titulo-preco" className="conteiner mt-16">
        <h2 id="titulo-preco" className={tituloSecao}>Por faixa de preço</h2>
        <ul className="mt-5 flex flex-wrap gap-2">
          {FAIXAS_PRECO.map((v) => (
            <li key={v}>
              <Link to={`/carros?preco_max=${v}`} className="numeros inline-flex h-11 items-center rounded-full border border-linha-forte bg-white px-5 text-sm font-semibold text-tinta transition-colors hover:border-marca-600 hover:text-marca-700">
                Até {moeda(v)}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="titulo-loja" className="conteiner mt-16">
        <div className="grid overflow-hidden rounded-2xl bg-noite text-white lg:grid-cols-[1.15fr_1fr]">
          <div className="p-6 sm:p-10">
            <h2 id="titulo-loja" className="text-2xl font-extrabold tracking-tight sm:text-3xl">Por que comprar com a gente</h2>
            <ul className="mt-7 grid gap-6">
              {DIFERENCIAIS.map(({ icone: Icone, titulo, texto }) => (
                <li key={titulo} className="flex gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-marca-600 text-sobre-marca"><Icone className="size-5" aria-hidden="true" /></span>
                  <div>
                    <h3 className="font-bold">{titulo}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-white/70">{texto}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col justify-center border-t border-white/10 bg-noite-2 p-6 sm:p-10 lg:border-l lg:border-t-0">
            <h3 className="text-xl font-bold leading-snug">Quer ver um carro de perto ou avaliar o seu na troca?</h3>
            <p className="mt-2 text-white/70">Fale com a equipe e agende sua visita{loja.horario ? `: ${loja.horario}.` : "."}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <LinkWhatsApp className="botao-primario">
                <IconeWhatsApp className="size-[18px]" /> Chamar no WhatsApp
              </LinkWhatsApp>
              <Link to="/contato" className="botao border border-white/30 text-white hover:bg-white/10">
                <MapPin className="size-[18px]" aria-hidden="true" /> Como chegar
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/**
 * Vídeo sem som e em loop por trás do texto. A foto do banner fica embaixo
 * como capa enquanto carrega; quem pediu menos movimento no sistema não vê o vídeo.
 */
function VideoHero({ video }: { video: NonNullable<VideoFundo> }) {
  return (
    <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden motion-reduce:hidden">
      {video.tipo === "arquivo" ? (
        <video src={video.src} autoPlay muted loop playsInline className="size-full object-cover" />
      ) : (
        // 16:9 cobrindo a área toda, como object-cover faria.
        <iframe src={video.src} title="Vídeo de fundo" tabIndex={-1} allow="autoplay; encrypted-media"
          className="pointer-events-none absolute left-1/2 top-1/2 h-[max(100%,56.25vw)] w-[max(100%,177.78vh)] -translate-x-1/2 -translate-y-1/2 border-0" />
      )}
    </div>
  );
}
