import { ArrowRight, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Download, Star, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link, useFetcher } from "react-router";
import type { porSlug } from "~/.server/anuncios";
import type { landingPages } from "~/.server/schema";
import { CamposMensagem } from "~/components/CamposMensagem";
import { IconeWhatsApp, LinkWhatsApp } from "~/components/WhatsApp";
import { anos, inteiro, km, moeda } from "~/lib/formato";
import { lerDepoimentos, lerDestaques, lerEtapas, lerFaq, lerNumeros, videoIncorporado, type Pergunta } from "~/lib/lp/conteudo";
import { infoEstilo } from "~/lib/lp/estilos";
import { componenteIcone, destaquesDosOpcionais } from "~/lib/lp/icones";
import { lerOcultas, lerOrdem, type SecaoLP, type SecaoOrdenavel } from "~/lib/lp/secoes";
import { FONTES_ESTILO, fundoEscuro, lerTema, varsTema } from "~/lib/lp/tema";
import { rastrear } from "~/lib/rastreamento";
import { cn } from "~/lib/ui";
import { useLoja } from "~/lib/useLoja";
import { codigoVeiculo } from "~/lib/veiculos";
import { videoDeFundo } from "~/lib/video";

/* ------------------------------------------------------------------ */
/* Dados compartilhados pelos estilos                                  */
/* ------------------------------------------------------------------ */

export type LinhaLP = typeof landingPages.$inferSelect;
export type VeiculoLP = NonNullable<Awaited<ReturnType<typeof porSlug>>>;

export type PropsLP = {
  lp: LinhaLP;
  veiculo: VeiculoLP;
  urlPagina: string;
  previa: boolean;
  equipe: boolean;
};

export type Fato = { rotulo: string; valor: string };

export function useLP(props: PropsLP) {
  const { lp, veiculo: v } = props;
  const loja = useLoja();
  const info = infoEstilo(lp.estilo);
  const tema = lerTema(lp.tema, info.tema);
  const ocultas = lerOcultas(lp.secoesOcultas);
  const mostrar = (k: SecaoLP) => !ocultas.has(k);
  const ordem = lerOrdem(lp.ordemSecoes).filter(mostrar);

  const fotos = v.fotos.map((f) => f.url);
  const nomeCarro = `${v.marca} ${v.modelo} ${v.versao} ${v.anoModelo}`;
  const evento = { id: v.id, nome: nomeCarro, valor: v.preco };
  const destaquesSalvos = lerDestaques(lp.destaques);
  const destaques = destaquesSalvos.length ? destaquesSalvos : destaquesDosOpcionais(v.opcionais);

  // WhatsApp: vendedor do carro; sem ele, a loja (LinkWhatsApp resolve).
  const numeroWa = v.vendedor?.whatsapp ? { whatsapp: v.vendedor.whatsapp, whatsappDdi: v.vendedor.whatsappDdi } : null;
  const temWa = Boolean(numeroWa || loja.whatsapp);
  const mensagemWa = lp.mensagemWhatsapp || `Olá! Vi a página do ${nomeCarro} e quero mais informações.`;
  const numeroFlutuante = lp.flutuanteNumero ? { whatsapp: lp.flutuanteNumero, whatsappDdi: lp.flutuanteDdi } : numeroWa;
  const flutuante = mostrar("whatsapp") && (numeroFlutuante || loja.whatsapp) ? { numero: numeroFlutuante, mensagem: lp.flutuanteMensagem || mensagemWa } : null;

  const [aberta, setAberta] = useState<number | null>(null);
  const fechar = useCallback(() => setAberta(null), []);
  const passo = useCallback((d: 1 | -1) => setAberta((i) => (i == null ? i : (i + d + fotos.length) % fotos.length)), [fotos.length]);

  const fatos: Fato[] = [
    { rotulo: "ano", valor: anos(v.anoFabricacao, v.anoModelo) },
    { rotulo: "km rodados", valor: inteiro(v.km) },
    { rotulo: "câmbio", valor: v.cambio },
    { rotulo: "combustível", valor: v.combustivel },
    ...(lp.mostrarPreco ? [{ rotulo: "à vista", valor: moeda(v.preco) }] : []),
  ];
  const ficha: Fato[] = [
    { rotulo: "Marca", valor: v.marca },
    { rotulo: "Modelo", valor: v.modelo },
    { rotulo: "Versão", valor: v.versao },
    { rotulo: "Ano", valor: anos(v.anoFabricacao, v.anoModelo) },
    { rotulo: "Quilometragem", valor: km(v.km) },
    { rotulo: "Câmbio", valor: v.cambio },
    { rotulo: "Combustível", valor: v.combustivel },
    { rotulo: "Carroceria", valor: v.carroceria },
    { rotulo: "Cor", valor: v.cor },
    { rotulo: "Portas", valor: String(v.portas) },
    { rotulo: "Código", valor: codigoVeiculo(v.codigo) },
  ];
  const endereco = [loja.endereco, loja.bairro, loja.cidade && `${loja.cidade}${loja.uf ? `/${loja.uf}` : ""}`].filter(Boolean).join(" · ");
  const chamada = [lp.nomeExibido, v.carroceria, anos(v.anoFabricacao, v.anoModelo), km(v.km)].filter(Boolean).join(" · ");

  return {
    ...props,
    v,
    loja,
    tema,
    fotos,
    nomeCarro,
    evento,
    disponivel: v.status === "ativo",
    mostrar,
    ordem,
    fatos,
    ficha: mostrar("ficha") ? ficha : [],
    chamada,
    endereco,
    destaques: mostrar("destaques") ? destaques : [],
    numeros: mostrar("numeros") ? lerNumeros(lp.numeros) : [],
    etapas: mostrar("etapas") ? lerEtapas(lp.etapas) : [],
    depoimentos: mostrar("depoimentos") ? lerDepoimentos(lp.depoimentos) : [],
    faq: mostrar("faq") ? lerFaq(lp.faq) : [],
    galeria: mostrar("galeria") ? fotos : [],
    topo: lp.imagemTopo || fotos[0] || null,
    videoTopo: videoDeFundo(lp.videoTopo),
    video: mostrar("video") ? videoIncorporado(lp.videoUrl) : null,
    faixa: mostrar("faixa") ? lp.secao2Imagem || fotos[1] || fotos[0] || null : null,
    material: lp.materialChave ? { url: `/imagens/${lp.materialChave}`, rotulo: lp.materialRotulo || "Baixar o material" } : null,
    temWa,
    numeroWa,
    mensagemWa,
    flutuante,
    // Com o formulário final oculto, os botões principais vão para o WhatsApp.
    ctaNoFormulario: mostrar("contato") || !temWa,
    aberta,
    setAberta,
    fechar,
    passo,
  };
}
export type LP = ReturnType<typeof useLP>;

