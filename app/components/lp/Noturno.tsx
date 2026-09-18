import { MapPin } from "lucide-react";
import type { ReactNode } from "react";
import { IconeWhatsApp } from "~/components/WhatsApp";
import { cn } from "~/lib/ui";
import {
  Ampliacao, BlocoDepoimentos, BlocoEtapas, BlocoNumeros, Botao, BotaoCta, BotaoMaterial, BotaoWa, CardsNavegacao, CartaoVendedor, colunasDestaques, FaixaRolante, FichaTecnica, FormularioLP, IconeDestaque, ListaFaq, ListaOpcionais, LogoTopo, Mapa, Menu, MidiaTopo, Ordenadas, precoDe, Rodape, type LP, type Partes, V, Video, WhatsFlutuante,
} from "./base";

/* Estilo Noturno: fundo escuro quente, serifa itálica e formulário no topo. */

/** Últimas palavras do título em itálico. */
function italico(s: string, n = 2): [string, string] {
  const palavras = s.trim().split(/\s+/);
  if (palavras.length <= n) return [s, ""];
  return [palavras.slice(0, -n).join(" "), palavras.slice(-n).join(" ")];
}

const Rot = ({ children, escuro = false, className = "" }: { children: ReactNode; escuro?: boolean; className?: string }) => (
  <p className={cn("text-[10px] font-semibold uppercase tracking-[0.35em]", className)} style={{ color: escuro ? V.rotuloBloco : V.rotulo }}>{children}</p>
);
function Serifa({ children, className = "", escuro = false, como: Tag = "h2", final }: { children: ReactNode; className?: string; escuro?: boolean; como?: "h1" | "h2" | "p"; final?: string }) {
  return (
    <Tag className={cn("font-normal leading-[1.08] tracking-tight", className)} style={{ fontFamily: V.fonte, color: escuro ? V.tituloBloco : V.titulo }}>
      {children}{final && <> <em>{final}</em></>}
    </Tag>
  );
}
function Titulo({ rotulo, texto, className = "" }: { rotulo: string; texto: string; className?: string }) {
  const [a, b] = italico(texto);
  return (
    <div className={className}>
      <Rot>{rotulo}</Rot>
      <Serifa className="mt-4 text-3xl sm:text-5xl" final={b}>{a}</Serifa>
    </div>
  );
}
const Secao = ({ id, children }: { id?: string; children: ReactNode }) => (
  <section id={id} className="scroll-mt-20 border-t" style={{ borderColor: V.linha }}>
    <div className="conteiner py-16 sm:py-24">{children}</div>
  </section>
);
const Moldura = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={cn("overflow-hidden border", className)} style={{ borderColor: V.linha, borderRadius: V.card }}>{children}</div>
);

