import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { useState, type ReactNode } from "react";
import { IconeWhatsApp } from "~/components/WhatsApp";
import { cn } from "~/lib/ui";
import {
  Ampliacao, BlocoDepoimentos, BlocoEtapas, BlocoNumeros, BotaoCta, BotaoMaterial, BotaoWa, CardsNavegacao, CartaoVendedor, FichaTecnica,
  FormularioLP, IconeDestaque, ListaFaq, ListaOpcionais, LogoTopo, Mapa, Menu, MidiaTopo, Ordenadas, Rodape, V, Video, WhatsFlutuante,
  type LP, type Partes,
} from "./base";

/* Estilo Vibrante: curvas, cores e seções centralizadas. */

function Onda({ cor, invertida = false, className = "" }: { cor: string; invertida?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 1440 90" preserveAspectRatio="none" className={cn("block h-12 w-full sm:h-20", invertida && "rotate-180", className)} aria-hidden="true">
      <path d="M0,40 C240,90 480,90 720,45 C960,0 1200,0 1440,50 L1440,90 L0,90 Z" fill={cor} />
    </svg>
  );
}

/** Seção com fundo de destaque e ondas em cima e embaixo. */
function FaixaOndulada({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <section id={id} className="relative" style={{ background: V.bloco }}>
      <Onda cor={V.fundo} invertida className="absolute inset-x-0 top-0" />
      <div className="conteiner relative py-28">{children}</div>
      <Onda cor={V.fundo} className="absolute inset-x-0 bottom-0" />
    </section>
  );
}

const Bolha = ({ className }: { className: string }) => (
  <div aria-hidden="true" className={cn("pointer-events-none absolute rounded-full opacity-20 blur-3xl", className)} style={{ background: V.destaque }} />
);

function Titulo({ children, escuro = false, sub }: { children: ReactNode; escuro?: boolean; sub?: string }) {
  return (
    <div className="text-center">
      {sub && <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.3em]" style={{ color: escuro ? V.rotuloBloco : V.rotulo }}>{sub}</p>}
      <h2 className="text-3xl font-extrabold sm:text-4xl" style={{ fontFamily: V.fonte, color: escuro ? V.tituloBloco : V.titulo }}>{children}</h2>
      <span className="mx-auto mt-4 block h-1.5 w-14 rounded-full" style={{ background: escuro ? V.tituloBloco : V.destaque, opacity: escuro ? 0.7 : 1 }} />
    </div>
  );
}

const Suave = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={cn("shadow-[0_18px_50px_rgba(0,0,0,0.08)]", className)} style={{ borderRadius: V.card, background: V.cardFundo }}>{children}</div>
);

