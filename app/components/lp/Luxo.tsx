import { MapPin } from "lucide-react";
import type { ReactNode } from "react";
import { IconeWhatsApp } from "~/components/WhatsApp";
import { cn } from "~/lib/ui";
import {
  Ampliacao, BlocoDepoimentos, BlocoEtapas, BlocoNumeros, Botao, BotaoCta, BotaoMaterial, BotaoWa, CardsNavegacao, CartaoVendedor, FichaTecnica,
  FormularioLP, IconeDestaque, ListaFaq, ListaOpcionais, LogoTopo, Mapa, Menu, MidiaTopo, Ordenadas, precoDe, Rodape, V, Video, WhatsFlutuante,
  type LP, type Partes,
} from "./base";

/* Estilo Luxo: off-white, serifa, dourado e discreto. */

const ROMANOS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI"];
const LARGURA = "mx-auto w-full max-w-6xl px-4 sm:px-8";

/** Primeira frase normal, o resto em itálico na cor de destaque. */
function dividir(s: string): [string, string] {
  const m = /^(.*?[.!?:,])\s+(.+)$/.exec(s.trim());
  if (m) return [m[1], m[2]];
  const palavras = s.trim().split(/\s+/);
  if (palavras.length >= 4) return [palavras.slice(0, -2).join(" "), palavras.slice(-2).join(" ")];
  return [s, ""];
}

const Rot = ({ children, escuro = false, className = "" }: { children: ReactNode; escuro?: boolean; className?: string }) => (
  <p className={cn("text-[11px] font-semibold uppercase tracking-[0.32em]", className)} style={{ color: escuro ? V.rotuloBloco : V.rotulo }}>{children}</p>
);
const Serifa = ({ children, className = "", escuro = false, como: Tag = "h2" }: { children: ReactNode; className?: string; escuro?: boolean; como?: "h1" | "h2" | "h3" | "p" }) => (
  <Tag className={cn("font-normal leading-[1.05] tracking-tight", className)} style={{ fontFamily: V.fonte, color: escuro ? V.tituloBloco : V.titulo }}>{children}</Tag>
);
function Secao({ id, rotulo, titulo, children, direita }: { id?: string; rotulo: string; titulo?: ReactNode; children: ReactNode; direita?: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 border-t" style={{ borderColor: V.linha }}>
      <div className={cn(LARGURA, "py-16 sm:py-20")}>
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Rot>{rotulo}</Rot>
            {titulo && <Serifa className="mt-3 text-3xl sm:text-5xl">{titulo}</Serifa>}
          </div>
          {direita}
        </div>
        {children}
      </div>
    </section>
  );
}
const Cartao = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={cn("border", className)} style={{ borderColor: V.linha, borderRadius: V.card, background: V.cardFundo }}>{children}</div>
);