export function Noturno(d: LP) {
  const { lp, v, fotos, faq, fatos, destaques, chamada, endereco, video, material, galeria, faixa, ficha, numeros, etapas, depoimentos, setAberta, nomeCarro } = d;
  const [h1a, h1b] = italico(lp.headline || nomeCarro);
  const preco = precoDe(d);

  const partes: Partes = {
    conceito: (
      <Secao id="carro">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          {(fotos[1] ?? fotos[0]) && <Moldura><img src={fotos[1] ?? fotos[0]} alt={nomeCarro} className="aspect-[4/3] w-full object-cover" loading="lazy" /></Moldura>}
          <div>
            <Titulo rotulo={lp.nomeExibido || "O carro"} texto={lp.secao1Titulo || nomeCarro} />
            <p className="mt-6 whitespace-pre-line leading-relaxed" style={{ color: V.texto }}>{lp.secao1Texto || v.descricao}</p>
            <dl className="mt-10 grid grid-cols-3 gap-4 sm:gap-6">
              {fatos.slice(0, 3).map((f) => (
                <div key={f.rotulo}>
                  <dd className="text-xl sm:text-3xl" style={{ fontFamily: V.fonte, color: V.titulo }}>{f.valor}</dd>
                  <dt className="mt-1 text-[10px] uppercase tracking-[0.25em]" style={{ color: V.texto }}>{f.rotulo}</dt>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Secao>
    ),
    destaques: destaques.length > 0 && (
      <Secao id="diferenciais">
        <Titulo rotulo="Diferenciais" texto="Tudo o que já vem com o carro." className="mb-10" />
        <ul className={cn("grid grid-cols-2 border-l border-t", colunasDestaques(destaques.length))} style={{ borderColor: V.linha }}>
          {destaques.map((h, i) => (
            <li key={h.rotulo + i} className="border-b border-r p-4 sm:p-6" style={{ borderColor: V.linha }}>
              <span style={{ color: V.destaque }}><IconeDestaque nome={h.icone} className="size-6" /></span>
              <p className="mt-4 font-medium" style={{ color: V.titulo }}>{h.rotulo}</p>
            </li>
          ))}
        </ul>
      </Secao>
    ),
    numeros: numeros.length > 0 && (
      <Secao>
        {lp.numerosTitulo && <Titulo rotulo="Números" texto={lp.numerosTitulo} className="mb-10" />}
        <BlocoNumeros d={d} />
      </Secao>
    ),
    galeria: galeria.length > 0 && (
      <Secao id="fotos">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <Titulo rotulo="Galeria" texto="Fotos reais do carro, sem filtro." />
          {fotos.length > 5 && <Botao href="#fotos" onClick={() => setAberta(0)} variante="contorno">Todas as fotos ({fotos.length})</Botao>}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {fotos.slice(0, 2).map((src, i) => (
            <button key={src + i} type="button" onClick={() => setAberta(i)} className="group overflow-hidden" style={{ borderRadius: V.card }} aria-label={`Ampliar foto ${i + 1}`}>
              <img src={src} alt={`${nomeCarro} — foto ${i + 1}`} className="aspect-[16/10] w-full object-cover transition duration-700 group-hover:scale-[1.03]" loading="lazy" />
            </button>
          ))}
        </div>
        {fotos.length > 2 && (
          <div className="mt-3 grid grid-cols-3 gap-3">
            {fotos.slice(2, 5).map((src, i) => (
              <button key={src + i} type="button" onClick={() => setAberta(i + 2)} className="group overflow-hidden" style={{ borderRadius: V.card }} aria-label={`Ampliar foto ${i + 3}`}>
                <img src={src} alt={`${nomeCarro} — foto ${i + 3}`} className="aspect-[4/3] w-full object-cover transition duration-700 group-hover:scale-[1.03]" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </Secao>
    ),
    faixa: faixa && (lp.secao2Titulo || lp.secao2Texto) && (
      <section className="relative min-h-[70vh] overflow-hidden">
        <img src={faixa} alt="" className="absolute inset-0 size-full object-cover" loading="lazy" />
        <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${V.fundo}, rgba(0,0,0,.4) 60%, rgba(0,0,0,.25))` }} />
        <div className="conteiner relative flex min-h-[70vh] flex-col justify-end pb-16 pt-24">
          <Rot className="!text-white/75">{v.marca} {v.modelo}</Rot>
          <Serifa className="mt-4 max-w-3xl text-4xl !text-white sm:text-6xl" final={italico(lp.secao2Titulo)[1]}>{italico(lp.secao2Titulo)[0]}</Serifa>
          {lp.secao2Texto && <p className="mt-6 max-w-xl text-lg text-white/90">{lp.secao2Texto}</p>}
        </div>
      </section>
    ),
    video: video && (
      <Secao>
        <Titulo rotulo="Vídeo" texto={lp.videoTitulo || "Veja o carro em vídeo"} className="mb-10" />
        <Moldura className="p-2"><Video video={video} /></Moldura>
      </Secao>
    ),
    ficha: ficha.length > 0 && (
      <section id="ficha" className="scroll-mt-20" style={{ background: V.bloco }}>
        <div className="conteiner py-16 sm:py-24">
          <Rot escuro>Ficha técnica</Rot>
          <Serifa escuro className="mb-10 mt-4 text-3xl sm:text-5xl">{lp.fichaTitulo || "Os detalhes do carro"}</Serifa>
          <FichaTecnica d={d} variante="grade" escuro />
          <ListaOpcionais d={d} escuro />
        </div>
      </section>
    ),
    etapas: etapas.length > 0 && (
      <Secao>
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <Titulo rotulo="Passo a passo" texto={lp.etapasTitulo || "Como comprar"} />
          <BlocoEtapas d={d} variante="lista" />
        </div>
      </Secao>
    ),
    localizacao: (
      <Secao id="localizacao">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <Titulo rotulo="Localização" texto={lp.localTitulo || "Venha fazer um test drive"} />
            <ul className="mt-8">
              {lp.localTexto.split(/\n+/).filter(Boolean).map((linha, i) => (
                <li key={i} className="flex gap-4 border-t py-3 text-sm" style={{ borderColor: V.linha, color: V.texto }}>
                  <span className="mt-2 h-px w-6 shrink-0" style={{ background: V.destaque }} /> {linha}
                </li>
              ))}
              {endereco && (
                <li className="flex gap-4 border-t py-3 text-sm" style={{ borderColor: V.linha, color: V.titulo }}>
                  <MapPin className="size-4 shrink-0" style={{ color: V.destaque }} aria-hidden="true" /> {endereco}
                </li>
              )}
            </ul>
          </div>
          <Moldura><Mapa d={d} className="min-h-[400px] !rounded-none" /></Moldura>
        </div>
      </Secao>
    ),
    cards: <Secao><CardsNavegacao d={d} /></Secao>,
    depoimentos: depoimentos.length > 0 && (
      <Secao>
        <Titulo rotulo="Clientes" texto={lp.depoimentosTitulo || "Quem já comprou com a gente"} className="mb-10" />
        <BlocoDepoimentos d={d} variante="citacoes" />
      </Secao>
    ),
    faq: faq.length > 0 && (
      <Secao id="faq">
        <div className="mx-auto max-w-3xl">
          <Titulo rotulo="Dúvidas" texto="Perguntas de quem está decidindo." className="mb-8" />
          <ListaFaq faq={faq} />
        </div>
      </Secao>
    ),
    contato: (
      <Secao id="contato">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <Serifa className="text-balance text-5xl sm:text-7xl" final={italico(lp.ctaTitulo || "Fale com um consultor")[1]}>{italico(lp.ctaTitulo || "Fale com um consultor")[0]}</Serifa>
            {lp.ctaSubtitulo && <p className="mt-6 max-w-md text-lg" style={{ color: V.texto }}>{lp.ctaSubtitulo}</p>}
            <div className="mt-8 flex flex-wrap items-center gap-6">
              <CartaoVendedor d={d} />
              <BotaoWa d={d} verde><IconeWhatsApp className="size-4" /> WhatsApp</BotaoWa>
            </div>
          </div>
          <div className="border p-6 sm:p-8" style={{ borderColor: V.linha, borderRadius: V.card, background: "rgba(0,0,0,.35)" }}>
            <Rot className="mb-1">Agende seu test drive</Rot>
            <FormularioLP d={d} escuro className="!p-0" />
          </div>
        </div>
      </Secao>
    ),
  };

  return (
    <>
      <Menu d={d} caixaAlta />
      <section id="topo" className="relative">
        <div className="relative min-h-[85svh]">
          <MidiaTopo d={d} />
          <div className="conteiner relative grid min-h-[85svh] items-center gap-10 py-16 text-white lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <LogoTopo d={d} />
              <Rot className="!text-white/80">{chamada}</Rot>
              <Serifa como="h1" className="mt-5 text-balance text-5xl !text-white sm:text-6xl lg:text-7xl" final={h1b}>{h1a}</Serifa>
              {lp.subtitulo && <p className="mt-6 max-w-lg text-lg text-white/90">{lp.subtitulo}</p>}
              <div className="mt-8 flex flex-wrap gap-3">
                <BotaoCta d={d} className="px-8 py-4 text-base" />
                {material && <BotaoMaterial d={d} variante="vidro" className="px-8 py-4 text-base" />}
              </div>
            </div>
            <div className="border border-white/15 bg-black/55 p-6 backdrop-blur-md sm:p-7" style={{ borderRadius: V.card }}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-white/75">{material ? "Receba o material completo" : "Reserve seu atendimento"}</p>
              <p className="mt-2 text-xl text-white" style={{ fontFamily: V.fonte }}>{material ? `${material.rotulo} + condições` : [v.marca, v.modelo, preco].filter(Boolean).join(" · ")}</p>
              <div className="mt-4"><FormularioLP d={d} prefixo="lp-topo" escuro compacto className="!p-0" /></div>
            </div>
          </div>
        </div>
        <FaixaRolante d={d} />
      </section>
      <Ordenadas d={d} partes={partes} />
      <Rodape d={d} />
      <WhatsFlutuante d={d} />
      <Ampliacao d={d} />
    </>
  );
}
