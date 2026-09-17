import { ArrowRight, Images, MapPin } from "lucide-react";
import type { ReactNode } from "react";
import { IconeWhatsApp } from "~/components/WhatsApp";
import { cn } from "~/lib/ui";
import {
  Ampliacao, BlocoDepoimentos, BlocoEtapas, BlocoNumeros, Botao, BotaoCta, BotaoMaterial, BotaoWa, CardsNavegacao, CartaoVendedor,
  FichaTecnica, FormularioLP, IconeDestaque, ListaFaq, ListaOpcionais, LogoTopo, Mapa, Menu, MidiaTopo, Ordenadas, Rodape, Rotulo, V, Video,
  WhatsFlutuante, type LP, type Partes,
} from "./base";

/* Estilo Editorial: largura total, fotos grandes, serifa. */

const BORDA = "color-mix(in srgb, var(--lp-titulo) 12%, transparent)";

function Display({ children, className = "", escuro = false }: { children: ReactNode; className?: string; escuro?: boolean }) {
  return <h2 className={cn("font-medium leading-[1.05] tracking-tight", className)} style={{ fontFamily: V.fonte, color: escuro ? V.tituloBloco : V.titulo }}>{children}</h2>;
}

export function Editorial(d: LP) {
  const { lp, v, fotos, faq, fatos, destaques, chamada, endereco, video, material, galeria, faixa, ficha, numeros, etapas, depoimentos, setAberta, nomeCarro } = d;

  const faixaCta = (
    <section className="border-y" style={{ borderColor: BORDA }}>
      <div className="conteiner flex flex-col items-start justify-between gap-6 py-10 sm:flex-row sm:items-center">
        <div>
          <Rotulo>Atendimento</Rotulo>
          <Display className="text-2xl sm:text-3xl">Fale com um consultor agora</Display>
        </div>
        <div className="flex flex-wrap gap-3">
          <BotaoCta d={d} className="px-8 py-4 text-base" />
          <BotaoMaterial d={d} variante="contorno" className="px-8 py-4 text-base" />
          {d.ctaNoFormulario && <BotaoWa d={d} variante="contorno" className="px-8 py-4 text-base"><IconeWhatsApp className="size-5" /> WhatsApp</BotaoWa>}
        </div>
      </div>
    </section>
  );

  const partes: Partes = {
    conceito: (
      <section id="carro" className="border-t" style={{ borderColor: BORDA }}>
        <div className="conteiner grid gap-10 py-20 lg:grid-cols-[1fr_1.1fr] lg:gap-20 lg:py-28">
          <div>
            <Rotulo>O carro</Rotulo>
            <Display className="text-4xl sm:text-5xl lg:text-6xl">{lp.secao1Titulo || nomeCarro}</Display>
          </div>
          <div className="flex flex-col justify-end">
            <p className="whitespace-pre-line text-lg leading-relaxed" style={{ color: V.texto }}>{lp.secao1Texto || v.descricao}</p>
            <a href={d.ctaNoFormulario ? "#contato" : "#topo"} className="mt-8 inline-flex w-fit items-center gap-2 py-2 text-sm font-semibold underline-offset-4 hover:underline" style={{ color: V.destaque }}>Quero saber mais <ArrowRight className="size-4" aria-hidden="true" /></a>
          </div>
        </div>
      </section>
    ),
    destaques: (
      <>
        <section style={{ background: V.bloco }}>
          <div className="conteiner grid grid-cols-2 gap-y-2 py-10 sm:grid-cols-3 lg:grid-cols-5">
            {fatos.map((f) => (
              <div key={f.rotulo} className="px-4 py-4 text-center">
                <p className="text-2xl font-medium sm:text-3xl" style={{ fontFamily: V.fonte, color: V.tituloBloco }}>{f.valor}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.25em]" style={{ color: V.rotuloBloco }}>{f.rotulo}</p>
              </div>
            ))}
          </div>
        </section>
        {destaques.length > 0 && (
          <section id="diferenciais" className="conteiner py-20 lg:py-28">
            <Rotulo centro>Diferenciais</Rotulo>
            <Display className="mx-auto max-w-2xl text-center text-3xl sm:text-4xl">Cada detalhe conta na hora de escolher</Display>
            <ul className="mx-auto mt-14 grid max-w-5xl grid-cols-2 overflow-hidden border-l border-t sm:grid-cols-3 lg:grid-cols-4" style={{ borderColor: BORDA, borderRadius: V.card }}>
              {destaques.map((h, i) => (
                <li key={h.rotulo + i} className="flex flex-col items-center gap-4 border-b border-r px-4 py-8 text-center" style={{ borderColor: BORDA }}>
                  <span style={{ color: V.destaque }}><IconeDestaque nome={h.icone} className="size-8" /></span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: V.titulo }}>{h.rotulo}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </>
    ),
    numeros: numeros.length > 0 && (
      <section className="border-t" style={{ borderColor: BORDA }}>
        <div className="conteiner py-16">
          {lp.numerosTitulo && <Rotulo>{lp.numerosTitulo}</Rotulo>}
          <BlocoNumeros d={d} variante="serifa" />
        </div>
      </section>
    ),
    galeria: galeria.length > 0 && (
      <>
        <section id="fotos" className="pb-20 lg:pb-28">
          <div className="conteiner mb-8 flex items-end justify-between pt-4">
            <div>
              <Rotulo>Galeria</Rotulo>
              <Display className="text-3xl sm:text-4xl">Veja cada detalhe</Display>
            </div>
            <span className="hidden text-sm sm:block" style={{ color: V.texto }}>{fotos.length} fotos</span>
          </div>
          <div className="grid gap-2 px-2 md:grid-cols-12 md:grid-rows-2 lg:px-4">
            {fotos.slice(0, 3).map((src, i) => (
              <button key={src + i} type="button" onClick={() => setAberta(i)} className={cn("group relative overflow-hidden bg-black/5", i === 0 ? "aspect-[4/3] md:col-span-8 md:row-span-2 md:aspect-auto" : "aspect-[4/3] md:col-span-4")} style={{ borderRadius: V.card }} aria-label={`Ampliar foto ${i + 1}`}>
                <img src={src} alt={`${nomeCarro} — foto ${i + 1}`} className="size-full object-cover transition duration-700 group-hover:scale-[1.04]" loading="lazy" />
              </button>
            ))}
          </div>
          {fotos.length > 3 && <div className="mt-6 text-center"><Botao href="#fotos" onClick={() => setAberta(0)} variante="contorno" className="px-8 py-4 text-base"><Images className="size-5" aria-hidden="true" /> Ver todas as fotos ({fotos.length})</Botao></div>}
        </section>
        {faixaCta}
      </>
    ),
    faixa: faixa && (lp.secao2Titulo || lp.secao2Texto) && (
      <section className="relative">
        <div className="relative h-[70vh] min-h-[420px]">
          <img src={faixa} alt="" className="absolute inset-0 size-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="conteiner absolute inset-x-0 bottom-0 pb-14 text-white">
            <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.3em] text-white/80">{v.marca} {v.modelo}</p>
            <h2 className="max-w-3xl text-4xl font-medium leading-[1.05] sm:text-6xl" style={{ fontFamily: V.fonte }}>{lp.secao2Titulo}</h2>
          </div>
        </div>
        <div style={{ background: V.bloco }}>
          <div className="conteiner grid gap-10 py-16 lg:grid-cols-[1fr_1.4fr]">
            <p className="whitespace-pre-line text-lg leading-relaxed" style={{ color: V.textoBloco }}>{lp.secao2Texto}</p>
            {fotos.length > 3 && (
              <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none]">
                {fotos.slice(3).map((src, i) => (
                  <button key={src + i} type="button" onClick={() => setAberta(i + 3)} className="aspect-[4/3] w-[70%] shrink-0 snap-start overflow-hidden sm:w-[48%]" style={{ borderRadius: V.card }} aria-label={`Ampliar foto ${i + 4}`}>
                    <img src={src} alt="" className="size-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    ),
    video: video && (
      <section id="video" className="conteiner py-20 lg:py-28">
        <Rotulo centro>Vídeo</Rotulo>
        <Display className="mb-10 text-center text-3xl sm:text-4xl">{lp.videoTitulo || "Veja o carro em vídeo"}</Display>
        <div className="overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.18)]" style={{ borderRadius: V.card }}><Video video={video} /></div>
      </section>
    ),
    ficha: ficha.length > 0 && (
      <>
        <section id="ficha" className="border-t" style={{ borderColor: BORDA }}>
          <div className="conteiner py-20 lg:py-28">
            <Rotulo>Ficha técnica</Rotulo>
            <Display className="mb-10 text-3xl sm:text-4xl">{lp.fichaTitulo || "Tudo sobre o carro"}</Display>
            <FichaTecnica d={d} />
            <ListaOpcionais d={d} />
          </div>
        </section>
        {galeria.length === 0 && {faixaCta}}
      </>
    ),
    etapas: etapas.length > 0 && (
      <section className="conteiner py-20 lg:py-28">
        <Rotulo>Passo a passo</Rotulo>
        <Display className="mb-10 text-3xl sm:text-4xl">{lp.etapasTitulo || "Como comprar"}</Display>
        <BlocoEtapas d={d} variante="numeradas" />
      </section>
    ),
    localizacao: (
      <section id="localizacao" className="grid lg:grid-cols-2">
        <div className="flex flex-col justify-center px-6 py-16 sm:px-12 lg:px-16 lg:py-24" style={{ background: V.bloco }}>
          <Rotulo escuro>Localização</Rotulo>
          <Display escuro className="text-3xl sm:text-4xl lg:text-5xl">{lp.localTitulo || "Venha fazer um test drive"}</Display>
          {lp.localTexto && <p className="mt-6 max-w-lg text-lg leading-relaxed" style={{ color: V.textoBloco }}>{lp.localTexto}</p>}
          {endereco && <p className="mt-8 flex items-start gap-2 text-sm" style={{ color: V.textoBloco }}><MapPin className="mt-0.5 size-4 shrink-0" style={{ color: V.destaque }} aria-hidden="true" /> {endereco}</p>}
        </div>
        <div className="min-h-[360px]"><Mapa d={d} className="h-full min-h-[360px] !rounded-none" /></div>
      </section>
    ),
    cards: <section className="conteiner py-20"><CardsNavegacao d={d} /></section>,
    depoimentos: depoimentos.length > 0 && (
      <section className="border-t" style={{ borderColor: BORDA }}>
        <div className="conteiner py-20 lg:py-28">
          <Rotulo>Clientes</Rotulo>
          <Display className="mb-10 text-3xl sm:text-4xl">{lp.depoimentosTitulo || "Quem já comprou com a gente"}</Display>
          <BlocoDepoimentos d={d} variante="citacoes" />
        </div>
      </section>
    ),
    faq: faq.length > 0 && (
      <section id="faq" className="border-t" style={{ borderColor: BORDA }}>
        <div className="conteiner grid gap-10 py-20 lg:grid-cols-[1fr_1.4fr] lg:py-28">
          <div>
            <Rotulo>Dúvidas</Rotulo>
            <Display className="text-3xl sm:text-4xl">Perguntas frequentes</Display>
          </div>
          <ListaFaq faq={faq} />
        </div>
      </section>
    ),
    contato: (
      <section id="contato" style={{ background: V.bloco }}>
        <div className="conteiner grid gap-12 py-20 lg:grid-cols-2 lg:items-center lg:py-28">
          <div>
            <Rotulo escuro>Contato</Rotulo>
            <Display escuro className="text-4xl sm:text-5xl">{lp.ctaTitulo || "Fale com um consultor"}</Display>
            {lp.ctaSubtitulo && <p className="mt-5 text-lg" style={{ color: V.textoBloco }}>{lp.ctaSubtitulo}</p>}
            <div className="mt-10"><CartaoVendedor d={d} escuro /></div>
          </div>
          <FormularioLP d={d} />
        </div>
      </section>
    ),
  };

  return (
    <>
      <Menu d={d} largura="total" />
      <section id="topo" className="relative min-h-[85svh] sm:min-h-[92vh]">
        <MidiaTopo d={d} />
        <div className="conteiner relative flex min-h-[85svh] flex-col justify-center py-20 text-white sm:min-h-[92vh] sm:py-24">
          <LogoTopo d={d} />
          <p className="mb-5 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] text-white/85"><span className="h-px w-8 bg-white/70" />{chamada}</p>
          <h1 className="max-w-4xl text-balance text-5xl font-medium leading-[1.02] tracking-tight sm:text-7xl" style={{ fontFamily: V.fonte }}>{lp.headline || nomeCarro}</h1>
          {lp.subtitulo && <p className="mt-6 max-w-xl text-lg text-white/90">{lp.subtitulo}</p>}
          <div className="mt-10 flex flex-wrap gap-3">
            <BotaoCta d={d} className="px-9 py-4 text-base sm:px-10 sm:py-5 sm:text-lg" />
            {material && <BotaoMaterial d={d} variante="vidro" className="px-9 py-4 text-base sm:px-10 sm:py-5 sm:text-lg" />}
          </div>
        </div>
      </section>
      <Ordenadas d={d} partes={partes} />
      <Rodape d={d} />
      <WhatsFlutuante d={d} />
      <Ampliacao d={d} />
    </>
  );
}