export function Luxo(d: LP) {
  const { lp, v, fotos, faq, fatos, destaques, chamada, endereco, video, material, galeria, faixa, ficha, numeros, etapas, depoimentos, setAberta, nomeCarro, loja } = d;
  const [h1a, h1b] = dividir(lp.headline || nomeCarro);
  const preco = precoDe(d);

  const partes: Partes = {
    conceito: (
      <Secao id="carro" rotulo={lp.nomeExibido || `${v.marca} ${v.modelo}`}>
        <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr]">
          <Serifa className="text-4xl sm:text-5xl">{lp.secao1Titulo || nomeCarro}</Serifa>
          <div>
            <p className="whitespace-pre-line text-lg leading-relaxed" style={{ color: V.texto }}>{lp.secao1Texto || v.descricao}</p>
            <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
              {fatos.slice(0, 4).map((f) => (
                <div key={f.rotulo} className="border-t pt-3" style={{ borderColor: V.destaque }}>
                  <dd className="text-2xl" style={{ fontFamily: V.fonte, color: V.titulo }}>{f.valor}</dd>
                  <dt className="text-[11px] uppercase tracking-[0.2em]" style={{ color: V.texto }}>{f.rotulo}</dt>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Secao>
    ),
    destaques: destaques.length > 0 && (
      <Secao id="diferenciais" rotulo="Diferenciais" titulo="O que torna este carro único.">
        <ol className="grid border-l border-t sm:grid-cols-2 lg:grid-cols-4" style={{ borderColor: V.linha }}>
          {destaques.map((h, i) => (
            <li key={h.rotulo + i} className="border-b border-r p-6" style={{ borderColor: V.linha }}>
              <p className="text-2xl" style={{ fontFamily: V.fonte, color: V.destaque }}>{ROMANOS[i] ?? i + 1}.</p>
              <span className="mt-4 block" style={{ color: V.titulo }}><IconeDestaque nome={h.icone} className="size-7" /></span>
              <p className="mt-3 font-medium" style={{ color: V.titulo }}>{h.rotulo}</p>
            </li>
          ))}
        </ol>
      </Secao>
    ),
    numeros: numeros.length > 0 && (
      <section className="border-t" style={{ borderColor: V.linha }}>
        <div className={cn(LARGURA, "py-14")}>
          {lp.numerosTitulo && <Rot className="mb-8 text-center">{lp.numerosTitulo}</Rot>}
          <BlocoNumeros d={d} variante="serifa" />
        </div>
      </section>
    ),
    galeria: galeria.length > 0 && (
      <Secao id="fotos" rotulo="Galeria" titulo="Cada detalhe, de perto."
        direita={fotos.length > 6 && <Botao href="#fotos" onClick={() => setAberta(0)} variante="contorno">Ver todas as fotos ({fotos.length})</Botao>}>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {fotos.slice(0, 6).map((src, i) => (
            <button key={src + i} type="button" onClick={() => setAberta(i)} className="group text-left" aria-label={`Ampliar foto ${i + 1}`}>
              <Cartao className="overflow-hidden">
                <div className="relative aspect-[4/3] overflow-hidden bg-black/5">
                  <img src={src} alt={`${nomeCarro} — foto ${i + 1}`} className="size-full object-cover transition duration-700 group-hover:scale-[1.04]" loading="lazy" />
                  <span className="absolute left-3 top-3 border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ background: V.fundo, color: V.titulo, borderColor: V.linha }}>
                    {i === 0 ? v.carroceria : `${String(i + 1).padStart(2, "0")} / ${String(Math.min(fotos.length, 6)).padStart(2, "0")}`}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <p className="truncate text-sm font-medium" style={{ color: V.titulo }}>{i === 0 ? `${v.marca} ${v.modelo}` : destaques[i - 1]?.rotulo ?? `Foto ${i + 1}`}</p>
                  <span className="shrink-0 text-lg" style={{ fontFamily: V.fonte, color: V.destaque }}>{i === 0 && preco ? preco : "→"}</span>
                </div>
              </Cartao>
            </button>
          ))}
        </div>
      </Secao>
    ),
    faixa: faixa && (lp.secao2Titulo || lp.secao2Texto) && (
      <section className="relative min-h-[60vh] overflow-hidden">
        <img src={faixa} alt="" className="absolute inset-0 size-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-black/55" />
        <div className={cn(LARGURA, "relative flex min-h-[60vh] flex-col justify-center py-20 text-center")}>
          <Rot className="!text-white/75">{lp.nomeExibido || loja.nome}</Rot>
          {lp.secao2Titulo && <Serifa className="mx-auto mt-4 max-w-3xl text-4xl !text-white sm:text-6xl">“{lp.secao2Titulo}”</Serifa>}
          {lp.secao2Texto && <p className="mx-auto mt-6 max-w-2xl text-lg text-white/90">{lp.secao2Texto}</p>}
        </div>
      </section>
    ),
    video: video && (
      <Secao rotulo="Vídeo" titulo={lp.videoTitulo || "Veja o carro em vídeo"}>
        <Cartao className="overflow-hidden p-2"><Video video={video} /></Cartao>
      </Secao>
    ),
    ficha: ficha.length > 0 && (
      <Secao id="ficha" rotulo="Ficha técnica" titulo={lp.fichaTitulo || "Os números do carro."}>
        <FichaTecnica d={d} />
        <ListaOpcionais d={d} />
      </Secao>
    ),
    etapas: etapas.length > 0 && (
      <Secao rotulo="Método" titulo={lp.etapasTitulo || "Como comprar"}>
        <BlocoEtapas d={d} variante="numeradas" />
      </Secao>
    ),
    localizacao: (
      <Secao id="localizacao" rotulo="Localização">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <Serifa className="text-4xl sm:text-5xl">{lp.localTitulo || "Venha fazer um test drive."}</Serifa>
            {lp.localTexto && <p className="mt-6 whitespace-pre-line text-lg leading-relaxed" style={{ color: V.texto }}>{lp.localTexto}</p>}
            {endereco && <p className="mt-6 flex items-center gap-2 text-sm" style={{ color: V.titulo }}><MapPin className="size-4 shrink-0" style={{ color: V.destaque }} aria-hidden="true" /> {endereco}</p>}
          </div>
          <Cartao className="overflow-hidden p-2"><Mapa d={d} className="min-h-[380px]" /></Cartao>
        </div>
      </Secao>
    ),
    cards: <section className="border-t" style={{ borderColor: V.linha }}><div className={cn(LARGURA, "py-16")}><CardsNavegacao d={d} /></div></section>,
    depoimentos: depoimentos.length > 0 && (
      <Secao rotulo="Clientes" titulo={lp.depoimentosTitulo || "Quem já comprou com a gente"}>
        <BlocoDepoimentos d={d} variante="citacoes" />
      </Secao>
    ),
    faq: faq.length > 0 && (
      <Secao id="faq" rotulo="Dúvidas" titulo="Perguntas de quem está decidindo.">
        <div className="grid gap-x-12 lg:grid-cols-2">
          <ListaFaq faq={faq.filter((_, i) => i % 2 === 0)} />
          <ListaFaq faq={faq.filter((_, i) => i % 2 === 1)} />
        </div>
      </Secao>
    ),
    contato: (
      <section id="contato" className="scroll-mt-20 border-t" style={{ borderColor: V.linha }}>
        <div className={cn(LARGURA, "py-16 sm:py-20")}>
          {d.temWa && (
            <div className="mb-12 text-center">
              <BotaoWa d={d} verde className="w-full max-w-2xl px-8 py-5 text-base sm:text-lg"><IconeWhatsApp className="size-5" /> Conversar agora no WhatsApp</BotaoWa>
              <p className="mt-3 text-xs" style={{ color: V.texto }}>Atendimento direto com a loja, sem compromisso.</p>
            </div>
          )}
          <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
            <div>
              <Rot>Ou deixe seus dados</Rot>
              <Serifa className="mt-3 text-4xl sm:text-5xl">{lp.ctaTitulo || "Fale com um consultor"}</Serifa>
              {lp.ctaSubtitulo && <p className="mt-5 text-lg" style={{ color: V.texto }}>{lp.ctaSubtitulo}</p>}
              <div className="mt-8"><CartaoVendedor d={d} /></div>
            </div>
            <div className="p-6 sm:p-8" style={{ background: V.bloco, borderRadius: V.card }}>
              <Rot escuro className="mb-1">Atendimento reservado</Rot>
              <FormularioLP d={d} escuro className="!p-0" />
            </div>
          </div>
        </div>
      </section>
    ),
  };

  return (
    <div style={{ backgroundImage: "linear-gradient(to right, color-mix(in srgb, var(--lp-titulo) 5%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--lp-titulo) 5%, transparent) 1px, transparent 1px)", backgroundSize: "56px 56px" }}>
      <Menu d={d} largura={LARGURA} />
      <section id="topo" className="relative min-h-[82svh]">
        <MidiaTopo d={d} />
        <div className={cn(LARGURA, "relative grid min-h-[82svh] items-center gap-10 py-16 sm:py-20 lg:grid-cols-[1.15fr_0.85fr]")}>
          <div className="text-white">
            <LogoTopo d={d} />
            <Rot className="!text-white/85">{chamada}</Rot>
            <Serifa como="h1" className="mt-5 text-balance text-5xl !text-white sm:text-6xl lg:text-7xl">
              {h1a} {h1b && <em style={{ color: V.destaque }}>{h1b}</em>}
            </Serifa>
            {lp.subtitulo && <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/90">{lp.subtitulo}</p>}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <BotaoCta d={d} className="px-8 py-4 text-base" />
              {material && <BotaoMaterial d={d} variante="vidro" className="px-8 py-4 text-base" />}
            </div>
            <p className="mt-6 flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/85">
              {fatos.slice(0, 4).map((f) => <span key={f.rotulo}><strong className="text-white">{f.valor}</strong> {f.rotulo}</span>)}
            </p>
          </div>
          <aside className="relative border p-7 shadow-[0_30px_80px_rgba(0,0,0,0.25)]" style={{ borderColor: V.linha, borderRadius: V.card, borderTop: `3px solid ${V.destaque}`, background: V.fundo }}>
            {depoimentos[0] ? (
              <>
                <Serifa como="p" className="text-2xl sm:text-3xl">“{depoimentos[0].texto}”</Serifa>
                <p className="mt-5 text-sm font-semibold" style={{ color: V.titulo }}>{depoimentos[0].nome}</p>
                {depoimentos[0].contexto && <p className="text-xs" style={{ color: V.texto }}>{depoimentos[0].contexto}</p>}
              </>
            ) : (
              <>
                <Rot>{preco ? "Valor" : `${v.marca} ${v.modelo}`}</Rot>
                <Serifa como="p" className="mt-2 text-4xl">{preco ?? v.versao}</Serifa>
                <ul className="mt-5 space-y-2 text-sm" style={{ color: V.texto }}>
                  {fatos.slice(0, 4).map((f) => <li key={f.rotulo} className="flex justify-between gap-3 border-b pb-2" style={{ borderColor: V.linha }}><span>{f.rotulo}</span><strong style={{ color: V.titulo }}>{f.valor}</strong></li>)}
                </ul>
                <div className="mt-6"><CartaoVendedor d={d} /></div>
              </>
            )}
          </aside>
        </div>
      </section>
      <Ordenadas d={d} partes={partes} />
      <Rodape d={d} />
      <WhatsFlutuante d={d} />
      <Ampliacao d={d} />
    </div>
  );
}
