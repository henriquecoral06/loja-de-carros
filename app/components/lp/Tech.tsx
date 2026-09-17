import { Check, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { IconeWhatsApp } from "~/components/WhatsApp";
import type { SecaoOrdenavel } from "~/lib/lp/secoes";
import { cn } from "~/lib/ui";
import { codigoVeiculo } from "~/lib/veiculos";
import {
  Ampliacao, BlocoDepoimentos, BlocoEtapas, BlocoNumeros, Botao, BotaoCta, BotaoMaterial, BotaoWa, CardsNavegacao, CartaoVendedor, FormularioLP,
  IconeDestaque, ListaOpcionais, LogoTopo, Mapa, Menu, MidiaTopo, Ordenadas, precoDe, Rodape, V, Video, WhatsFlutuante, type LP, type Partes,
} from "./base";

/* Estilo Tech: preto, rótulos técnicos numerados e dados em destaque. */

const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

/** Título em duas partes: a segunda em cinza. */
function dividir(s: string): [string, string] {
  const m = /^(.*?[.!?:,])\s+(.+)$/.exec(s.trim());
  return m ? [m[1], m[2]] : [s, ""];
}

const Mono = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <p className={cn("text-[11px] uppercase tracking-[0.2em]", className)} style={{ fontFamily: MONO, color: V.rotulo }}>{children}</p>
);
function T({ texto, className = "", como: Tag = "h2" }: { texto: string; className?: string; como?: "h1" | "h2" }) {
  const [a, b] = dividir(texto);
  return (
    <Tag className={cn("font-semibold leading-[1.08] tracking-tight", className)} style={{ color: V.titulo }}>
      {a} {b && <span className="font-normal" style={{ color: V.texto }}>{b}</span>}
    </Tag>
  );
}
const Caixa = ({ children, className = "", recuo = true }: { children: ReactNode; className?: string; recuo?: boolean }) => (
  <div className={cn("border", recuo && "p-5", className)} style={{ borderColor: V.linha, borderRadius: V.card, background: V.cardFundo }}>{children}</div>
);
function Secao({ n, id, rotulo, titulo, children }: { n: string; id?: string; rotulo: string; titulo: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 border-t" style={{ borderColor: V.linha }}>
      <div className="conteiner py-16 sm:py-20">
        <Mono className="mb-4">{n} / {rotulo}</Mono>
        <T texto={titulo} className="mb-10 max-w-3xl text-3xl sm:text-5xl" />
        {children}
      </div>
    </section>
  );
}
const Linha = ({ rotulo, valor }: { rotulo: string; valor: string }) => (
  <div className="flex items-baseline justify-between gap-4 border-t py-2.5 text-sm" style={{ borderColor: V.linha }}>
    <span className="text-[11px] uppercase tracking-[0.15em]" style={{ fontFamily: MONO, color: V.texto }}>{rotulo}</span>
    <span className="text-right font-medium" style={{ color: V.titulo }}>{valor}</span>
  </div>
);

