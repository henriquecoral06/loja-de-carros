import { ArrowRight, ArrowUpRight, Car, Clock, MapPin, Navigation, Phone, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { IconeWhatsApp } from "~/components/WhatsApp";
import { cn } from "~/lib/ui";
import {
  Ampliacao, BlocoDepoimentos, BlocoEtapas, BlocoNumeros, Botao, BotaoCta, BotaoMaterial, BotaoWa, CardsNavegacao, CartaoVendedor, colunasDestaques, colunasGaleria, Estrelas, FichaTecnica, FormularioLP, IconeDestaque, ListaFaq, ListaOpcionais, LogoTopo, Mapa, Menu, MidiaTopo, Ordenadas, precoDe, Rodape, rotaMapa, type LP, type Partes, V, Video, WhatsFlutuante,
} from "./base";

/* Estilo Boutique: branco, serifa clássica, pílulas e tom acolhedor. */

const ICONES_LOCAL = [MapPin, Clock, Car, Navigation, Phone];

const Rot = ({ children, escuro = false, className = "" }: { children: ReactNode; escuro?: boolean; className?: string }) => (
  <p className={cn("text-[10px] font-semibold uppercase tracking-[0.3em]", className)} style={{ color: escuro ? V.rotuloBloco : V.rotulo }}>{children}</p>
);
const Serifa = ({ children, className = "", escuro = false, como: Tag = "h2" }: { children: ReactNode; className?: string; escuro?: boolean; como?: "h1" | "h2" | "h3" | "p" }) => (
  <Tag className={cn("font-normal leading-[1.1] tracking-tight", className)} style={{ fontFamily: V.fonte, color: escuro ? V.tituloBloco : V.titulo }}>{children}</Tag>
);
function Secao({ id, rotulo, titulo, sub, children, centro = false }: { id?: string; rotulo: string; titulo: string; sub?: string; children: ReactNode; centro?: boolean }) {
  return (
    <section id={id} className="conteiner scroll-mt-20 py-16 sm:py-20">
      <div className={cn("mb-10", centro && "mx-auto max-w-2xl text-center")}>
        <Rot>{rotulo}</Rot>
        <Serifa className="mt-3 text-3xl sm:text-4xl">{titulo}</Serifa>
        {sub && <p className="mt-3 max-w-2xl" style={{ color: V.texto }}>{sub}</p>}
      </div>
      {children}
    </section>
  );
}
const Cartao = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={cn("border shadow-[0_10px_30px_rgba(0,0,0,0.05)]", className)} style={{ borderColor: V.linha, borderRadius: V.card, background: V.cardFundo }}>{children}</div>
);

