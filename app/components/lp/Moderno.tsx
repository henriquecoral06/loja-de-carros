import { Check, ChevronDown, MapPin } from "lucide-react";
import type { ReactNode } from "react";
import { IconeWhatsApp } from "~/components/WhatsApp";
import { cn } from "~/lib/ui";
import {
  Ampliacao, BlocoDepoimentos, BlocoEtapas, BlocoNumeros, Botao, BotaoCta, BotaoMaterial, BotaoWa, CardsNavegacao, CartaoVendedor, colunasGaleria, FichaTecnica, FormularioLP, IconeDestaque, ListaOpcionais, LogoTopo, Mapa, Menu, Ordenadas, precoDe, Rodape, type LP, type Partes, V, Video, WhatsFlutuante,
} from "./base";

/* Estilo Moderno: moldura arredondada, azul vivo e card do carro no topo. */

/** Final do título na cor de destaque. */
function finalDestacado(s: string): [string, string] {
  const m = /^(.*?[,:])\s+(.+)$/.exec(s.trim());
  if (m) return [m[1], m[2]];
  const palavras = s.trim().split(/\s+/);
  if (palavras.length >= 4) return [palavras.slice(0, -2).join(" "), palavras.slice(-2).join(" ")];
  return [s, ""];
}

const Etiqueta = ({ children, className = "", style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) => (
  <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold", className)} style={{ background: "color-mix(in srgb, var(--lp-rotulo) 12%, transparent)", color: V.rotulo, ...style }}>{children}</span>
);
function H({ texto, className = "", escuro = false, como: Tag = "h2" }: { texto: string; className?: string; escuro?: boolean; como?: "h1" | "h2" }) {
  const [a, b] = finalDestacado(texto);
  return (
    <Tag className={cn("font-extrabold leading-[1.08] tracking-tight", className)} style={{ fontFamily: V.fonte, color: escuro ? V.tituloBloco : V.titulo }}>
      {a} {b && <span style={{ color: V.destaque }}>{b}</span>}
    </Tag>
  );
}
function Secao({ id, titulo, sub, children, direita }: { id?: string; titulo: string; sub?: string; children: ReactNode; direita?: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-4 px-4 py-14 sm:px-8 sm:py-16">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl" style={{ fontFamily: V.fonte, color: V.titulo }}>{titulo}</h2>
          {sub && <p className="mt-2 max-w-2xl" style={{ color: V.texto }}>{sub}</p>}
        </div>
        {direita}
      </div>
      {children}
    </section>
  );
}
const Cartao = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={cn("border shadow-[0_1px_2px_rgba(0,0,0,0.04)]", className)} style={{ borderColor: V.linha, borderRadius: V.card, background: V.cardFundo }}>{children}</div>
);
const BlocoEscuro = ({ id, children }: { id?: string; children: ReactNode }) => (
  <section id={id} className="scroll-mt-4 px-4 py-6 sm:px-8">
    <div className="p-6 sm:p-12" style={{ background: V.bloco, borderRadius: V.card, color: V.textoBloco }}>{children}</div>
  </section>
);