export function Tech(d: LP) {
  const { lp, v, fotos, faq, fatos, ficha, destaques, chamada, endereco, video, material, galeria, faixa, numeros, etapas, depoimentos, setAberta, nomeCarro, ordem, loja } = d;
  const num = (k: SecaoOrdenavel) => String(ordem.indexOf(k) + 1).padStart(2, "0");
  const preco = precoDe(d);

  const partes: Partes = {
    conceito: (
      <Secao n={num("conceito")} id="carro" rotulo="O carro" titulo={lp.secao1Titulo || nomeCarro}>
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <p className="whitespace-pre-line text-lg leading-relaxed" style={{ color: V.texto }}>{lp.secao1Texto || v.descricao}</p>
          <Caixa>
            <Mono className="mb-2">Resumo</Mono>
            {fatos.map((f) => <Linha key={f.rotulo} rotulo={f.rotulo} valor={f.valor} />)}
            <Linha rotulo="código" valor={codigoVeiculo(v.codigo)} />
          </Caixa>
        </div>
      </Secao>
    ),
    destaques: destaques.length > 0 && (
      <Secao n={num("destaques")} id="diferenciais" rotulo="Diferenciais" titulo="Equipamentos. Conferidos um a um.">
        <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
          {(fotos[1] ?? fotos[0]) && (
            <div className="overflow-hidden" style={{ borderRadius: V.card }}>
              <img src={fotos[1] ?? fotos[0]} alt={nomeCarro} className="h-full min-h-[280px] w-full object-cover" loading="lazy" />
            </div>
          )}
          <Caixa>
            <Mono className="mb-2">Especificações</Mono>
            {destaques.map((h, i) => (
              <div key={h.rotulo + i} className="flex items-center gap-3 border-t py-3" style={{ borderColor: V.linha }}>
                <span style={{ color: V.destaque }}><IconeDestaque nome={h.icone} className="size-5" /></span>
                <span className="text-sm font-medium" style={{ color: V.titulo }}>{h.rotulo}</span>
              </div>
            ))}
          </Caixa>
        </div>
      </Secao>
    ),
    numeros: numeros.length > 0 && (
      <section className="border-t" style={{ borderColor: V.linha }}>
        <div className="conteiner py-10">
          {lp.numerosTitulo && <Mono className="mb-6">{num("numeros")} / {lp.numerosTitulo}</Mono>}
          <BlocoNumeros d={d} />
        </div>
      </section>
    ),
    galeria: galeria.length > 0 && (
      <Secao n={num("galeria")} id="fotos" rotulo="Imagens" titulo="Fotos reais. Nenhum retoque.">
        <div className="grid gap-3 md:grid-cols-12">
          {fotos.slice(0, 5).map((src, i) => (
            <button key={src + i} type="button" onClick={() => setAberta(i)} className={cn("group relative overflow-hidden", i === 0 ? "aspect-[4/3] md:col-span-8 md:row-span-2 md:aspect-auto" : "aspect-[4/3] md:col-span-4")} style={{ borderRadius: V.card }} aria-label={`Ampliar foto ${i + 1}`}>
              <img src={src} alt={`${nomeCarro} — foto ${i + 1}`} className="size-full object-cover transition duration-700 group-hover:scale-[1.03]" loading="lazy" />
              <span className="absolute bottom-3 left-3 bg-black/60 px-2 py-1 text-[10px] text-white" style={{ fontFamily: MONO }}>{String(i + 1).padStart(2, "0")} / {String(fotos.length).padStart(2, "0")}</span>
            </button>
          ))}
        </div>
        {fotos.length > 5 && <div className="mt-6"><Botao href="#fotos" onClick={() => setAberta(0)} variante="contorno">Ver todas as {fotos.length} fotos</Botao></div>}
      </Secao>
    ),
    faixa: faixa && (lp.secao2Titulo || lp.secao2Texto) && (
      <section className="relative min-h-[60vh] overflow-hidden border-t" style={{ borderColor: V.linha }}>
        <img src={faixa} alt="" className="absolute inset-0 size-full object-cover opacity-60" loading="lazy" />
        <div className="absolute inset-0" style={{ background: `linear-gradient(to right, ${V.fundo}, transparent 75%)` }} />
        <div className="conteiner relative flex min-h-[60vh] flex-col justify-center py-20">
          <Mono className="mb-4">{num("faixa")} / {v.marca} {v.modelo}</Mono>
          <T texto={lp.secao2Titulo} className="max-w-2xl text-4xl sm:text-6xl" />
          {lp.secao2Texto && <p className="mt-6 max-w-xl text-lg" style={{ color: V.texto }}>{lp.secao2Texto}</p>}
        </div>
      </section>
    ),
    video: video && (
      <Secao n={num("video")} rotulo="Vídeo" titulo={lp.videoTitulo || "Veja o carro em vídeo"}>
        <Caixa recuo={false} className="overflow-hidden"><Video video={video} /></Caixa>
      </Secao>
    ),
    ficha: ficha.length > 0 && (
      <Secao n={num("ficha")} id="ficha" rotulo="Ficha técnica" titulo={lp.fichaTitulo || "Ficha técnica. Sem letras miúdas."}>
        <div className="grid gap-6 lg:grid-cols-2">
          <Caixa>{ficha.slice(0, Math.ceil(ficha.length / 2)).map((f) => <Linha key={f.rotulo} rotulo={f.rotulo} valor={f.valor} />)}</Caixa>
          <Caixa>{ficha.slice(Math.ceil(ficha.length / 2)).map((f) => <Linha key={f.rotulo} rotulo={f.rotulo} valor={f.valor} />)}</Caixa>
        </div>
        <ListaOpcionais d={d} />
      </Secao>
    ),
    etapas: etapas.length > 0 && (
      <Secao n={num("etapas")} rotulo="Fluxo" titulo={lp.etapasTitulo || "Como comprar"}>
        <BlocoEtapas d={d} variante="numeradas" />
      </Secao>
    ),
    localizacao: (
      <Secao n={num("localizacao")} id="localizacao" rotulo="Localização" titulo={lp.localTitulo || "Venha fazer um test drive."}>
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            {lp.localTexto && <p className="whitespace-pre-line leading-relaxed" style={{ color: V.texto }}>{lp.localTexto}</p>}
            <Caixa className="mt-6">
              <Linha rotulo="Loja" valor={loja.nome} />
              {loja.endereco && <Linha rotulo="Endereço" valor={loja.endereco} />}
              {loja.cidade && <Linha rotulo="Cidade" valor={[loja.cidade, loja.uf].filter(Boolean).join("/")} />}
              {loja.horario && <Linha rotulo="Horário" valor={loja.horario} />}
            </Caixa>
          </div>
          <Caixa recuo={false} className="overflow-hidden"><Mapa d={d} className="min-h-[380px] !rounded-none" /></Caixa>
        </div>
        <p className="sr-only">{endereco}</p>
      </Secao>
    ),
    cards: <section className="border-t" style={{ borderColor: V.linha }}><div className="conteiner py-16"><CardsNavegacao d={d} /></div></section>,
    depoimentos: depoimentos.length > 0 && (
      <Secao n={num("depoimentos")} rotulo="Clientes" titulo={lp.depoimentosTitulo || "Quem já comprou com a gente"}>
        <BlocoDepoimentos d={d} />
      </Secao>
    ),
    faq: faq.length > 0 && (
      <Secao n={num("faq")} id="faq" rotulo="Perguntas" titulo="As dúvidas mais comuns. Respondidas.">
        <div className="grid gap-4 md:grid-cols-2">
          {faq.map((f, i) => (
            <Caixa key={i}>
              <details className="group">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden" style={{ color: V.titulo }}>
                  {f.pergunta}
                  <Plus className="mt-0.5 size-4 shrink-0 transition group-open:rotate-45" style={{ color: V.destaque }} aria-hidden="true" />
                </summary>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed" style={{ color: V.texto }}>{f.resposta}</p>
              </details>
            </Caixa>
          ))}
        </div>
      </Secao>
    ),
    contato: (
      <Secao n={num("contato")} id="contato" rotulo="Contato" titulo={lp.ctaTitulo || "Fale com um consultor."}>
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            {lp.ctaSubtitulo && <p className="text-lg" style={{ color: V.texto }}>{lp.ctaSubtitulo}</p>}
            <ul className="mt-6 space-y-3 text-sm" style={{ color: V.titulo }}>
              {[material ? material.rotulo : "Proposta com as condições de pagamento", "Avaliação do seu usado na troca", "Test drive no horário que preferir"].map((t) => (
                <li key={t} className="flex items-center gap-3"><Check className="size-4" style={{ color: V.destaque }} aria-hidden="true" /> {t}</li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap items-center gap-6">
              <CartaoVendedor d={d} />
              <BotaoWa d={d} verde><IconeWhatsApp className="size-4" /> WhatsApp</BotaoWa>
            </div>
          </div>
          <Caixa className="sm:p-8"><FormularioLP d={d} escuro className="!p-0" /></Caixa>
        </div>
      </Secao>
    ),
  };

  return (
    <>
      <Menu d={d} />
      <section id="topo" className="relative overflow-hidden">
        <div className="relative min-h-[82svh]">
          <MidiaTopo d={d} />
          <div className="absolute inset-0 opacity-60" style={{ backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,.07) 0 1px, transparent 1px 16px)" }} aria-hidden="true" />
          <div className="absolute inset-x-0 bottom-0 h-1/3" style={{ background: `linear-gradient(to bottom, transparent, ${V.fundo})` }} />
          <div className="conteiner relative grid min-h-[82svh] items-center gap-10 py-24 lg:grid-cols-[1.25fr_0.75fr]">
            <div>
              <LogoTopo d={d} />
              <Mono className="mb-5">{chamada}</Mono>
              <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl">{lp.headline || nomeCarro}</h1>
              {lp.subtitulo && <p className="mt-6 max-w-xl text-lg text-white/85">{lp.subtitulo}</p>}
              <div className="mt-8 flex flex-wrap gap-3">
                <BotaoCta d={d} className="px-8 py-4 text-base" />
                {material && <BotaoMaterial d={d} variante="vidro" className="px-8 py-4 text-base" />}
              </div>
              <div className="mt-10 grid max-w-xl grid-cols-3 gap-4 border-t border-white/15 pt-6">
                {fatos.slice(0, 3).map((f) => (
                  <div key={f.rotulo}>
                    <p className="text-xl font-semibold text-white sm:text-2xl">{f.valor}</p>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/70" style={{ fontFamily: MONO }}>{f.rotulo}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="border border-white/15 bg-black/55 p-6 text-white backdrop-blur" style={{ borderRadius: V.card }}>
              {depoimentos[0] ? (
                <>
                  <Mono className="mb-3">Cliente</Mono>
                  <p className="text-base leading-relaxed">“{depoimentos[0].texto}”</p>
                  <p className="mt-4 text-sm font-semibold">{depoimentos[0].nome}</p>
                  {depoimentos[0].contexto && <p className="text-xs text-white/70">{depoimentos[0].contexto}</p>}
                </>
              ) : (
                <>
                  <Mono className="mb-3">{v.carroceria} · {codigoVeiculo(v.codigo)}</Mono>
                  <p className="text-3xl font-semibold">{preco ?? `${v.marca} ${v.modelo}`}</p>
                  <div className="mt-3">
                    {fatos.slice(0, 4).map((f) => (
                      <div key={f.rotulo} className="flex justify-between gap-3 border-t border-white/15 py-2 text-sm"><span className="text-white/70">{f.rotulo}</span><span>{f.valor}</span></div>
                    ))}
                  </div>
                  <div className="mt-4 [&_p]:!text-white"><CartaoVendedor d={d} escuro /></div>
                </>
              )}
            </div>
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
