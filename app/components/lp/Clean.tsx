import { Grip, Hash, MapPin } from "lucide-react";
import type { ReactNode } from "react";
import { IconeWhatsApp } from "~/components/WhatsApp";
import { codigoVeiculo } from "~/lib/veiculos";
import { cn } from "~/lib/ui";
import {
  Ampliacao, BlocoDepoimentos, BlocoEtapas, BlocoNumeros, BotaoCta, BotaoMaterial, BotaoWa, CardsNavegacao, CartaoVendedor, FichaTecnica,
  FormularioLP, IconeDestaque, ListaFaq, ListaOpcionais, LogoTopo, Mapa, Menu, MidiaTopo, mosaico, Ordenadas, precoDe, Rodape, V, Video, WhatsFlutuante,
  type LP, type Partes,
} from "./base";

/* Estilo Clean: o mesmo jeito da página do carro, com card de contato fixo. */

const BORDA = "color-mix(in srgb, var(--lp-titulo) 12%, transparent)";

function Bloco({ id, titulo, children }: { id?: string; titulo: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t py-10" style={{ borderColor: BORDA }}>
      <h2 className="mb-4 text-xl font-bold" style={{ color: V.titulo }}>{titulo}</h2>
      {children}
    </section>
  );
}

export function Clean(d: LP) {
  const { lp, v, fotos, faq, fatos, destaques, chamada, endereco, video, material, mostrar, galeria, faixa, ficha, numeros, etapas, depoimentos, setAberta, nomeCarro, videoTopo, topo } = d;
  const grade = mosaico(fotos.length, 5);
  const miniaturas = fotos.slice(0, grade.n);
  const miniatura = (i: number, cls: string) =>
    miniaturas[i] ? (
      <button key={i} type="button" onClick={() => setAberta(i)} className={cn("group relative overflow-hidden bg-black/5", cls)} aria-label={`Ampliar foto ${i + 1}`}>
        <img src={miniaturas[i]} alt={`${nomeCarro} — foto ${i + 1}`} className="size-full object-cover transition group-hover:brightness-95" loading={i === 0 ? "eager" : "lazy"} />
      </button>
    ) : <div key={i} className={cn("bg-black/5", cls)} />;

  const partes: Partes = {
    conceito: (
      <Bloco id="carro" titulo={lp.secao1Titulo || "Sobre o carro"}>
        <p className="whitespace-pre-line leading-relaxed" style={{ color: V.texto }}>{lp.secao1Texto || v.descricao}</p>
      </Bloco>
    ),
    destaques: (
      <Bloco id="diferenciais" titulo="Características">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {fatos.map((f) => (
            <div key={f.rotulo} className="border p-3" style={{ borderColor: "color-mix(in srgb, var(--lp-titulo) 15%, transparent)", borderRadius: V.card }}>
              <p className="text-xs" style={{ color: V.texto }}>{f.rotulo}</p>
              <p className="truncate text-sm font-semibold" style={{ color: V.titulo }}>{f.valor}</p>
            </div>
          ))}
        </div>
        {destaques.length > 0 && (
          <ul className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {destaques.map((h, i) => (
              <li key={h.rotulo + i} className="flex items-center gap-2.5 text-sm" style={{ color: V.titulo }}>
                <span style={{ color: V.destaque }}><IconeDestaque nome={h.icone} className="size-5" /></span> {h.rotulo}
              </li>
            ))}
          </ul>
        )}
      </Bloco>
    ),
    numeros: numeros.length > 0 && (
      <Bloco titulo={lp.numerosTitulo || "Em números"}><BlocoNumeros d={d} variante="cards" className="lg:grid-cols-2" /></Bloco>
    ),
    galeria: null, // a galeria fica no topo, como na página do carro
    faixa: (lp.secao2Titulo || lp.secao2Texto) && (
      <Bloco titulo={lp.secao2Titulo}>
        <div className="grid gap-5 sm:grid-cols-[1.2fr_1fr] sm:items-center">
          <p className="whitespace-pre-line leading-relaxed" style={{ color: V.texto }}>{lp.secao2Texto}</p>
          {faixa && <img src={faixa} alt="" className="aspect-[4/3] w-full object-cover" style={{ borderRadius: V.card }} loading="lazy" />}
        </div>
      </Bloco>
    ),
    video: video && <Bloco id="video" titulo={lp.videoTitulo || "Veja o carro em vídeo"}><Video video={video} /></Bloco>,
    ficha: ficha.length > 0 && (
      <Bloco id="ficha" titulo={lp.fichaTitulo || "Ficha técnica"}>
        <FichaTecnica d={d} />
        <ListaOpcionais d={d} />
      </Bloco>
    ),
    etapas: etapas.length > 0 && <Bloco titulo={lp.etapasTitulo || "Como comprar"}><BlocoEtapas d={d} variante="lista" /></Bloco>,
    localizacao: (
      <Bloco id="localizacao" titulo={lp.localTitulo || "Localização"}>
        {lp.localTexto && <p style={{ color: V.texto }}>{lp.localTexto}</p>}
        {endereco && <p className="mt-2 flex items-start gap-2 text-sm" style={{ color: V.texto }}><MapPin className="mt-0.5 size-4 shrink-0" style={{ color: V.destaque }} aria-hidden="true" /> {endereco}</p>}
        <div className="mt-5 overflow-hidden" style={{ borderRadius: V.card }}><Mapa d={d} className="!rounded-none" /></div>
      </Bloco>
    ),
    cards: <div className="border-t py-10" style={{ borderColor: BORDA }}><CardsNavegacao d={d} /></div>,
    depoimentos: depoimentos.length > 0 && <Bloco titulo={lp.depoimentosTitulo || "Quem já comprou com a gente"}><BlocoDepoimentos d={d} className="lg:grid-cols-2" /></Bloco>,
    faq: faq.length > 0 && <Bloco id="faq" titulo="Dúvidas frequentes"><ListaFaq faq={faq} /></Bloco>,
  };

  const preco = precoDe(d);
  const cartaoContato = mostrar("contato") && (
    <aside id="contato" className="scroll-mt-24 border p-6 shadow-[0_6px_16px_rgba(0,0,0,0.08)] lg:sticky lg:top-24" style={{ borderColor: BORDA, borderRadius: V.card, background: V.cardFundo }}>
      {preco && <p className="numeros text-3xl font-bold" style={{ color: V.titulo }}>{preco}</p>}
      <div className={cn(preco && "mt-5 border-t pt-5")} style={{ borderColor: BORDA }}><CartaoVendedor d={d} /></div>
      <div className="mt-5 grid gap-2">
        <BotaoWa d={d} verde className="w-full"><IconeWhatsApp className="size-5" /> Falar no WhatsApp</BotaoWa>
        <BotaoMaterial d={d} variante="contorno" className="w-full" />
      </div>
      <div className="mt-6 border-t pt-5" style={{ borderColor: BORDA }}>
        <h3 className="mb-1 font-semibold" style={{ color: V.titulo }}>{lp.ctaTitulo || "Tenho interesse"}</h3>
        {lp.ctaSubtitulo && <p className="mb-3 text-sm" style={{ color: V.texto }}>{lp.ctaSubtitulo}</p>}
        <FormularioLP d={d} className="!p-0 !shadow-none" />
      </div>
    </aside>
  );

  return (
    <>
      <Menu d={d} />
      <div className="conteiner py-6 sm:py-8">
        <LogoTopo d={d} claro={false} />
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: V.rotulo }}>{chamada}</p>
            <h1 className="mt-2 text-balance text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: V.titulo }}>{lp.headline || nomeCarro}</h1>
            {lp.subtitulo && <p className="mt-2 text-base" style={{ color: V.texto }}>{lp.subtitulo}</p>}
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm" style={{ color: V.texto }}>
              {endereco && <span className="flex items-center gap-1"><MapPin className="size-4" aria-hidden="true" /> {endereco}</span>}
              <span className="flex items-center gap-1"><Hash className="size-4" aria-hidden="true" /> Cód. {codigoVeiculo(v.codigo)}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {material && <BotaoMaterial d={d} variante="contorno" className="!px-4 !py-2 text-sm" />}
            <BotaoCta d={d} className="!px-4 !py-2 text-sm" />
          </div>
        </div>

        {galeria.length > 0 ? (
          <div id="fotos" className="relative">
            <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto [scrollbar-width:none] md:hidden">
              {fotos.map((src, i) => (
                <button key={src + i} type="button" onClick={() => setAberta(i)} className="aspect-[4/3] w-[88%] shrink-0 snap-center overflow-hidden bg-black/5" style={{ borderRadius: V.card }} aria-label={`Ampliar foto ${i + 1}`}>
                  <img src={src} alt={`${nomeCarro} — foto ${i + 1}`} className="size-full object-cover" loading={i === 0 ? "eager" : "lazy"} />
                </button>
              ))}
            </div>
            <div className={cn("hidden gap-2 overflow-hidden md:grid", grade.n === 1 ? "aspect-[16/9]" : "aspect-[2/1]", grade.grade)} style={{ borderRadius: V.card }}>
              {miniaturas.map((_, i) => i === 0 && videoTopo
                ? <div key="video" className={cn("relative overflow-hidden", grade.item(0))}><MidiaTopo d={d} /></div>
                : miniatura(i, grade.item(i)))}
            </div>
            {fotos.length > 1 && (
              <button type="button" onClick={() => setAberta(0)} className="absolute bottom-4 right-4 hidden items-center gap-2 border bg-white px-3 py-1.5 text-sm font-semibold text-tinta shadow md:flex" style={{ borderRadius: V.raio }}>
                <Grip className="size-4" aria-hidden="true" /> Mostrar todas as fotos ({fotos.length})
              </button>
            )}
          </div>
        ) : topo && <div className="relative aspect-[2/1] overflow-hidden" style={{ borderRadius: V.card }}><MidiaTopo d={d} /></div>}

        {/* Sem o card de contato, o conteúdo ocupa o centro em vez de deixar uma coluna vazia. */}
        <div className={cn("mt-8 grid gap-10", cartaoContato ? "lg:grid-cols-[minmax(0,1fr)_380px]" : "mx-auto max-w-4xl")}>
          <div className="min-w-0 [&>div:first-child>section]:border-t-0 [&>div:first-child>section]:pt-0"><Ordenadas d={d} partes={partes} /></div>
          {cartaoContato && <div>{cartaoContato}</div>}
        </div>
      </div>
      <Rodape d={d} />
      <WhatsFlutuante d={d} />
      <Ampliacao d={d} />
    </>
  );
}