export function Moderno(d: LP) {
  const { lp, v, fotos, faq, fatos, destaques, chamada, endereco, video, material, galeria, faixa, ficha, numeros, etapas, depoimentos, setAberta, nomeCarro, topo } = d;
  const preco = precoDe(d);
  const resumo = fatos.filter((f) => f.rotulo !== "à vista").slice(0, 3).map((f) => f.valor).join(" · ");

  const partes: Partes = {
    destaques: destaques.length > 0 && (
      <section id="diferenciais" className="px-4 sm:px-8">
        <Cartao className="flex flex-wrap items-center gap-2 p-4">
          <span className="mr-2 text-sm font-semibold" style={{ color: V.titulo }}>O que vem no carro</span>
          {destaques.map((h, i) => (
            <span key={h.rotulo + i} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm" style={{ borderColor: V.linha, color: V.titulo }}>
              <span style={{ color: V.destaque }}><IconeDestaque nome={h.icone} className="size-4" /></span> {h.rotulo}
            </span>
          ))}
        </Cartao>
      </section>
    ),
    numeros: numeros.length > 0 && <Secao titulo={lp.numerosTitulo || "Em números"}><BlocoNumeros d={d} variante="cards" /></Secao>,
    conceito: (
      <Secao id="carro" titulo={lp.secao1Titulo || nomeCarro}>
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <p className="whitespace-pre-line text-lg leading-relaxed" style={{ color: V.texto }}>{lp.secao1Texto || v.descricao}</p>
          <Cartao className="p-5">
            <p className="text-sm font-semibold" style={{ color: V.titulo }}>Resumo</p>
            <dl className="mt-3 text-sm" style={{ color: V.texto }}>
              {fatos.map((f) => <div key={f.rotulo} className="flex justify-between gap-3 border-t py-2" style={{ borderColor: V.linha }}><dt>{f.rotulo}</dt><dd className="font-semibold" style={{ color: V.titulo }}>{f.valor}</dd></div>)}
            </dl>
          </Cartao>
        </div>
      </Secao>
    ),
    galeria: galeria.length > 0 && (
      <Secao id="fotos" titulo="Veja cada detalhe" sub="Fotos reais do carro."
        direita={fotos.length > 6 && <Botao href="#fotos" onClick={() => setAberta(0)} variante="contorno" className="!px-5 !py-2.5 text-sm">Ver todas as fotos ({fotos.length}) →</Botao>}>
        <div className={cn("grid gap-5", colunasGaleria(Math.min(fotos.length, 6)))}>
          {fotos.slice(0, 6).map((src, i) => (
            <button key={src + i} type="button" onClick={() => setAberta(i)} className="group text-left" aria-label={`Ampliar foto ${i + 1}`}>
              <Cartao className="overflow-hidden">
                <div className="relative aspect-[4/3] overflow-hidden bg-black/5">
                  <img src={src} alt={`${nomeCarro} — foto ${i + 1}`} className="size-full object-cover transition duration-500 group-hover:scale-[1.03]" loading="lazy" />
                  <span className="absolute left-3 top-3 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-tinta shadow">{i === 0 ? v.carroceria : destaques[i - 1]?.rotulo ?? `Foto ${i + 1}`}</span>
                </div>
                <div className="p-4">
                  <p className="font-bold" style={{ color: V.destaque }}>{i === 0 ? preco ?? v.marca : `Foto ${i + 1} de ${fotos.length}`}</p>
                  <p className="truncate text-sm font-semibold" style={{ color: V.titulo }}>{i === 0 ? nomeCarro : `${v.marca} ${v.modelo}`}</p>
                  <p className="text-xs" style={{ color: V.texto }}>{resumo}</p>
                </div>
              </Cartao>
            </button>
          ))}
        </div>
      </Secao>
    ),
    faixa: (lp.secao2Titulo || lp.secao2Texto) && (
      <BlocoEscuro>
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <Etiqueta style={{ background: "rgba(255,255,255,.1)", color: "var(--lp-titulo-bloco)" }}>{v.marca} {v.modelo}</Etiqueta>
            <H texto={lp.secao2Titulo} className="mt-4 text-3xl sm:text-4xl" escuro />
            {lp.secao2Texto && <p className="mt-4 text-lg">{lp.secao2Texto}</p>}
            <ul className="mt-6 space-y-2 text-sm">
              {destaques.slice(0, 3).map((h, i) => <li key={h.rotulo + i} className="flex items-center gap-2"><Check className="size-4" style={{ color: V.destaque }} aria-hidden="true" /> {h.rotulo}</li>)}
            </ul>
          </div>
          {faixa && <img src={faixa} alt="" className="aspect-[4/3] w-full object-cover" style={{ borderRadius: V.card }} loading="lazy" />}
        </div>
      </BlocoEscuro>
    ),
    video: video && <Secao titulo={lp.videoTitulo || "Veja o carro em vídeo"}><Cartao className="overflow-hidden p-2"><Video video={video} /></Cartao></Secao>,
    ficha: ficha.length > 0 && (
      <Secao id="ficha" titulo={lp.fichaTitulo || "Ficha técnica"}>
        <Cartao className="p-5 sm:p-8"><FichaTecnica d={d} /><ListaOpcionais d={d} /></Cartao>
      </Secao>
    ),
    etapas: etapas.length > 0 && <Secao titulo={lp.etapasTitulo || "Da primeira conversa às chaves"}><BlocoEtapas d={d} variante="cards" /></Secao>,
    localizacao: (
      <Secao id="localizacao" titulo={lp.localTitulo || "Venha fazer um test drive"}>
        <div className="grid gap-6 lg:grid-cols-2">
          <Cartao className="p-6">
            {lp.localTexto && <p className="whitespace-pre-line leading-relaxed" style={{ color: V.texto }}>{lp.localTexto}</p>}
            {endereco && <p className="mt-5 flex items-center gap-2 text-sm font-semibold" style={{ color: V.titulo }}><MapPin className="size-4 shrink-0" style={{ color: V.destaque }} aria-hidden="true" /> {endereco}</p>}
          </Cartao>
          <Cartao className="overflow-hidden p-2"><Mapa d={d} className="min-h-[320px]" /></Cartao>
        </div>
      </Secao>
    ),
    cards: <section className="px-4 py-6 sm:px-8"><CardsNavegacao d={d} /></section>,
    depoimentos: depoimentos.length > 0 && <Secao titulo={lp.depoimentosTitulo || "Clientes que saíram dirigindo"}><BlocoDepoimentos d={d} corEstrelas="#f59e0b" /></Secao>,
    faq: faq.length > 0 && (
      <Secao id="faq" titulo="Dúvidas frequentes">
        <div className="grid gap-3 md:grid-cols-2">
          {faq.map((f, i) => (
            <Cartao key={i} className="px-5 py-4">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold [&::-webkit-details-marker]:hidden" style={{ color: V.titulo }}>
                  {f.pergunta} <ChevronDown className="size-4 shrink-0 transition group-open:rotate-180" aria-hidden="true" />
                </summary>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed" style={{ color: V.texto }}>{f.resposta}</p>
              </details>
            </Cartao>
          ))}
        </div>
      </Secao>
    ),
    contato: (
      <BlocoEscuro id="contato">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <Etiqueta style={{ background: "rgba(255,255,255,.1)", color: "var(--lp-titulo-bloco)" }}>Contato</Etiqueta>
            <H texto={lp.ctaTitulo || "Fale com um consultor"} className="mt-4 text-3xl sm:text-4xl" escuro />
            {lp.ctaSubtitulo && <p className="mt-4 text-lg">{lp.ctaSubtitulo}</p>}
            <ul className="mt-6 space-y-2 text-sm">
              {["Resposta rápida no horário comercial", "Test drive no horário que preferir", "Avaliação do seu usado na troca"].map((t) => <li key={t} className="flex items-center gap-2"><Check className="size-4" style={{ color: V.destaque }} aria-hidden="true" /> {t}</li>)}
            </ul>
            <div className="mt-8 flex flex-wrap items-center gap-6"><CartaoVendedor d={d} escuro /><BotaoWa d={d} verde><IconeWhatsApp className="size-4" /> WhatsApp</BotaoWa></div>
          </div>
          <FormularioLP d={d} />
        </div>
      </BlocoEscuro>
    ),
  };

  return (
    <div className="min-h-dvh md:p-4" style={{ background: "color-mix(in srgb, var(--lp-bloco) 80%, black)" }}>
      <div className="mx-auto max-w-7xl overflow-hidden md:rounded-3xl" style={{ background: V.fundo }}>
        <Menu d={d} fixo={false} largura="w-full px-4 sm:px-8" />
        <section id="topo" className="grid gap-10 px-4 py-10 sm:px-8 sm:py-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-16">
          <div>
            <LogoTopo d={d} claro={false} />
            <Etiqueta><span className="size-1.5 rounded-full" style={{ background: V.destaque }} /> {chamada}</Etiqueta>
            <H como="h1" texto={lp.headline || nomeCarro} className="mt-5 text-balance text-4xl sm:text-5xl lg:text-6xl" />
            {lp.subtitulo && <p className="mt-5 max-w-lg text-lg leading-relaxed" style={{ color: V.texto }}>{lp.subtitulo}</p>}
            <div className="mt-8 flex flex-wrap gap-3">
              <BotaoCta d={d} className="px-7 py-3.5 text-base" />
              {galeria.length > 0 ? <Botao href="#fotos" variante="contorno" className="px-7 py-3.5 text-base">Ver fotos</Botao> : material && <BotaoMaterial d={d} variante="contorno" className="px-7 py-3.5 text-base" />}
            </div>
            <div className="mt-10 grid max-w-md grid-cols-3 gap-4">
              {fatos.slice(0, 3).map((f) => (
                <div key={f.rotulo}>
                  <p className="text-lg font-extrabold sm:text-2xl" style={{ color: V.titulo }}>{f.valor}</p>
                  <p className="text-xs" style={{ color: V.texto }}>{f.rotulo}</p>
                </div>
              ))}
            </div>
          </div>
          <Cartao className="overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.12)]">
            <div className="relative aspect-[4/3] bg-black/5">
              {topo && <img src={topo} alt={nomeCarro} className="size-full object-cover" fetchPriority="high" />}
              <span className="absolute left-3 top-3 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-tinta shadow">{v.carroceria}</span>
            </div>
            <div className="flex items-start justify-between gap-4 p-5">
              <div className="min-w-0">
                <p className="truncate font-bold" style={{ color: V.titulo }}>{nomeCarro}</p>
                <p className="text-xs" style={{ color: V.texto }}>{resumo}</p>
              </div>
              <div className="shrink-0 text-right">
                {preco && <p className="numeros text-lg font-extrabold" style={{ color: V.destaque }}>{preco}</p>}
                <a href={d.ctaNoFormulario ? "#contato" : "#topo"} className="text-xs font-semibold" style={{ color: V.titulo }}>Agendar test drive →</a>
              </div>
            </div>
          </Cartao>
        </section>
        <Ordenadas d={d} partes={partes} />
        <section className="px-4 py-16 text-center sm:px-8">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl" style={{ fontFamily: V.fonte, color: V.titulo }}>O carro certo não espera.</h2>
          <p className="mx-auto mt-3 max-w-xl" style={{ color: V.texto }}>{lp.subtitulo || nomeCarro}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <BotaoWa d={d}><IconeWhatsApp className="size-4" /> Falar com um consultor agora</BotaoWa>
            {d.ctaNoFormulario && <Botao href="#contato" variante="contorno">{lp.textoBotao}</Botao>}
          </div>
        </section>
        <Rodape d={d} />
      </div>
      <WhatsFlutuante d={d} />
      <Ampliacao d={d} />
    </div>
  );
}