export function Vibrante(d: LP) {
  const { lp, v, fotos, faq, fatos, destaques, chamada, endereco, video, material, galeria, faixa, ficha, numeros, etapas, depoimentos, setAberta, nomeCarro } = d;
  const [slide, setSlide] = useState(0);

  const partes: Partes = {
    conceito: (
      <section id="carro" className="conteiner relative pb-20 pt-6">
        <Bolha className="-left-20 top-10 size-72" />
        <div className="relative mx-auto max-w-3xl text-center">
          <p className="text-xs font-extrabold uppercase tracking-[0.3em]" style={{ color: V.rotulo }}>{lp.nomeExibido || `${v.marca} ${v.modelo}`}</p>
          <h2 className="mt-4 text-4xl font-extrabold leading-tight sm:text-5xl" style={{ fontFamily: V.fonte, color: V.titulo }}>{lp.secao1Titulo || nomeCarro}</h2>
          <p className="mx-auto mt-6 max-w-2xl whitespace-pre-line text-lg leading-relaxed" style={{ color: V.texto }}>{lp.secao1Texto || v.descricao}</p>
        </div>
      </section>
    ),
    destaques: (
      <>
        <section className="conteiner pb-20">
          <div className="flex flex-wrap justify-center gap-3">
            {fatos.map((f) => (
              <Suave key={f.rotulo} className="px-6 py-4 text-center">
                <p className="text-2xl font-extrabold leading-none" style={{ fontFamily: V.fonte, color: V.titulo }}>{f.valor}</p>
                <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: V.rotulo }}>{f.rotulo}</p>
              </Suave>
            ))}
          </div>
        </section>
        {destaques.length > 0 && (
          <FaixaOndulada id="diferenciais">
            <Titulo escuro sub="Conforto e segurança">Diferenciais</Titulo>
            <ul className="mx-auto mt-14 grid max-w-5xl grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
              {destaques.map((h, i) => (
                <li key={h.rotulo + i} className="flex flex-col items-center gap-3 text-center" style={{ color: V.tituloBloco }}>
                  <span className="grid size-[4.5rem] place-items-center rounded-full bg-white/15 ring-1 ring-white/25"><IconeDestaque nome={h.icone} className="size-8" /></span>
                  <span className="text-xs font-bold">{h.rotulo}</span>
                </li>
              ))}
            </ul>
          </FaixaOndulada>
        )}
      </>
    ),
    numeros: numeros.length > 0 && (
      <section className="conteiner py-16">
        {lp.numerosTitulo && <Titulo sub="Em números">{lp.numerosTitulo}</Titulo>}
        <BlocoNumeros d={d} variante="cards" className={lp.numerosTitulo ? "mt-10" : ""} />
      </section>
    ),
    galeria: galeria.length > 0 && (
      <section id="fotos" className="conteiner relative py-20">
        <Bolha className="-right-24 bottom-0 size-80" />
        <Titulo sub="Fotos">Galeria de imagens</Titulo>
        <div className="relative mx-auto mt-12 max-w-4xl">
          <button type="button" onClick={() => setAberta(slide)} className="block aspect-[16/10] w-full overflow-hidden bg-black/5 shadow-[0_30px_80px_rgba(0,0,0,0.18)]" style={{ borderRadius: V.card }} aria-label={`Ampliar foto ${slide + 1}`}>
            <img src={fotos[slide]} alt={`${nomeCarro} — foto ${slide + 1}`} className="size-full object-cover" />
          </button>
          {fotos.length > 1 && (
            <>
              <button type="button" onClick={() => setSlide((s) => (s - 1 + fotos.length) % fotos.length)} className="absolute left-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white text-tinta shadow-lg" aria-label="Foto anterior"><ChevronLeft className="size-5" /></button>
              <button type="button" onClick={() => setSlide((s) => (s + 1) % fotos.length)} className="absolute right-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white text-tinta shadow-lg" aria-label="Próxima foto"><ChevronRight className="size-5" /></button>
            </>
          )}
        </div>
        <div className="mx-auto mt-5 flex max-w-4xl gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">
          {fotos.map((src, i) => (
            <button key={src + i} type="button" onClick={() => setSlide(i)} aria-label={`Ver foto ${i + 1}`} aria-current={i === slide}
              className={cn("h-16 w-24 shrink-0 overflow-hidden border-2 transition", i === slide ? "border-current" : "border-transparent opacity-60 hover:opacity-100")} style={{ color: V.destaque, borderRadius: `calc(${V.card} / 2)` }}>
              <img src={src} alt="" className="size-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      </section>
    ),
    faixa: faixa && (lp.secao2Titulo || lp.secao2Texto) && (
      <section className="conteiner py-10">
        <div className="grid overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.14)] lg:grid-cols-2" style={{ background: V.bloco, color: V.tituloBloco, borderRadius: V.card }}>
          <div className="flex flex-col justify-center p-8 sm:p-14">
            <h2 className="text-3xl font-extrabold leading-tight sm:text-4xl" style={{ fontFamily: V.fonte }}>{lp.secao2Titulo}</h2>
            <p className="mt-5 whitespace-pre-line" style={{ color: V.textoBloco }}>{lp.secao2Texto}</p>
            {galeria.length > 0 && <a href="#fotos" className="mt-8 inline-flex w-fit items-center bg-white px-6 py-3 font-semibold" style={{ color: V.bloco, borderRadius: V.raio }}>Ver as fotos</a>}
          </div>
          <img src={faixa} alt="" className="min-h-[300px] w-full object-cover" loading="lazy" />
        </div>
      </section>
    ),
    video: video && (
      <FaixaOndulada id="video">
        <Titulo escuro sub="Vídeo">{lp.videoTitulo || "Veja o carro em vídeo"}</Titulo>
        <div className="mx-auto mt-12 max-w-4xl overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.25)]" style={{ borderRadius: V.card }}><Video video={video} /></div>
      </FaixaOndulada>
    ),
    ficha: ficha.length > 0 && (
      <section id="ficha" className="conteiner py-20">
        <Titulo sub="Detalhes">{lp.fichaTitulo || "Ficha técnica"}</Titulo>
        <Suave className="mx-auto mt-12 max-w-4xl p-6 sm:p-10">
          <FichaTecnica d={d} />
          <ListaOpcionais d={d} />
        </Suave>
      </section>
    ),
    etapas: etapas.length > 0 && (
      <section className="conteiner py-20">
        <Titulo sub="Simples assim">{lp.etapasTitulo || "Como comprar"}</Titulo>
        <BlocoEtapas d={d} variante="cards" className="mt-12" />
      </section>
    ),
    localizacao: (
      <FaixaOndulada id="localizacao">
        <Titulo escuro sub="Onde estamos">Localização</Titulo>
        <div className="mx-auto mt-12 grid max-w-5xl gap-8 lg:grid-cols-[1fr_1.4fr]">
          <div className="flex flex-col justify-center" style={{ color: V.textoBloco }}>
            <h3 className="text-2xl font-extrabold" style={{ fontFamily: V.fonte, color: V.tituloBloco }}>{lp.localTitulo || "Venha fazer um test drive"}</h3>
            {lp.localTexto && <p className="mt-4 text-lg">{lp.localTexto}</p>}
            {endereco && <p className="mt-6 flex items-start gap-2 text-sm opacity-90"><MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {endereco}</p>}
            <BotaoWa d={d} className="mt-8 w-fit"><IconeWhatsApp className="size-4" /> Agendar pelo WhatsApp</BotaoWa>
          </div>
          <div className="overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.25)]" style={{ borderRadius: V.card }}><Mapa d={d} className="!rounded-none" /></div>
        </div>
      </FaixaOndulada>
    ),
    cards: <section className="conteiner py-12"><CardsNavegacao d={d} /></section>,
    depoimentos: depoimentos.length > 0 && (
      <section className="conteiner py-20">
        <Titulo sub="Clientes">{lp.depoimentosTitulo || "Quem já comprou com a gente"}</Titulo>
        <BlocoDepoimentos d={d} className="mt-12" corEstrelas="#f59e0b" />
      </section>
    ),
    faq: faq.length > 0 && (
      <section id="faq" className="conteiner py-20">
        <Titulo sub="Perguntas">Dúvidas frequentes</Titulo>
        <Suave className="mx-auto mt-10 max-w-3xl px-6 sm:px-8"><ListaFaq faq={faq} /></Suave>
      </section>
    ),
    contato: (
      <FaixaOndulada id="contato">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.3em]" style={{ color: V.rotuloBloco }}>Fale com a gente</p>
            <h2 className="mt-3 text-4xl font-extrabold leading-tight sm:text-5xl" style={{ fontFamily: V.fonte, color: V.tituloBloco }}>{lp.ctaTitulo || "Fale com um consultor"}</h2>
            {lp.ctaSubtitulo && <p className="mt-5 text-lg" style={{ color: V.textoBloco }}>{lp.ctaSubtitulo}</p>}
            <div className="mt-10"><CartaoVendedor d={d} escuro /></div>
          </div>
          <FormularioLP d={d} />
        </div>
      </FaixaOndulada>
    ),
  };

  return (
    <>
      <Menu d={d} centralizado />
      <section id="topo" className="relative">
        <div className="relative min-h-[70svh] sm:min-h-[82vh]">
          <MidiaTopo d={d} />
          <div className="conteiner relative flex min-h-[70svh] flex-col items-center justify-center py-28 text-center text-white sm:min-h-[82vh]">
            <LogoTopo d={d} />
            <span className="px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.25em]" style={{ background: V.botao, color: V.textoBotao, borderRadius: V.raio }}>{chamada}</span>
            <h1 className="mt-6 max-w-4xl text-balance text-5xl font-extrabold leading-[1.05] sm:text-7xl" style={{ fontFamily: V.fonte }}>{lp.headline || nomeCarro}</h1>
            {lp.subtitulo && <p className="mt-5 max-w-xl text-lg text-white/90">{lp.subtitulo}</p>}
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <BotaoCta d={d} className="px-8 py-4 text-base shadow-[0_18px_40px_rgba(0,0,0,0.3)]" />
              {material && <BotaoMaterial d={d} variante="vidro" className="px-8 py-4 text-base" />}
            </div>
          </div>
        </div>
        <Onda cor={V.fundo} className="relative -mt-12 sm:-mt-20" />
      </section>
      <Ordenadas d={d} partes={partes} />
      <Rodape d={d} />
      <WhatsFlutuante d={d} />
      <Ampliacao d={d} />
    </>
  );
}