/* ------------------------------------------------------------------ */
/* Peças reutilizáveis                                                 */
/* ------------------------------------------------------------------ */

export const V = {
  fundo: "var(--lp-fundo)",
  titulo: "var(--lp-titulo)",
  texto: "var(--lp-texto)",
  bloco: "var(--lp-bloco)",
  tituloBloco: "var(--lp-titulo-bloco)",
  textoBloco: "var(--lp-texto-bloco)",
  botao: "var(--lp-botao)",
  textoBotao: "var(--lp-texto-botao)",
  destaque: "var(--lp-destaque)",
  raio: "var(--lp-raio)",
  card: "var(--lp-raio-card)",
  fonte: "var(--lp-fonte-titulos)",
  fundoMenu: "var(--lp-fundo-menu)",
  textoMenu: "var(--lp-texto-menu)",
  linha: "var(--lp-linha)",
  cardFundo: "var(--lp-card)",
  rotulo: "var(--lp-rotulo)",
  rotuloBloco: "var(--lp-rotulo-bloco)",
};

/** Rótulo pequeno em caixa alta com traço, acima dos títulos. */
export function Rotulo({ children, escuro = false, centro = false }: { children: ReactNode; escuro?: boolean; centro?: boolean }) {
  return (
    <p className={cn("mb-4 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em]", centro && "justify-center")} style={{ color: escuro ? V.rotuloBloco : V.rotulo }}>
      <span className="h-px w-8" style={{ background: escuro ? V.rotuloBloco : V.rotulo }} />
      {children}
    </p>
  );
}

type Variante = "solido" | "contorno" | "vidro" | "menu";
const BASE_BOTAO = "inline-flex items-center justify-center gap-2 px-6 py-3 text-center font-semibold transition hover:brightness-110 active:brightness-95";

function estiloBotao(variante: Variante): CSSProperties {
  if (variante === "solido") return { background: V.botao, color: V.textoBotao, borderRadius: V.raio };
  if (variante === "contorno") return { border: `1.5px solid ${V.botao}`, color: V.botao, borderRadius: V.raio };
  if (variante === "menu") return { border: "1.5px solid color-mix(in srgb, var(--lp-texto-menu) 35%, transparent)", color: V.textoMenu, borderRadius: V.raio };
  return { background: "color-mix(in srgb, var(--lp-titulo-bloco) 18%, transparent)", color: "#fff", borderRadius: V.raio, backdropFilter: "blur(6px)" };
}

export function Botao({ href, onClick, children, variante = "solido", className = "" }: { href: string; onClick?: () => void; children: ReactNode; variante?: Variante; className?: string }) {
  return <a href={href} onClick={onClick} className={cn(BASE_BOTAO, className)} style={estiloBotao(variante)}>{children}</a>;
}

/** Botão de WhatsApp (conversão rastreada). `verde` usa a cor do WhatsApp em vez do tema. */
export function BotaoWa({ d, children, variante = "solido", verde = false, className = "" }: { d: LP; children: ReactNode; variante?: Variante; verde?: boolean; className?: string }) {
  if (!d.temWa) return null;
  return (
    <LinkWhatsApp numero={d.numeroWa} mensagem={d.mensagemWa} veiculo={d.evento} className={cn(BASE_BOTAO, className)}
      style={verde ? { background: "#128c4a", color: "#fff", borderRadius: V.raio } : estiloBotao(variante)}>
      {children}
    </LinkWhatsApp>
  );
}

/** Botão principal: leva ao formulário final ou, com ele oculto, ao WhatsApp. */
export function BotaoCta({ d, className = "", variante = "solido", children }: { d: LP; className?: string; variante?: Variante; children?: ReactNode }) {
  const texto = children ?? d.lp.textoBotao;
  if (d.ctaNoFormulario) return <Botao href="#contato" variante={variante} className={className}>{texto}</Botao>;
  return <BotaoWa d={d} variante={variante} className={className}><IconeWhatsApp className="size-4" /> {texto}</BotaoWa>;
}