export function Boutique(d: LP) {
  const { lp, v, fotos, faq, fatos, destaques, chamada, endereco, video, material, galeria, faixa, ficha, numeros, etapas, depoimentos, setAberta, nomeCarro, loja } = d;
  // Duas fotos ao lado do texto; sem a 3ª foto, usa a capa (e só uma, se o carro tiver uma foto).
  const duplaConceito = [...new Set([fotos[1], fotos[2] ?? fotos[0]].filter((f): f is string => Boolean(f)))];
  const preco = precoDe(d);
  const rota = rotaMapa(d);
  const linhasLocal = [endereco, loja.horario, ...lp.localTexto.split(/\n+/)].map((s) => s?.trim()).filter(Boolean) as string[];

  const partes: Partes = {
    conceito: (
      <Secao id="carro" rotulo="O carro" titulo={lp.secao1Titulo || nomeCarro}>
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="whitespace-pre-line leading-relaxed" style={{ color: V.texto }}>{lp.secao1Texto || v.descricao}</p>
            <dl className="mt-8 grid grid-cols-2 gap-6">
              {fatos.slice(0, 2).map((f) => (
                <div key={f.rotulo}>
                  <dd className="text-3xl" style={{ fontFamily: V.fonte, color: V.titulo }}>{f.valor}</dd>
                  <dt className="text-sm" style={{ color: V.texto }}>{f.rotulo}</dt>
                </div>
              ))}
            </dl>
          </div>
          {duplaConceito.length === 2 ? (
            <div className="grid grid-cols-2 gap-4">
              <img src={duplaConceito[0]} alt="" className="aspect-[3/4] w-full object-cover" style={{ borderRadius: V.card }} loading="lazy" />
              <img src={duplaConceito[1]} alt="" className="mt-10 aspect-[3/4] w-full object-cover" style={{ borderRadius: V.card }} loading="lazy" />
            </div>
          ) : duplaConceito.length === 1 && <img src={duplaConceito[0]} alt="" className="aspect-[4/3] w-full object-cover" style={{ borderRadius: V.card }} loading="lazy" />}
        </div>
      </Secao>
    ),
    destaques: destaques.length > 0 && (
      <Secao id="diferenciais" rotulo="Sem surpresa" titulo="Tudo isto já vem no carro.">
        <ul className={cn("grid grid-cols-2 gap-6 sm:gap-8", colunasDestaques(destaques.length))}>
          {destaques.map((h, i) => (
            <li key={h.rotulo + i}>
              <span style={{ color: V.titulo }}><IconeDestaque nome={h.icone} className="size-6" /></span>
              <p className="mt-3 font-semibold" style={{ color: V.titulo }}>{h.rotulo}</p>
            </li>
          ))}
        </ul>
      </Secao>
    ),
    numeros: numeros.length > 0 && (
      <section className="conteiner py-4">
        {lp.numerosTitulo && <Rot className="mb-6 text-center">{lp.numerosTitulo}</Rot>}
        <BlocoNumeros d={d} variante="cards" />
      </section>
    ),
    galeria: galeria.length > 0 && (
      <Secao id="fotos" rotulo="Fotos" titulo="Olhe com calma." sub="Fotos reais, sem filtro.">
        <div className={cn("grid gap-4", colunasGaleria(Math.min(fotos.length, 6)))}>
          {fotos.slice(0, 6).map((src, i) => (
            <button key={src + i} type="button" onClick={() => setAberta(i)} className="group text-left" aria-label={`Ampliar foto ${i + 1}`}>
              <Cartao className="overflow-hidden">
                <div className="aspect-[4/3] overflow-hidden bg-black/5"><img src={src} alt={`${nomeCarro} — foto ${i + 1}`} className="size-full object-cover transition duration-500 group-hover:scale-[1.03]" loading="lazy" /></div>
                <div className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-lg" style={{ fontFamily: V.fonte, color: V.titulo }}>{i === 0 ? `${v.marca} ${v.modelo}` : destaques[i - 1]?.rotulo ?? `Detalhe ${i + 1}`}</p>
                    <p className="text-xs" style={{ color: V.texto }}>{i === 0 && preco ? preco : `Foto ${i + 1} de ${fotos.length}`}</p>
                  </div>
                  <span className="grid size-8 shrink-0 place-items-center rounded-full border" style={{ borderColor: V.linha, color: V.titulo }}><ArrowRight className="size-4" aria-hidden="true" /></span>
                </div>
              </Cartao>
            </button>
          ))}
        </div>
        {fotos.length > 6 && <div className="mt-8 text-center"><Botao href="#fotos" onClick={() => setAberta(0)} variante="contorno">Ver todas as fotos ({fotos.length})</Botao></div>}
      </Secao>
    ),
    faixa: faixa && (lp.secao2Titulo || lp.secao2Texto) && (
      <section className="relative min-h-[55vh] overflow-hidden">
        <img src={faixa} alt="" className="absolute inset-0 size-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-black/50" />
        <div className="conteiner relative flex min-h-[55vh] flex-col items-center justify-center py-20 text-center text-white">
          {lp.secao2Titulo && <Serifa className="max-w-3xl text-4xl !text-white sm:text-5xl">{lp.secao2Titulo}</Serifa>}
          {lp.secao2Texto && <p className="mt-5 max-w-xl text-lg text-white/90">{lp.secao2Texto}</p>}
        </div>
      </section>
    ),
    video: video && <Secao rotulo="Vídeo" titulo={lp.videoTitulo || "Veja o carro em vídeo"}><Cartao className="overflow-hidden p-2"><Video video={video} /></Cartao></Secao>,
    ficha: ficha.length > 0 && (
      <Secao id="ficha" rotulo="Ficha técnica" titulo={lp.fichaTitulo || "Os detalhes, um a um."}>
        <Cartao className="p-5 sm:p-8"><FichaTecnica d={d} /><ListaOpcionais d={d} /></Cartao>
      </Secao>
    ),
    etapas: etapas.length > 0 && (
      <section style={{ background: V.bloco }}>
        <div className="conteiner grid gap-10 py-16 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <Rot escuro>Simples assim</Rot>
            <Serifa className="mt-3 text-3xl sm:text-4xl" escuro>{lp.etapasTitulo || "Como comprar"}</Serifa>
            {lp.ctaSubtitulo && <p className="mt-4" style={{ color: V.textoBloco }}>{lp.ctaSubtitulo}</p>}
          </div>
          <BlocoEtapas d={d} variante="lista" escuro />
        </div>
      </section>
    ),
    localizacao: (
      <Secao id="localizacao" rotulo="Como chegar" titulo={lp.localTitulo || "Venha tomar um café e dirigir o carro."}>
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <ul className="space-y-5">
            {linhasLocal.map((linha, i) => {
              const Icone = ICONES_LOCAL[i % ICONES_LOCAL.length];
              return (
                <li key={i} className="flex gap-4">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full border" style={{ borderColor: V.linha, color: V.titulo }}><Icone className="size-4" aria-hidden="true" /></span>
                  <p className={cn("text-sm leading-relaxed", i === 0 && "font-semibold")} style={{ color: i === 0 ? V.titulo : V.texto }}>{linha}</p>
                </li>
              );
            })}
            {rota && (
              <li>
                <a href={rota} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 py-2 text-sm font-semibold underline-offset-4 hover:underline" style={{ color: V.titulo }}>
                  Traçar rota no Google Maps <ArrowUpRight className="size-4" aria-hidden="true" />
                </a>
              </li>
            )}
          </ul>
          <Cartao className="overflow-hidden p-2"><Mapa d={d} className="min-h-[340px]" /></Cartao>
        </div>
      </Secao>
    ),
    cards: <section className="conteiner py-8"><CardsNavegacao d={d} /></section>,
    depoimentos: depoimentos.length > 0 && (
      <Secao rotulo="Clientes" titulo={lp.depoimentosTitulo || "Quem já saiu dirigindo"} centro>
        <BlocoDepoimentos d={d} />
      </Secao>
    ),
    faq: faq.length > 0 && (
      <Secao id="faq" rotulo="Dúvidas" titulo="O que todo mundo pergunta." centro>
        <div className="mx-auto max-w-3xl"><ListaFaq faq={faq} /></div>
      </Secao>
    ),
    contato: (
      <section id="contato" className="conteiner scroll-mt-20 py-16 sm:py-20">
        <div className="px-5 py-12 text-center sm:px-12 sm:py-14" style={{ background: "color-mix(in srgb, var(--lp-titulo) 4%, var(--lp-fundo))", borderRadius: V.card }}>
          <Serifa className="mx-auto max-w-2xl text-balance text-3xl sm:text-5xl">{lp.ctaTitulo || "Fale com um consultor"}</Serifa>
          {lp.ctaSubtitulo && <p className="mx-auto mt-4 max-w-xl" style={{ color: V.texto }}>{lp.ctaSubtitulo}</p>}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <BotaoWa d={d} verde className="px-7 py-3.5 text-base"><IconeWhatsApp className="size-4" /> Chamar no WhatsApp</BotaoWa>
            {material && <BotaoMaterial d={d} variante="contorno" className="px-7 py-3.5 text-base" />}
          </div>
          <div className="mx-auto mt-10 max-w-xl text-left"><FormularioLP d={d} /></div>
          <div className="mt-8 flex justify-center"><CartaoVendedor d={d} /></div>
        </div>
      </section>
    ),
  };

  return (
    <>
      <Menu d={d} />
      <section id="topo" className="relative min-h-[82svh]">
        <MidiaTopo d={d} />
        <div className="conteiner relative flex min-h-[82svh] flex-col justify-center py-24 text-white">
          <LogoTopo d={d} />
          <span className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[11px] font-semibold backdrop-blur"><Sparkles className="size-3.5" aria-hidden="true" /> {chamada}</span>
          <Serifa como="h1" className="max-w-3xl text-balance text-4xl !text-white sm:text-6xl lg:text-7xl">{lp.headline || nomeCarro}</Serifa>
          {lp.subtitulo && <p className="mt-6 max-w-xl text-lg text-white/90">{lp.subtitulo}</p>}
          <div className="mt-8 flex flex-wrap gap-3">
            <BotaoCta d={d} className="px-7 py-3.5 text-base" />
            {galeria.length > 0 ? <Botao href="#fotos" variante="vidro" className="px-7 py-3.5 text-base">Ver fotos</Botao> : material && <BotaoMaterial d={d} variante="vidro" className="px-7 py-3.5 text-base" />}
          </div>
          <p className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/90">
            {depoimentos.length > 0 && <span className="flex items-center gap-1.5"><Estrelas cor="#fbbf24" /> {depoimentos.length} {depoimentos.length === 1 ? "avaliação" : "avaliações"}</span>}
            {fatos.slice(0, 4).map((f) => <span key={f.rotulo}>· {f.valor} {f.rotulo}</span>)}
          </p>
        </div>
      </section>
      <Ordenadas d={d} partes={partes} />
      <Rodape d={d} />
      <WhatsFlutuante d={d} />
      <Ampliacao d={d} />
    </>
  );
}