export function IconeDestaque({ nome, className = "size-7" }: { nome: string; className?: string }) {
  const Icone = componenteIcone(nome);
  return <Icone className={className} strokeWidth={1.25} aria-hidden="true" />;
}

/** Fundo do topo: foto ou vídeo, sempre com véu escuro para o texto branco. */
export function MidiaTopo({ d }: { d: LP }) {
  const { topo, videoTopo, lp, nomeCarro } = d;
  const veu = Math.max(0, Math.min(90, lp.veuTopo)) / 100;
  return (
    <>
      {topo ? <img src={topo} alt={nomeCarro} className="absolute inset-0 size-full object-cover" fetchPriority="high" /> : <div className="absolute inset-0" style={{ background: V.bloco }} />}
      {videoTopo && (
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden motion-reduce:hidden">
          {videoTopo.tipo === "arquivo" ? (
            <video src={videoTopo.src} autoPlay muted loop playsInline poster={topo ?? undefined} className="size-full object-cover" />
          ) : (
            <iframe src={videoTopo.src} title="Vídeo de fundo" tabIndex={-1} allow="autoplay; encrypted-media"
              className="pointer-events-none absolute left-1/2 top-1/2 h-[max(100%,56.25vw)] w-[max(100%,177.78vh)] -translate-x-1/2 -translate-y-1/2 border-0" />
          )}
        </div>
      )}
      <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, rgba(0,0,0,${Math.max(0.15, veu - 0.2)}), rgba(0,0,0,${veu}) 55%, rgba(0,0,0,${Math.min(0.9, veu + 0.15)}))` }} />
    </>
  );
}

export function Video({ video, className = "" }: { video: NonNullable<LP["video"]>; className?: string }) {
  if (video.tipo === "arquivo") return <video className={cn("aspect-video w-full bg-black", className)} style={{ borderRadius: V.card }} controls playsInline preload="metadata" src={video.src} />;
  return (
    <iframe title="Vídeo do carro" className={cn("aspect-video w-full border-0 bg-black", className)} style={{ borderRadius: V.card }} src={video.src}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen loading="lazy" />
  );
}

/** Mapa do Google sem chave de API; sem endereço (ou mapa desligado), mostra uma foto. */
export function Mapa({ d, className }: { d: LP; className?: string }) {
  const consulta = d.lp.mapaEndereco || d.endereco.replaceAll(" · ", ", ");
  if (d.lp.mostrarMapa && consulta) {
    return (
      <iframe title="Mapa da loja" src={`https://www.google.com/maps?q=${encodeURIComponent(consulta)}&z=15&output=embed`}
        className={cn("min-h-[320px] w-full border-0", className)} style={{ borderRadius: V.card }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
    );
  }
  const foto = d.fotos[2] ?? d.fotos[0];
  return foto ? <img src={foto} alt="" className={cn("min-h-[320px] w-full object-cover", className)} style={{ borderRadius: V.card }} loading="lazy" /> : null;
}

export const rotaMapa = (d: LP) => {
  const consulta = d.lp.mapaEndereco || d.endereco.replaceAll(" · ", ", ");
  return consulta ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(consulta)}` : null;
};

export function ListaFaq({ faq, escuro = false }: { faq: Pergunta[]; escuro?: boolean }) {
  return (
    <div className={cn("divide-y", escuro ? "divide-white/15" : "divide-black/10")}>
      {faq.map((f, i) => (
        <details key={i} className="group py-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden" style={{ color: escuro ? V.tituloBloco : V.titulo }}>
            {f.pergunta}
            <ChevronDown className="size-5 shrink-0 transition group-open:rotate-180" aria-hidden="true" />
          </summary>
          <p className="mt-3 whitespace-pre-line" style={{ color: escuro ? V.textoBloco : V.texto }}>{f.resposta}</p>
        </details>
      ))}
    </div>
  );
}

/** Quem atende: o vendedor do carro ou, sem ele, a loja. */
export function CartaoVendedor({ d, escuro = false }: { d: LP; escuro?: boolean }) {
  const vendedor = d.v.vendedor;
  const nome = vendedor?.nome ?? d.loja.nome;
  const foto = vendedor?.foto ?? null;
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-white text-lg font-bold shadow-sm" style={{ color: V.titulo }}>
        {foto ? <img src={foto} alt="" className="size-full object-cover" /> : nome.charAt(0)}
      </div>
      <div style={{ color: escuro ? V.tituloBloco : V.titulo }}>
        <p className="font-semibold">{nome}</p>
        <p className="text-xs opacity-75">{vendedor ? `Consultor · ${d.loja.nome}` : "Equipe de vendas"}</p>
      </div>
    </div>
  );
}

/** Ficha técnica do carro (no lugar das "plantas" da referência). */
export function FichaTecnica({ d, variante = "tabela", escuro = false }: { d: LP; variante?: "tabela" | "grade"; escuro?: boolean }) {
  const titulo = escuro ? V.tituloBloco : V.titulo;
  const texto = escuro ? V.textoBloco : V.texto;
  const linha = escuro ? "color-mix(in srgb, var(--lp-titulo-bloco) 18%, transparent)" : V.linha;
  if (variante === "grade") {
    return (
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {d.ficha.map((f) => (
          <div key={f.rotulo} className="border p-4" style={{ borderColor: linha, borderRadius: V.card, background: escuro ? "color-mix(in srgb, var(--lp-titulo-bloco) 6%, transparent)" : V.cardFundo }}>
            <dt className="text-xs" style={{ color: texto }}>{f.rotulo}</dt>
            <dd className="mt-1 font-semibold" style={{ color: titulo }}>{f.valor}</dd>
          </div>
        ))}
      </dl>
    );
  }
  return (
    <dl className="grid gap-x-10 sm:grid-cols-2">
      {d.ficha.map((f) => (
        <div key={f.rotulo} className="flex items-baseline justify-between gap-4 border-b py-3 text-sm" style={{ borderColor: linha }}>
          <dt style={{ color: texto }}>{f.rotulo}</dt>
          <dd className="text-right font-semibold" style={{ color: titulo }}>{f.valor}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Opcionais do carro em lista com check (complemento da ficha). */
export function ListaOpcionais({ d, escuro = false }: { d: LP; escuro?: boolean }) {
  if (!d.v.opcionais.length) return null;
  return (
    <ul className="mt-8 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
      {d.v.opcionais.map((o) => (
        <li key={o} className="flex items-center gap-2" style={{ color: escuro ? V.textoBloco : V.texto }}>
          <Check className="size-4 shrink-0" style={{ color: V.destaque }} aria-hidden="true" /> {o}
        </li>
      ))}
    </ul>
  );
}

export function CardsNavegacao({ d }: { d: LP }) {
  const { fotos, mostrar, galeria, ficha } = d;
  type Card = { href: string; titulo: string; texto: string; img?: string };
  const cards = ([
    galeria.length ? { href: "#fotos", titulo: "Fotos", texto: "Veja cada detalhe", img: fotos[0] } : null,
    ficha.length ? { href: "#ficha", titulo: "Ficha técnica", texto: "Ano, km, câmbio e itens", img: fotos[1] ?? fotos[0] } : null,
    mostrar("localizacao") ? { href: "#localizacao", titulo: "Localização", texto: "Agende seu test drive", img: fotos[2] ?? fotos[0] } : null,
  ] as (Card | null)[]).filter((c): c is Card => c !== null);
  if (!cards.length) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cards.map((c) => (
        <a key={c.href} href={c.href} className="group relative aspect-[4/3] overflow-hidden bg-black/10" style={{ borderRadius: V.card }}>
          {c.img && <img src={c.img} alt="" className="absolute inset-0 size-full object-cover transition duration-500 group-hover:scale-[1.04]" loading="lazy" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-4 text-white">
            <p className="text-lg font-bold">{c.titulo}</p>
            <p className="flex items-center gap-1 text-xs text-white/85">{c.texto} <ArrowRight className="size-3.5" aria-hidden="true" /></p>
          </div>
        </a>
      ))}
    </div>
  );
}

type RespostaLead = { enviada?: boolean; eventId?: string; url?: string; erro?: string; erros?: Record<string, string> };

/** Botão "Baixar o material": pede o contato, registra o lead e libera o PDF. */
export function BotaoMaterial(props: { d: LP; variante?: Variante; className?: string }) {
  // Sem material, nem cria o fetcher.
  return props.d.material ? <ModalMaterial {...props} material={props.d.material} /> : null;
}

function ModalMaterial({ d, material, variante = "solido", className = "" }: { d: LP; material: NonNullable<LP["material"]>; variante?: Variante; className?: string }) {
  const { evento } = d;
  const [aberto, setAberto] = useState(false);
  const envio = useFetcher<RespostaLead>();
  const url = envio.data?.url;
  useEffect(() => {
    if (!url) return;
    rastrear("formulario", { ...evento, origem: "landing_page", eventId: envio.data?.eventId });
    window.open(url, "_blank", "noopener");
  }, [url]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <button type="button" onClick={() => setAberto(true)} className={cn(BASE_BOTAO, className)} style={estiloBotao(variante)}>
        <Download className="size-4" aria-hidden="true" /> {material.rotulo}
      </button>
      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label={material.rotulo}
          onClick={(e) => e.target === e.currentTarget && setAberto(false)} onKeyDown={(e) => e.key === "Escape" && setAberto(false)}>
          <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto bg-white p-6 text-texto shadow-xl" style={{ borderRadius: V.card }}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-tinta">{material.rotulo}</h3>
                <p className="text-sm text-suave">{url ? "Pronto! Se o arquivo não abriu, use o botão abaixo." : "Deixe seu contato para liberar o arquivo."}</p>
              </div>
              <button type="button" onClick={() => setAberto(false)} className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-fundo" aria-label="Fechar"><X className="size-5" /></button>
            </div>
            {url ? (
              <a href={url} target="_blank" rel="noopener" className="botao-primario w-full" style={{ background: V.botao, color: V.textoBotao, borderRadius: V.raio }}>
                <Download className="size-4" aria-hidden="true" /> Abrir o material
              </a>
            ) : (
              <envio.Form method="post" noValidate>
                <input type="hidden" name="intencao" value="material" />
                <CamposMensagem erros={envio.data?.erros} prefixo="lp-material" mostrarTexto={false} />
                {envio.data?.erro && <p role="alert" className="mt-3 text-sm text-erro">{envio.data.erro}</p>}
                <button type="submit" disabled={envio.state !== "idle"} className={cn(BASE_BOTAO, "mt-4 w-full")} style={estiloBotao("solido")}>
                  {envio.state !== "idle" ? "Liberando…" : "Receber o material"}
                </button>
              </envio.Form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const FORM_ESCURO = "!bg-transparent !shadow-none text-white [&_.rotulo]:text-white/85 [&_.campo]:border-white/25 [&_.campo]:bg-white/10 [&_.campo]:text-white [&_.campo]:placeholder:text-white/50 [&_.text-suave]:text-white/65 [&_.text-erro]:text-red-300";

/** Formulário de contato da landing page. `compacto` esconde a mensagem (formulário no topo). */
export function FormularioLP({ d, prefixo = "lp", escuro = false, compacto = false, className = "" }: { d: LP; prefixo?: string; escuro?: boolean; compacto?: boolean; className?: string }) {
  const envio = useFetcher<RespostaLead>();
  const enviada = Boolean(envio.data?.enviada);
  useEffect(() => {
    if (enviada) rastrear("formulario", { ...d.evento, origem: "landing_page", eventId: envio.data?.eventId });
  }, [enviada]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!d.disponivel) {
    return (
      <div className={cn("bg-white p-6 text-texto shadow-sm", className)} style={{ borderRadius: V.card }}>
        <p className="text-lg font-bold text-tinta">Este carro já foi vendido</p>
        <p className="mt-1 text-sm text-suave">Temos outras opções parecidas no estoque.</p>
        <Link to="/carros" className="botao-primario mt-4 w-full">Ver o estoque</Link>
      </div>
    );
  }
  if (enviada) {
    return (
      <div role="status" className={cn("flex items-start gap-3 bg-white p-6 text-sucesso shadow-sm", className)} style={{ borderRadius: V.card }}>
        <CheckCircle2 className="mt-0.5 size-6 shrink-0" aria-hidden="true" />
        <p className="font-medium">Recebemos seu contato! Em instantes um consultor fala com você.</p>
      </div>
    );
  }
  return (
    <envio.Form method="post" noValidate className={cn("bg-white p-6 text-texto shadow-[0_20px_60px_rgba(0,0,0,0.12)] sm:p-8", escuro && FORM_ESCURO, className)} style={{ borderRadius: V.card }}>
      <input type="hidden" name="intencao" value="lead" />
      <CamposMensagem erros={envio.data?.erros} prefixo={prefixo} mostrarTexto={!compacto} rotuloTexto="Mensagem (opcional)" />
      {envio.data?.erro && <p role="alert" className="mt-3 text-sm text-erro">{envio.data.erro}</p>}
      <button type="submit" disabled={envio.state !== "idle"} className={cn(BASE_BOTAO, "mt-4 w-full py-3.5")} style={estiloBotao("solido")}>
        {envio.state !== "idle" ? "Enviando…" : "Quero ser atendido"} <ArrowRight className="size-4" aria-hidden="true" />
      </button>
    </envio.Form>
  );
}

/** Contêiner com as variáveis do tema, a fonte do estilo e os avisos para a equipe. */
export function Casca({ d, children }: { d: LP; children: ReactNode }) {
  const { lp, tema, previa, equipe, disponivel } = d;
  const fonte = FONTES_ESTILO[lp.estilo] ?? FONTES_ESTILO.clean;
  return (
    <div className="min-h-dvh overflow-x-clip" style={{ ...(varsTema(tema, lp.estiloBotao, lp.estilo) as CSSProperties), background: V.fundo, color: V.texto, fontFamily: "var(--lp-fonte-corpo)" }}>
      {fonte.href && <link rel="stylesheet" href={fonte.href} precedence="lp-fonte" />}
      {equipe && (
        <div className="bg-alerta-fundo px-4 py-2 text-center text-sm text-alerta">
          {previa ? "Pré-visualização: rascunho, só a equipe vê" : "Visível para a equipe"} · {lp.visitas} visitas
          {!disponivel && " · o carro não está à venda"} ·{" "}
          <Link to={`/admin/landing-pages/${lp.id}`} className="font-semibold underline">Editar</Link>
        </div>
      )}
      {children}
    </div>
  );
}

/** Logo da loja. Sobre fundo escuro usa o logo claro; sem ele, põe o logo numa plaquinha branca. */
function Logo({ d, cor, escuro }: { d: LP; cor: string; escuro: boolean }) {
  const { logo, logoClaro, nome } = d.loja;
  const src = escuro ? logoClaro ?? logo : logo;
  return src
    ? <img src={src} alt={nome} className={cn("h-9 w-auto max-w-[180px] object-contain sm:h-10", escuro && !logoClaro && "rounded-md bg-white px-2 py-1")} />
    : <span className="text-lg font-extrabold tracking-tight" style={{ color: cor }}>{nome}</span>;
}

/** Logo sobre o topo quando o menu está oculto: sem fundo e sem link. */
export function LogoTopo({ d, claro = true }: { d: LP; claro?: boolean }) {
  if (d.mostrar("menu")) return null;
  const src = claro ? d.lp.logoTopo || d.loja.logoClaro : d.loja.logo;
  return (
    <div className="mb-8">
      {src
        ? <img src={src} alt={d.loja.nome} className="h-12 w-auto max-w-[220px] object-contain" />
        : <span className="text-xl font-extrabold tracking-tight" style={{ color: claro ? "#fff" : V.titulo }}>{d.loja.nome}</span>}
    </div>
  );
}

/** Menu superior. `largura`: "total", "conteiner" ou classes próprias. */
export function Menu({ d, centralizado = false, fixo = true, caixaAlta = false, largura = "conteiner" }: { d: LP; centralizado?: boolean; fixo?: boolean; caixaAlta?: boolean; largura?: string }) {
  const { mostrar, galeria, ficha, faq, material, tema } = d;
  if (!mostrar("menu")) return null;
  const link = "py-2 opacity-75 transition hover:opacity-100";
  return (
    <header className={cn("z-40 w-full border-b backdrop-blur", fixo && "sticky top-0", caixaAlta && "[&_nav]:text-[11px] [&_nav]:font-semibold [&_nav]:uppercase [&_nav]:tracking-[0.2em]")}
      style={{ borderColor: "rgba(0,0,0,.1)", background: "color-mix(in srgb, var(--lp-fundo-menu) 94%, transparent)", color: V.textoMenu }}>
      <div className={cn("relative flex h-16 items-center justify-between gap-4 sm:h-[72px]", largura === "total" ? "w-full px-4 sm:px-8" : largura === "conteiner" ? "conteiner" : largura)}>
        <Logo d={d} cor={V.textoMenu} escuro={fundoEscuro(tema.fundoMenu)} />
        <nav className={cn("hidden items-center gap-7 text-sm font-medium lg:flex", centralizado && "absolute left-1/2 -translate-x-1/2")} aria-label="Seções">
          {mostrar("conceito") && <a href="#carro" className={link}>O carro</a>}
          {galeria.length > 0 && <a href="#fotos" className={link}>Fotos</a>}
          {ficha.length > 0 && <a href="#ficha" className={link}>Ficha técnica</a>}
          {mostrar("localizacao") && <a href="#localizacao" className={link}>Localização</a>}
          {faq.length > 0 && <a href="#faq" className={link}>Dúvidas</a>}
        </nav>
        <div className="flex items-center gap-2">
          {material ? <BotaoMaterial d={d} variante="menu" className="hidden !px-4 !py-2 text-xs sm:inline-flex" />
            : mostrar("contato") ? <Botao href="#contato" variante="menu" className="hidden !px-4 !py-2 text-xs sm:inline-flex">Quero informações</Botao> : null}
          <BotaoWa d={d} className="!px-4 !py-2 text-xs">
            <IconeWhatsApp className="size-4" /> <span className="hidden sm:inline">Fale conosco</span><span className="sr-only sm:hidden">WhatsApp</span>
          </BotaoWa>
        </div>
      </div>
    </header>
  );
}

export function Rodape({ d }: { d: LP }) {
  const { loja, tema, lp } = d;
  const escuro = fundoEscuro(tema.fundo);
  return (
    <footer className="border-t" style={{ background: V.fundo, borderColor: V.linha }}>
      <div className="conteiner flex flex-col items-center justify-between gap-4 py-10 text-center text-xs sm:flex-row sm:text-left" style={{ color: V.texto }}>
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          {escuro && lp.logoTopo ? <img src={lp.logoTopo} alt={loja.nome} className="h-9 w-auto max-w-[160px] object-contain" /> : <Logo d={d} cor={V.titulo} escuro={escuro} />}
          {loja.cnpj && <span className="opacity-75">CNPJ {loja.cnpj}</span>}
        </div>
        {d.endereco && <p className="opacity-75">{d.endereco}</p>}
        <div className="flex gap-4">
          <Link to="/carros" className="py-2 font-medium underline-offset-4 hover:underline">Ver todo o estoque</Link>
          <Link to="/privacidade" className="py-2 underline-offset-4 hover:underline">Privacidade</Link>
        </div>
      </div>
    </footer>
  );
}

export function WhatsFlutuante({ d }: { d: LP }) {
  const { flutuante, evento } = d;
  if (!flutuante) return null;
  return (
    <LinkWhatsApp numero={flutuante.numero} mensagem={flutuante.mensagem} veiculo={evento} aria-label="Falar no WhatsApp"
      className="fixed bottom-5 right-5 z-40 grid size-14 place-items-center rounded-full bg-[#128c4a] text-white shadow-flutuante transition-transform hover:scale-105">
      <IconeWhatsApp className="size-7" />
    </LinkWhatsApp>
  );
}

/** Fotos ampliadas: <dialog> nativo (Esc fecha, foco preso), setas e deslizar. */
export function Ampliacao({ d }: { d: LP }) {
  const { aberta, fechar, passo, fotos, nomeCarro } = d;
  const dialogo = useRef<HTMLDialogElement>(null);
  const toque = useRef<number | null>(null);
  useEffect(() => {
    const el = dialogo.current;
    if (!el) return;
    if (aberta != null && !el.open) el.showModal();
    if (aberta == null && el.open) el.close();
  }, [aberta]);
  return (
    <dialog ref={dialogo} aria-label={`Fotos de ${nomeCarro}`} onClose={fechar}
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-transparent p-0 backdrop:bg-black/95"
      onKeyDown={(e) => { if (e.key === "ArrowRight") passo(1); if (e.key === "ArrowLeft") passo(-1); }}>
      {aberta != null && fotos[aberta] && (
        <div className="flex h-full flex-col"
          onTouchStart={(e) => { toque.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => { if (toque.current == null) return; const dx = e.changedTouches[0].clientX - toque.current; if (Math.abs(dx) > 40) passo(dx < 0 ? 1 : -1); toque.current = null; }}>
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <span className="numeros text-sm">{aberta + 1} / {fotos.length}</span>
            <button type="button" onClick={fechar} className="grid size-11 place-items-center rounded-full hover:bg-white/10" aria-label="Fechar"><X className="size-6" /></button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-6" onClick={(e) => e.target === e.currentTarget && fechar()}>
            <img src={fotos[aberta]} alt={`${nomeCarro} — foto ${aberta + 1}`} className="max-h-full max-w-full object-contain" />
            {fotos.length > 1 && (
              <>
                <button type="button" onClick={() => passo(-1)} aria-label="Foto anterior" className="absolute left-4 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25"><ChevronLeft className="size-6" /></button>
                <button type="button" onClick={() => passo(1)} aria-label="Próxima foto" className="absolute right-4 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25"><ChevronRight className="size-6" /></button>
              </>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Renderização na ordem escolhida no editor                           */
/* ------------------------------------------------------------------ */

export type Partes = Partial<Record<SecaoOrdenavel, ReactNode>>;
export function Ordenadas({ d, partes }: { d: LP; partes: Partes }) {
  return <>{d.ordem.map((k) => (partes[k] ? <div key={k} data-secao={k}>{partes[k]}</div> : null))}</>;
}

/* ------------------------------------------------------------------ */
/* Números, etapas, depoimentos e faixa rolante                        */
/* ------------------------------------------------------------------ */

const ROMANOS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

export function BlocoNumeros({ d, variante = "faixa", escuro = false, className = "" }: { d: LP; variante?: "faixa" | "cards" | "serifa"; escuro?: boolean; className?: string }) {
  const { numeros } = d;
  if (!numeros.length) return null;
  const titulo = escuro ? V.tituloBloco : V.titulo;
  const texto = escuro ? V.textoBloco : V.texto;
  const linha = escuro ? "color-mix(in srgb, var(--lp-titulo-bloco) 18%, transparent)" : V.linha;
  if (variante === "cards") {
    return (
      <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}>
        {numeros.map((n, i) => (
          <div key={i} className="border p-5" style={{ borderColor: linha, borderRadius: V.card, background: escuro ? "color-mix(in srgb, var(--lp-titulo-bloco) 6%, transparent)" : V.cardFundo }}>
            <p className="text-3xl font-extrabold tracking-tight" style={{ color: V.destaque }}>{n.valor}</p>
            <p className="mt-1 text-sm" style={{ color: texto }}>{n.rotulo}</p>
          </div>
        ))}
      </div>
    );
  }
  if (variante === "serifa") {
    return (
      <div className={cn("grid grid-cols-2 gap-8 lg:grid-cols-4", className)}>
        {numeros.map((n, i) => (
          <div key={i} className="text-center">
            <p className="text-4xl sm:text-5xl" style={{ fontFamily: V.fonte, color: V.destaque }}>{n.valor}</p>
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.25em]" style={{ color: texto }}>{n.rotulo}</p>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className={cn("grid grid-cols-2 gap-y-6 lg:grid-cols-4", className)}>
      {numeros.map((n, i) => (
        <div key={i} className="border-l px-5 py-2" style={{ borderColor: linha }}>
          <p className="text-3xl font-semibold tracking-tight" style={{ color: titulo }}>{n.valor}</p>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.2em]" style={{ color: texto }}>{n.rotulo}</p>
        </div>
      ))}
    </div>
  );
}

export function BlocoEtapas({ d, variante = "cards", escuro = false, className = "" }: { d: LP; variante?: "numeradas" | "cards" | "lista"; escuro?: boolean; className?: string }) {
  const { etapas } = d;
  if (!etapas.length) return null;
  const titulo = escuro ? V.tituloBloco : V.titulo;
  const texto = escuro ? V.textoBloco : V.texto;
  const linha = escuro ? "color-mix(in srgb, var(--lp-titulo-bloco) 18%, transparent)" : V.linha;
  const fundo = escuro ? "color-mix(in srgb, var(--lp-titulo-bloco) 6%, transparent)" : V.cardFundo;
  if (variante === "numeradas") {
    return (
      <ol className={cn("grid border-l border-t sm:grid-cols-2 lg:grid-cols-4", className)} style={{ borderColor: linha }}>
        {etapas.map((e, i) => (
          <li key={i} className="border-b border-r p-6" style={{ borderColor: linha }}>
            <p className="text-2xl" style={{ fontFamily: V.fonte, color: V.destaque }}>{ROMANOS[i] ?? i + 1}.</p>
            <p className="mt-3 font-semibold" style={{ color: titulo }}>{e.titulo}</p>
            {e.texto && <p className="mt-2 text-sm leading-relaxed" style={{ color: texto }}>{e.texto}</p>}
          </li>
        ))}
      </ol>
    );
  }
  if (variante === "lista") {
    return (
      <ol className={cn("grid gap-4", className)}>
        {etapas.map((e, i) => (
          <li key={i} className="flex gap-5 border p-5" style={{ borderColor: linha, borderRadius: V.card, background: fundo }}>
            <span className="numeros w-10 shrink-0 text-2xl font-semibold" style={{ color: V.destaque }}>{String(i + 1).padStart(2, "0")}</span>
            <div>
              <p className="font-semibold" style={{ color: titulo }}>{e.titulo}</p>
              {e.texto && <p className="mt-1 text-sm leading-relaxed" style={{ color: texto }}>{e.texto}</p>}
            </div>
          </li>
        ))}
      </ol>
    );
  }
  return (
    <ol className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {etapas.map((e, i) => (
        <li key={i} className="p-5" style={{ borderRadius: V.card, background: fundo, border: `1px solid ${linha}` }}>
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: escuro ? V.rotuloBloco : V.rotulo }}>Passo {i + 1}</p>
          <p className="mt-2 font-semibold" style={{ color: titulo }}>{e.titulo}</p>
          {e.texto && <p className="mt-1.5 text-sm leading-relaxed" style={{ color: texto }}>{e.texto}</p>}
        </li>
      ))}
    </ol>
  );
}

export function Estrelas({ className = "size-3.5", cor }: { className?: string; cor?: string }) {
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label="5 estrelas" style={{ color: cor ?? V.destaque }}>
      {[0, 1, 2, 3, 4].map((i) => <Star key={i} className={className} fill="currentColor" strokeWidth={0} aria-hidden="true" />)}
    </span>
  );
}

export function BlocoDepoimentos({ d, variante = "cards", escuro = false, className = "", corEstrelas }: { d: LP; variante?: "cards" | "citacoes"; escuro?: boolean; className?: string; corEstrelas?: string }) {
  const { depoimentos } = d;
  if (!depoimentos.length) return null;
  const titulo = escuro ? V.tituloBloco : V.titulo;
  const texto = escuro ? V.textoBloco : V.texto;
  const linha = escuro ? "color-mix(in srgb, var(--lp-titulo-bloco) 18%, transparent)" : V.linha;
  if (variante === "citacoes") {
    return (
      <div className={cn("grid gap-8 md:grid-cols-2", className)}>
        {depoimentos.map((t, i) => (
          <figure key={i} className="border-l-2 pl-6" style={{ borderColor: V.destaque }}>
            <blockquote className="text-xl leading-snug sm:text-2xl" style={{ fontFamily: V.fonte, color: titulo }}>“{t.texto}”</blockquote>
            <figcaption className="mt-4 text-sm" style={{ color: texto }}>
              <span className="font-semibold" style={{ color: titulo }}>{t.nome}</span>{t.contexto && <span> · {t.contexto}</span>}
            </figcaption>
          </figure>
        ))}
      </div>
    );
  }
  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-3", className)}>
      {depoimentos.map((t, i) => (
        <figure key={i} className="flex flex-col p-6" style={{ borderRadius: V.card, background: escuro ? "color-mix(in srgb, var(--lp-titulo-bloco) 6%, transparent)" : V.cardFundo, border: `1px solid ${linha}` }}>
          <Estrelas cor={corEstrelas} />
          <blockquote className="mt-3 flex-1 text-sm leading-relaxed" style={{ color: texto }}>“{t.texto}”</blockquote>
          <figcaption className="mt-4 text-sm">
            <span className="font-semibold" style={{ color: titulo }}>{t.nome}</span>
            {t.contexto && <span className="block text-xs opacity-75" style={{ color: texto }}>{t.contexto}</span>}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

/** Faixa rolante com os dados do carro. */
export function FaixaRolante({ d }: { d: LP }) {
  const itens = [...d.fatos.map((f) => f.valor), ...d.destaques.slice(0, 4).map((h) => h.rotulo)];
  if (!itens.length) return null;
  const linha = itens.map((t, i) => (
    <span key={i} className="flex items-center gap-6 whitespace-nowrap px-3 text-[11px] font-semibold uppercase tracking-[0.25em]">
      {t} <span aria-hidden="true" style={{ color: V.destaque }}>◆</span>
    </span>
  ));
  return (
    <div className="overflow-hidden border-y py-3" style={{ borderColor: "rgba(255,255,255,.12)", color: V.titulo, background: "color-mix(in srgb, var(--lp-fundo) 70%, black)" }} aria-hidden="true">
      <div className="flex w-max animate-[lp-rolar_40s_linear_infinite] motion-reduce:animate-none">
        <div className="flex">{linha}</div>
        <div className="flex">{linha}</div>
      </div>
      <style>{"@keyframes lp-rolar{from{transform:translateX(0)}to{transform:translateX(-50%)}}"}</style>
    </div>
  );
}

/**
 * Grade de fotos em mosaico (a partir do tablet) que se ajusta à quantidade:
 * sem quadros vazios quando o carro tem só 1, 2 ou 3 fotos.
 */
export function mosaico(total: number, maximo: 3 | 5) {
  const n = Math.min(total, maximo);
  const grade = n <= 1 ? "md:grid-cols-1" : n === 2 ? "md:grid-cols-2" : n === 3 ? "md:grid-cols-3 md:grid-rows-2" : "md:grid-cols-4 md:grid-rows-2";
  const item = (i: number) => (n <= 2 ? "" : i === 0 ? "md:col-span-2 md:row-span-2" : n === 4 && i === 1 ? "md:col-span-2" : "");
  return { n, grade, item };
}

/** Preço formatado quando a página mostra preço. */
export const precoDe = (d: LP) => (d.lp.mostrarPreco ? moeda(d.v.preco) : null);
