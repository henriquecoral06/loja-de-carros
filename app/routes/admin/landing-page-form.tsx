import { waitUntil } from "cloudflare:workers";
import { and, asc, eq, ne } from "drizzle-orm";
import { ArrowDown, ArrowRight, ArrowUp, Check, ChevronDown, Copy, ExternalLink, Eye, EyeOff, MessageCircle, Plus, Sparkles, Trash2, Wand2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { data, Form, Link, redirect, useNavigation, useSearchParams } from "react-router";
import { porSlug } from "~/.server/anuncios";
import { db, schema } from "~/.server/db";
import { validarImagem, validarLogo, validarPdf, salvarArquivoLP, urlImagem } from "~/.server/imagens";
import { arquivosDaLP, removerArquivosSemUso } from "~/.server/landing";
import { lojaCompleta } from "~/.server/loja";
import { exigirUsuario } from "~/.server/sessao";
import { exigirMesmaOrigem } from "~/.server/seguranca";
import { ArquivoImagem, CampoTelefone, SeletorCor } from "~/components/admin/campos";
import { Aviso, Cabecalho } from "~/components/admin/ui";
import { CampoArea, CampoSelecao, CampoTexto } from "~/components/Campo";
import { anos, apenasDigitos, km, moeda, slugify } from "~/lib/formato";
import { LIMITES, lerDepoimentos, lerDestaques, lerEtapas, lerFaq, lerNumeros, videoIncorporado, type Depoimento, type Destaque, type Etapa, type Numero, type Pergunta } from "~/lib/lp/conteudo";
import { INFO_ESTILOS, infoEstilo } from "~/lib/lp/estilos";
import { componenteIcone, destaquesDosOpcionais, iconeValido, OPCOES_ICONE } from "~/lib/lp/icones";
import { textosDoVeiculo, textosModelo, type SementeLP } from "~/lib/lp/padroes";
import { ehOrdenavel, ehSecao, lerOcultas, lerOrdem, type SecaoLP, type SecaoOrdenavel } from "~/lib/lp/secoes";
import { CAMPOS_TEMA, ehHex, ESTILOS_BOTAO, GRUPOS_TEMA, lerTema, type EstiloBotao, type TemaLP } from "~/lib/lp/tema";
import { metaAdmin } from "~/lib/site";
import { cn } from "~/lib/ui";
import { codigoVeiculo, ESTILOS_LP, type EstiloLP } from "~/lib/veiculos";
import { videoDeFundo } from "~/lib/video";
import type { Route } from "./+types/landing-page-form";

export function meta({ params, matches }: Route.MetaArgs) {
  return metaAdmin(params.id ? "Editar landing page" : "Nova landing page", matches);
}

const ehEstilo = (v: unknown): v is EstiloLP => (ESTILOS_LP as readonly unknown[]).includes(v);

export async function loader({ request, params }: Route.LoaderArgs) {
  await exigirUsuario(request);
  const { anuncios, marcas, modelos } = schema;
  const url = new URL(request.url);
  const veiculos = await db.select({
    id: anuncios.id, slug: anuncios.slug, codigo: anuncios.codigo, marca: marcas.nome, modelo: modelos.nome, versao: anuncios.versao,
    anoModelo: anuncios.anoModelo, status: anuncios.status,
  }).from(anuncios)
    .innerJoin(marcas, eq(marcas.id, anuncios.marcaId))
    .innerJoin(modelos, eq(modelos.id, anuncios.modeloId))
    .orderBy(asc(marcas.nome), asc(modelos.nome));

  let lp: typeof schema.landingPages.$inferSelect | null = null;
  if (params.id) {
    [lp] = await db.select().from(schema.landingPages).where(eq(schema.landingPages.id, params.id)).limit(1);
    if (!lp) throw data("Landing page não encontrada", { status: 404 });
  }
  const idVeiculo = lp?.anuncioId ?? url.searchParams.get("veiculo") ?? "";
  const escolhido = veiculos.find((v) => v.id === idVeiculo);
  const modo = url.searchParams.get("modo") === "modelo" ? "modelo" : "veiculo";
  const estiloParam = url.searchParams.get("estilo");
  const estilo: EstiloLP = lp?.estilo ?? (ehEstilo(estiloParam) ? estiloParam : "editorial");

  // Etapa 1: escolher carro, ponto de partida e estilo.
  if (!lp && (!escolhido || !url.searchParams.get("continuar"))) {
    return { etapa: 1 as const, veiculos, veiculoInicial: idVeiculo };
  }

  const veiculo = await porSlug(escolhido!.slug);
  if (!veiculo) throw data("Veículo não encontrado", { status: 404 });
  const loja = await lojaCompleta();
  const doVeiculo = textosDoVeiculo(veiculo, loja);
  const modelo = textosModelo(veiculo, loja);
  const inicial: SementeLP = lp
    ? {
        nomeExibido: lp.nomeExibido, headline: lp.headline, subtitulo: lp.subtitulo,
        secao1Titulo: lp.secao1Titulo, secao1Texto: lp.secao1Texto, secao2Titulo: lp.secao2Titulo, secao2Texto: lp.secao2Texto,
        localTitulo: lp.localTitulo, localTexto: lp.localTexto, mapaEndereco: lp.mapaEndereco,
        ctaTitulo: lp.ctaTitulo, ctaSubtitulo: lp.ctaSubtitulo, mensagemWhatsapp: lp.mensagemWhatsapp,
        videoTitulo: lp.videoTitulo, fichaTitulo: lp.fichaTitulo, numerosTitulo: lp.numerosTitulo, etapasTitulo: lp.etapasTitulo, depoimentosTitulo: lp.depoimentosTitulo,
        faq: lerFaq(lp.faq), destaques: lerDestaques(lp.destaques), numeros: lerNumeros(lp.numeros), etapas: lerEtapas(lp.etapas), depoimentos: lerDepoimentos(lp.depoimentos),
      }
    : modo === "modelo" ? modelo : doVeiculo;

  return {
    etapa: 2 as const,
    lp,
    veiculo,
    modo,
    estilo,
    doVeiculo,
    modelo,
    inicial,
    tema: lerTema(lp?.tema, infoEstilo(estilo).tema),
    estiloBotao: (lp?.estiloBotao ?? infoEstilo(estilo).botao) as EstiloBotao,
    ocultas: [...lerOcultas(lp?.secoesOcultas)],
    ordem: lerOrdem(lp?.ordemSecoes),
    origem: url.origin,
  };
}

type Erros = Record<string, string>;
const MENSAGEM_IMAGEM = { vazia: "Arquivo vazio.", grande: "A imagem é grande demais. Envie uma menor.", formato: "Envie JPG, PNG ou WebP." } as const;

export async function action({ request, params }: Route.ActionArgs) {
  exigirMesmaOrigem(request);
  await exigirUsuario(request);
  const form = await request.formData();
  const t = (k: string, max = 3000) => String(form.get(k) ?? "").trim().slice(0, max);
  const todos = (k: string) => form.getAll(k).map((x) => String(x).trim());

  let atual: typeof schema.landingPages.$inferSelect | undefined;
  if (params.id) {
    [atual] = await db.select().from(schema.landingPages).where(eq(schema.landingPages.id, params.id)).limit(1);
    if (!atual) throw data("Landing page não encontrada", { status: 404 });
  }

  if (form.get("intencao") === "excluir" && atual) {
    await db.delete(schema.landingPages).where(eq(schema.landingPages.id, atual.id));
    waitUntil(removerArquivosSemUso(arquivosDaLP(atual), atual.id));
    throw redirect("/admin/landing-pages");
  }

  const anuncioId = atual?.anuncioId ?? t("anuncioId");
  const [carro] = anuncioId ? await db.select({ slug: schema.anuncios.slug }).from(schema.anuncios).where(eq(schema.anuncios.id, anuncioId)).limit(1) : [];
  const veiculo = carro ? await porSlug(carro.slug) : null;
  if (!veiculo) return data({ erros: { geral: "O veículo desta página não existe mais." } as Erros }, { status: 400 });
  const fotosDoCarro = new Set(veiculo.fotos.map((f) => f.url));

  const erros: Erros = {};
  const estilo = ehEstilo(t("estilo")) ? (t("estilo") as EstiloLP) : "editorial";
  const padrao = infoEstilo(estilo);
  const tema = Object.fromEntries(CAMPOS_TEMA.map(({ chave }) => {
    const v = t(`tema_${chave}`);
    return [chave, ehHex(v) ? v.toLowerCase() : padrao.tema[chave]];
  })) as TemaLP;
  const estiloBotao = ESTILOS_BOTAO.some((b) => b.valor === t("estiloBotao")) ? (t("estiloBotao") as EstiloBotao) : padrao.botao;

  const slug = slugify(t("slug") || t("headline")).slice(0, 80);
  const flutuanteNumero = apenasDigitos(t("flutuanteNumero"));
  const valores = {
    titulo: t("titulo", 100),
    slug,
    status: t("status") === "ativa" ? ("ativa" as const) : ("rascunho" as const),
    estilo,
    estiloBotao,
    tema: JSON.stringify(tema),
    nomeExibido: t("nomeExibido", 60),
    headline: t("headline", 120),
    subtitulo: t("subtitulo", 240),
    textoBotao: t("textoBotao", 40) || "Quero este carro",
    mostrarPreco: form.get("mostrarPreco") === "on",
    videoTopo: form.get("modoTopo") === "video" ? t("videoTopo", 500) : "",
    veuTopo: Math.max(20, Math.min(80, Number(t("veuTopo")) || 50)),
    secao1Titulo: t("secao1Titulo", 120),
    secao1Texto: t("secao1Texto"),
    secao2Titulo: t("secao2Titulo", 120),
    secao2Texto: t("secao2Texto"),
    destaques: JSON.stringify(form.get("modoDestaques") === "personalizado"
      ? todos("destaque_rotulo").map((rotulo, i) => ({ rotulo: rotulo.slice(0, 40), icone: iconeValido(todos("destaque_icone")[i] ?? "") ? todos("destaque_icone")[i] : "Check" })).filter((x) => x.rotulo).slice(0, LIMITES.destaques)
      : []),
    numerosTitulo: t("numerosTitulo", 80),
    numeros: JSON.stringify(todos("numero_valor").map((valor, i) => ({ valor: valor.slice(0, 24), rotulo: (todos("numero_rotulo")[i] ?? "").slice(0, 60) })).filter((x) => x.valor).slice(0, LIMITES.numeros)),
    videoUrl: t("videoUrl", 500),
    videoTitulo: t("videoTitulo", 120),
    fichaTitulo: t("fichaTitulo", 120),
    etapasTitulo: t("etapasTitulo", 120),
    etapas: JSON.stringify(todos("etapa_titulo").map((titulo, i) => ({ titulo: titulo.slice(0, 80), texto: (todos("etapa_texto")[i] ?? "").slice(0, 300) })).filter((x) => x.titulo).slice(0, LIMITES.etapas)),
    localTitulo: t("localTitulo", 120),
    localTexto: t("localTexto", 1500),
    mapaEndereco: t("mapaEndereco", 200),
    mostrarMapa: form.get("mostrarMapa") === "on",
    depoimentosTitulo: t("depoimentosTitulo", 120),
    depoimentos: JSON.stringify(todos("depo_texto").map((texto, i) => ({ texto: texto.slice(0, 400), nome: (todos("depo_nome")[i] ?? "").slice(0, 80), contexto: (todos("depo_contexto")[i] ?? "").slice(0, 80) })).filter((x) => x.texto).slice(0, LIMITES.depoimentos)),
    faq: JSON.stringify(todos("faq_pergunta").map((pergunta, i) => ({ pergunta: pergunta.slice(0, 160), resposta: (todos("faq_resposta")[i] ?? "").slice(0, 1000) })).filter((x) => x.pergunta && x.resposta).slice(0, LIMITES.faq)),
    ctaTitulo: t("ctaTitulo", 160),
    ctaSubtitulo: t("ctaSubtitulo", 240),
    mensagemWhatsapp: t("mensagemWhatsapp", 300),
    flutuanteDdi: apenasDigitos(t("flutuanteNumeroDdi")) || "55",
    flutuanteNumero,
    flutuanteMensagem: t("flutuanteMensagem", 300),
    materialRotulo: t("materialRotulo", 40),
    secoesOcultas: JSON.stringify([...new Set(todos("oculta").filter(ehSecao))]),
    ordemSecoes: JSON.stringify(t("ordem").split(",").filter(ehOrdenavel)),
    seoTitulo: t("seoTitulo", 70),
    seoDescricao: t("seoDescricao", 200),
  };

  if (valores.titulo.length < 3) erros.titulo = "Dê um nome para identificar a página no painel (3 a 100 caracteres).";
  if (valores.headline.length < 3) erros.headline = "Informe o título principal.";
  if (slug.length < 3) erros.slug = "Endereço curto demais.";
  if (valores.textoBotao.length < 2) erros.textoBotao = "Texto do botão curto demais.";
  if (valores.videoTopo && !videoDeFundo(valores.videoTopo)) erros.videoTopo = "Use um link https do YouTube, Vimeo ou um arquivo .mp4.";
  if (valores.videoUrl && !videoIncorporado(valores.videoUrl)) erros.videoUrl = "Use um link https do YouTube, Vimeo ou um arquivo .mp4.";
  if (flutuanteNumero && (flutuanteNumero.length < 8 || flutuanteNumero.length > 13)) erros.flutuanteNumero = "Confira o número com DDD.";
  if (!erros.slug) {
    const [repetido] = await db.select({ id: schema.landingPages.id }).from(schema.landingPages)
      .where(atual ? and(eq(schema.landingPages.slug, slug), ne(schema.landingPages.id, atual.id)) : eq(schema.landingPages.slug, slug)).limit(1);
    if (repetido) erros.slug = "Já existe uma landing page com este endereço.";
  }

  // Imagens: foto do carro, upload já feito por esta página ou vazio (automático).
  const escolha = (campo: string, anterior: string) => {
    const v = t(campo, 500);
    return v === "" || fotosDoCarro.has(v) || (v === anterior && v.startsWith("/imagens/lp/")) ? v : anterior;
  };
  const arquivo = (campo: string) => {
    const f = form.get(campo);
    return f instanceof File && f.size > 0 ? f : null;
  };
  const novaTopo = arquivo("imagemTopoArquivo");
  const novaFaixa = arquivo("secao2ImagemArquivo");
  const novoLogo = arquivo("logoTopo");
  const novoMaterial = arquivo("materialArquivo");
  const [vTopo, vFaixa, vLogo, vMaterial] = await Promise.all([
    novaTopo && validarImagem(novaTopo), novaFaixa && validarImagem(novaFaixa), novoLogo && validarLogo(novoLogo, { aceitaSvg: true }), novoMaterial && validarPdf(novoMaterial),
  ]);
  if (vTopo && !vTopo.ok) erros.imagemTopoArquivo = MENSAGEM_IMAGEM[vTopo.erro];
  if (vFaixa && !vFaixa.ok) erros.secao2ImagemArquivo = MENSAGEM_IMAGEM[vFaixa.erro];
  if (vLogo && !vLogo.ok) erros.logoTopo = vLogo.erro;
  if (vMaterial && !vMaterial.ok) erros.materialArquivo = vMaterial.erro;
  if (Object.keys(erros).length) return data({ erros }, { status: 400 });

  const antes = { imagemTopo: atual?.imagemTopo ?? "", secao2Imagem: atual?.secao2Imagem ?? "", logoTopo: atual?.logoTopo ?? "", materialChave: atual?.materialChave ?? "" };
  const arquivos = {
    imagemTopo: vTopo?.ok ? urlImagem(await salvarArquivoLP(vTopo.bytes, vTopo.tipo)) : escolha("imagemTopo", antes.imagemTopo),
    secao2Imagem: vFaixa?.ok ? urlImagem(await salvarArquivoLP(vFaixa.bytes, vFaixa.tipo)) : escolha("secao2Imagem", antes.secao2Imagem),
    logoTopo: vLogo?.ok ? urlImagem(await salvarArquivoLP(vLogo.bytes, vLogo.tipo)) : form.get("remover_logoTopo") ? "" : antes.logoTopo,
    materialChave: vMaterial?.ok ? await salvarArquivoLP(vMaterial.bytes, vMaterial.tipo) : form.get("removerMaterial") ? "" : antes.materialChave,
  };

  const id = atual?.id ?? crypto.randomUUID();
  try {
    if (atual) {
      await db.update(schema.landingPages).set({ ...valores, ...arquivos, atualizadoEm: Date.now() }).where(eq(schema.landingPages.id, atual.id));
    } else {
      await db.insert(schema.landingPages).values({ id, anuncioId, ...valores, ...arquivos, criadoEm: Date.now(), atualizadoEm: Date.now() });
    }
  } catch (e) {
    // Dois cadastros simultâneos com o mesmo endereço: o índice único barra o segundo.
    const novas = arquivosDaLP(arquivos).filter((c) => !arquivosDaLP(antes).includes(c));
    waitUntil(removerArquivosSemUso(novas, id));
    if (/UNIQUE/i.test(String((e as { cause?: unknown })?.cause ?? e))) return data({ erros: { slug: "Já existe uma landing page com este endereço." } as Erros }, { status: 400 });
    throw e;
  }
  const trocadas = arquivosDaLP(antes).filter((c) => !arquivosDaLP(arquivos).includes(c));
  if (trocadas.length) waitUntil(removerArquivosSemUso(trocadas, id));

  if (!atual) throw redirect(`/admin/landing-pages/${id}?criada=1`);
  return { ok: true as const, salvoEm: Date.now() };
}

/* ------------------------------------------------------------------ */
/* Peças do editor                                                     */
/* ------------------------------------------------------------------ */

const botaoIcone = "grid size-9 place-items-center rounded-lg text-texto hover:bg-fundo disabled:opacity-30 disabled:hover:bg-transparent";

function CartaoSecao({ n, titulo, ajuda, children, oculta, alternar, mover, podeSubir, podeDescer, abertaInicial = true, id }: {
  n: ReactNode; titulo: string; ajuda: string; children: ReactNode; oculta?: boolean; alternar?: () => void;
  mover?: (d: -1 | 1) => void; podeSubir?: boolean; podeDescer?: boolean; abertaInicial?: boolean; id?: string;
}) {
  const [aberta, setAberta] = useState(abertaInicial && !oculta);
  return (
    <section id={id} className={cn("scroll-mt-24 rounded-xl border bg-white", oculta ? "border-dashed border-linha-forte" : "border-linha")}>
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <button type="button" onClick={() => setAberta((a) => !a)} aria-expanded={aberta}
          className={cn("numeros grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold text-white", oculta ? "bg-fraco" : "bg-tinta")}>
          {n}<span className="sr-only">{aberta ? "Recolher" : "Expandir"} {titulo}</span>
        </button>
        <button type="button" onClick={() => setAberta((a) => !a)} className="min-w-0 flex-1 text-left">
          <h2 className="font-bold text-tinta">
            {titulo}
            {oculta && <span className="ml-2 rounded-full bg-fundo px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-suave">oculta</span>}
          </h2>
          <p className="text-sm text-suave">{ajuda}</p>
        </button>
        <div className="flex shrink-0 items-center">
          {mover && (
            <>
              <button type="button" onClick={() => mover(-1)} disabled={!podeSubir} className={cn(botaoIcone, "hidden sm:grid")} aria-label={`Mover ${titulo} para cima`}><ArrowUp className="size-4" /></button>
              <button type="button" onClick={() => mover(1)} disabled={!podeDescer} className={cn(botaoIcone, "hidden sm:grid")} aria-label={`Mover ${titulo} para baixo`}><ArrowDown className="size-4" /></button>
            </>
          )}
          {alternar && (
            <button type="button" onClick={alternar} className={cn(botaoIcone, oculta && "text-marca-700")} aria-pressed={oculta}
              aria-label={oculta ? `Mostrar ${titulo} na página` : `Ocultar ${titulo} da página`} title={oculta ? "Mostrar na página" : "Ocultar da página"}>
              {oculta ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          )}
          <button type="button" onClick={() => setAberta((a) => !a)} className={botaoIcone} aria-hidden="true" tabIndex={-1}>
            <ChevronDown className={cn("size-4 transition", aberta && "rotate-180")} />
          </button>
        </div>
      </div>
      {mover && (
        <div className="-mt-2 flex gap-2 px-4 pb-3 sm:hidden">
          <button type="button" onClick={() => mover(-1)} disabled={!podeSubir} className="botao-secundario h-9 flex-1 px-3 text-xs"><ArrowUp className="size-4" /> Subir</button>
          <button type="button" onClick={() => mover(1)} disabled={!podeDescer} className="botao-secundario h-9 flex-1 px-3 text-xs"><ArrowDown className="size-4" /> Descer</button>
        </div>
      )}
      {/* Recolhida continua no DOM: os campos vão junto no envio. */}
      <div className={cn("border-t border-linha px-4 py-5 sm:px-5", !aberta && "hidden", oculta && "opacity-60")}>{children}</div>
    </section>
  );
}

/** Escolha de foto do carro (ou "automático"), com o upload já feito como opção. */
function SeletorFoto({ nome, rotulo, fotos, valor, upload, dica }: { nome: string; rotulo: string; fotos: string[]; valor: string; upload?: string; dica?: string }) {
  const [sel, setSel] = useState(valor);
  const opcoes = upload ? [upload, ...fotos] : fotos;
  const item = "h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2";
  return (
    <fieldset>
      <legend className="rotulo">{rotulo}</legend>
      <input type="hidden" name={nome} value={sel} />
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button type="button" onClick={() => setSel("")} aria-pressed={sel === ""} className={cn(item, "grid place-items-center bg-fundo text-xs font-medium text-texto", sel === "" ? "border-marca-600" : "border-linha")}>Automático</button>
        {opcoes.map((src, i) => (
          <button key={src} type="button" onClick={() => setSel(src)} aria-pressed={sel === src} aria-label={src === upload ? "Imagem enviada" : `Foto ${i + (upload ? 0 : 1)}`}
            className={cn(item, "relative", sel === src ? "border-marca-600" : "border-transparent opacity-80 hover:opacity-100")}>
            <img src={src} alt="" className="size-full object-cover" />
            {src === upload && <span className="absolute inset-x-0 bottom-0 bg-tinta/75 text-[10px] text-white">Enviada</span>}
          </button>
        ))}
      </div>
      {dica && <p className="text-xs text-suave">{dica}</p>}
    </fieldset>
  );
}

function IconePrevia({ nome }: { nome: string }) {
  const Icone = componenteIcone(nome);
  return <Icone className="size-5" strokeWidth={1.5} aria-hidden="true" />;
}

/** Lista editável com ids estáveis (remover do meio não embaralha os campos). */
function useLista<T>(inicial: T[]) {
  const proximo = useRef(0);
  const comId = (x: T) => ({ id: proximo.current++, ...x });
  const [itens, setItens] = useState(() => inicial.map(comId));
  return {
    itens,
    trocar: (lista: T[]) => setItens(lista.map(comId)),
    adicionar: (x: T) => setItens((a) => [...a, comId(x)]),
    remover: (id: number) => setItens((a) => a.filter((i) => i.id !== id)),
    mudar: (id: number, parte: Partial<T>) => setItens((a) => a.map((i) => (i.id === id ? { ...i, ...parte } : i))),
  };
}

const RemoverItem = ({ aoClicar, rotulo }: { aoClicar: () => void; rotulo: string }) => (
  <button type="button" onClick={aoClicar} className="grid size-11 shrink-0 place-items-center rounded-lg text-erro hover:bg-erro-fundo" aria-label={rotulo}><Trash2 className="size-4" /></button>
);

/* ------------------------------------------------------------------ */
/* Etapa 1                                                             */
/* ------------------------------------------------------------------ */

function Etapa1({ veiculos, veiculoInicial }: { veiculos: { id: string; codigo: number; marca: string; modelo: string; versao: string; anoModelo: number; status: string }[]; veiculoInicial: string }) {
  const opcao = "flex cursor-pointer gap-3 rounded-xl border border-linha p-4 has-[:checked]:border-marca-600 has-[:checked]:ring-2 has-[:checked]:ring-marca-600/15";
  return (
    <div className="max-w-5xl pb-10">
      <Cabecalho titulo="Nova landing page" descricao="Escolha o carro, como começar e o estilo. Depois você ajusta cada seção." />
      <Form method="get" className="grid gap-4">
        <input type="hidden" name="continuar" value="1" />
        <CartaoSecao n={1} titulo="Qual carro?" ajuda="A página usa as fotos, o preço, a ficha técnica e o vendedor deste carro.">
          <CampoSelecao id="veiculo" rotulo="Veículo" defaultValue={veiculoInicial || veiculos.find((v) => v.status === "ativo")?.id || ""} required>
            {veiculos.map((v) => <option key={v.id} value={v.id}>{codigoVeiculo(v.codigo)} · {v.marca} {v.modelo} {v.versao} {v.anoModelo}{v.status !== "ativo" ? ` (${v.status})` : ""}</option>)}
          </CampoSelecao>
          {veiculos.length === 0 && <p className="mt-2 text-sm text-erro">Cadastre um veículo primeiro.</p>}
        </CartaoSecao>
        <CartaoSecao n={2} titulo="Como começar?" ajuda="Você pode trocar qualquer texto depois.">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={opcao}>
              <input type="radio" name="modo" value="veiculo" defaultChecked className="mt-1 size-4 accent-marca-600" />
              <span className="text-sm">
                <span className="flex items-center gap-1.5 font-semibold text-tinta"><Sparkles className="size-4 text-marca-700" aria-hidden="true" /> Usar os dados do carro</span>
                <span className="text-suave">Título, descrição, opcionais e endereço da loja já preenchidos. Recomendado.</span>
              </span>
            </label>
            <label className={opcao}>
              <input type="radio" name="modo" value="modelo" className="mt-1 size-4 accent-marca-600" />
              <span className="text-sm">
                <span className="block font-semibold text-tinta">Começar com o modelo de campanha</span>
                <span className="text-suave">Textos de campanha, números e depoimentos de exemplo para você adaptar. Fotos e ficha vêm do carro.</span>
              </span>
            </label>
          </div>
        </CartaoSecao>
        <CartaoSecao n={3} titulo="Qual estilo?" ajuda="Define o visual da página. Dá para trocar depois, no painel lateral.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {INFO_ESTILOS.map((e, i) => (
              <label key={e.valor} className={cn(opcao, "flex-col")}>
                <input type="radio" name="estilo" value={e.valor} defaultChecked={i === 0} className="sr-only" />
                <MiniaturaEstilo estilo={e.valor} tema={e.tema} />
                <span className="text-sm">
                  <span className="block font-semibold text-tinta">{e.rotulo}</span>
                  <span className="text-suave">{e.descricao}</span>
                </span>
              </label>
            ))}
          </div>
        </CartaoSecao>
        <div className="flex items-center justify-between gap-3">
          <Link to="/admin/landing-pages" className="botao-fantasma">Cancelar</Link>
          <button type="submit" className="botao-primario" disabled={veiculos.length === 0}>Continuar <ArrowRight className="size-4" aria-hidden="true" /></button>
        </div>
      </Form>
    </div>
  );
}

/** Desenho simplificado de cada estilo, nas cores da paleta dele. */
function MiniaturaEstilo({ estilo, tema }: { estilo: EstiloLP; tema: TemaLP }) {
  const foto = "bg-gradient-to-br from-slate-500 to-slate-800";
  const barra = (w: string, cor: string, h = "h-2") => <div className={cn(h, w, "rounded-sm")} style={{ background: cor }} />;
  return (
    <div aria-hidden="true" className="aspect-[4/3] w-full overflow-hidden rounded-lg border border-linha p-1.5" style={{ background: tema.fundo }}>
      {estilo === "editorial" && (
        <div className="flex h-full flex-col gap-1">
          <div className={cn("relative h-2/5 rounded-sm p-1", foto)}>{barra("w-2/3", "#fff")}</div>
          <div className="h-1/5 rounded-sm" style={{ background: tema.fundoBloco }} />
          <div className="grid grid-cols-4 gap-1">{[0, 1, 2, 3].map((i) => <div key={i} className="h-2 rounded-sm" style={{ background: tema.titulo, opacity: 0.3 }} />)}</div>
          <div className="mt-auto">{barra("w-1/3", tema.botao)}</div>
        </div>
      )}
      {estilo === "vibrante" && (
        <div className="flex h-full flex-col gap-1">
          <div className={cn("h-2/5 rounded-b-[40%]", foto)} />
          <div className="mx-auto">{barra("w-12", tema.titulo)}</div>
          <div className="h-1/4 rounded-t-[30%]" style={{ background: tema.fundoBloco }} />
          <div className="mx-auto mt-auto">{barra("w-10", tema.botao, "h-2.5 rounded-full")}</div>
        </div>
      )}
      {estilo === "clean" && (
        <div className="flex h-full flex-col gap-1">
          {barra("w-2/3", tema.titulo)}
          <div className="grid flex-1 grid-cols-4 grid-rows-2 gap-0.5">
            <div className={cn("col-span-2 row-span-2 rounded-sm", foto)} />
            {[0, 1, 2, 3].map((i) => <div key={i} className="rounded-sm bg-slate-300" />)}
          </div>
          <div className="grid grid-cols-[1fr_35%] gap-1"><div className="space-y-1">{barra("w-full", "#e5e7eb")}{barra("w-3/4", "#e5e7eb")}</div><div className="h-5 rounded border border-slate-200">{barra("mx-auto mt-1.5 w-3/4", tema.botao, "h-1.5")}</div></div>
        </div>
      )}
      {estilo === "luxo" && (
        <div className="relative flex h-full flex-col gap-1">
          <div className={cn("h-1/2 rounded-sm p-1", foto)}>{barra("w-1/2", "#fff")}<div className="mt-1">{barra("w-1/3", tema.destaque, "h-1.5")}</div></div>
          <div className="absolute right-1.5 top-3 h-1/3 w-2/5 rounded-sm bg-white shadow" style={{ borderTop: `2px solid ${tema.destaque}` }} />
          <div className="mt-auto grid grid-cols-3 gap-1">{[0, 1, 2].map((i) => <div key={i} className="h-4 rounded-sm bg-slate-300" />)}</div>
        </div>
      )}
      {estilo === "noturno" && (
        <div className="flex h-full flex-col gap-1">
          <div className="grid h-3/5 grid-cols-[1fr_40%] gap-1 rounded-sm bg-stone-700 p-1">
            <div className="space-y-1 pt-1">{barra("w-4/5", tema.titulo)}{barra("w-1/2", tema.texto, "h-1.5")}</div>
            <div className="rounded-sm bg-black/50 ring-1 ring-white/20" />
          </div>
          <div className="h-1 rounded-full" style={{ background: tema.texto, opacity: 0.4 }} />
          <div className="mt-auto grid grid-cols-3 gap-1">{[0, 1, 2].map((i) => <div key={i} className="h-4 rounded-sm" style={{ background: tema.fundoBloco }} />)}</div>
        </div>
      )}
      {estilo === "tech" && (
        <div className="flex h-full flex-col gap-1">
          <div className="h-1/3 rounded-sm bg-[repeating-linear-gradient(45deg,#2a2a30_0_2px,transparent_2px_6px)]" />
          {barra("w-1/3", tema.destaque, "h-1.5")}
          {barra("w-3/4", tema.titulo)}
          <div className="mt-auto grid grid-cols-4 gap-px bg-zinc-700">{[0, 1, 2, 3].map((i) => <div key={i} className="h-3" style={{ background: tema.fundo }} />)}</div>
        </div>
      )}
      {estilo === "moderno" && (
        <div className="h-full rounded-md p-1" style={{ background: tema.fundoBloco }}>
          <div className="grid h-full grid-cols-2 gap-1 rounded p-1" style={{ background: tema.fundo }}>
            <div className="space-y-1 pt-1">{barra("w-4/5", tema.titulo)}{barra("w-1/2", tema.destaque)}<div className="pt-1">{barra("w-2/3", tema.botao, "h-2.5")}</div></div>
            <div className="rounded bg-white shadow"><div className={cn("h-1/2 rounded-t", foto)} /></div>
          </div>
        </div>
      )}
      {estilo === "boutique" && (
        <div className="flex h-full flex-col gap-1">
          <div className={cn("relative h-2/5 rounded-sm", foto)}><div className="absolute bottom-1 left-1 h-1.5 w-1/3 rounded-full bg-white" /></div>
          <div className="grid grid-cols-3 gap-1">{[0, 1, 2].map((i) => <div key={i} className="h-6 rounded-md border border-gray-200 bg-white" />)}</div>
          <div className="mt-auto">{barra("w-1/3", tema.botao, "h-2 rounded-full")}</div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Etapa 2 / edição                                                    */
/* ------------------------------------------------------------------ */

type DadosEditor = Extract<Route.ComponentProps["loaderData"], { etapa: 2 }>;
type Estrutura = { chave: SecaoOrdenavel; oculta: boolean };

export default function LandingPageForm({ loaderData, actionData }: Route.ComponentProps) {
  if (loaderData.etapa === 1) return <Etapa1 veiculos={loaderData.veiculos} veiculoInicial={loaderData.veiculoInicial} />;
  return <Editor dados={loaderData} actionData={actionData} />;
}

function Editor({ dados, actionData }: { dados: DadosEditor; actionData: Route.ComponentProps["actionData"] }) {
  const { lp, veiculo: v, modo, doVeiculo, modelo, origem } = dados;
  const erros: Erros = actionData && "erros" in actionData ? actionData.erros : {};
  const navegacao = useNavigation();
  const salvando = navegacao.state === "submitting" && navegacao.formMethod?.toUpperCase() === "POST";
  const [params] = useSearchParams();
  const nomeCarro = `${v.marca} ${v.modelo} ${v.versao} ${v.anoModelo}`;
  const fotos = v.fotos.map((f) => f.url);

  // Textos: remontados com outra semente ao "Preencher textos".
  const [semente, setSemente] = useState<SementeLP>(dados.inicial);
  const [versao, setVersao] = useState(0);
  const faq = useLista<Pergunta>(dados.inicial.faq);
  const destaques = useLista<Destaque>(dados.inicial.destaques.length ? dados.inicial.destaques : destaquesDosOpcionais(v.opcionais));
  const [modoDestaques, setModoDestaques] = useState<"auto" | "personalizado">(dados.inicial.destaques.length ? "personalizado" : "auto");
  const numeros = useLista<Numero>(dados.inicial.numeros);
  const etapas = useLista<Etapa>(dados.inicial.etapas);
  const depoimentos = useLista<Depoimento>(dados.inicial.depoimentos);

  const [estilo, setEstilo] = useState<EstiloLP>(dados.estilo);
  const [tema, setTema] = useState<TemaLP>(dados.tema);
  const [estiloBotao, setEstiloBotao] = useState<EstiloBotao>(dados.estiloBotao);
  const [avisoPaleta, setAvisoPaleta] = useState("");

  const ocultasIniciais = new Set<SecaoLP>(dados.ocultas);
  const [estrutura, setEstrutura] = useState<Estrutura[]>(dados.ordem.map((chave) => ({ chave, oculta: ocultasIniciais.has(chave) })));
  const [menuOculto, setMenuOculto] = useState(ocultasIniciais.has("menu"));
  const [flutuanteOculto, setFlutuanteOculto] = useState(ocultasIniciais.has("whatsapp"));
  const [modoTopo, setModoTopo] = useState<"foto" | "video">(lp?.videoTopo ? "video" : "foto");
  const [veu, setVeu] = useState(lp?.veuTopo ?? 50);

  // Alterações não salvas: aviso na barra e ao fechar a aba.
  const [sujo, setSujo] = useState(false);
  const [salvoAs, setSalvoAs] = useState("");
  const marcar = () => setSujo(true);
  useEffect(() => {
    if (actionData && "ok" in actionData) {
      setSujo(false);
      setSalvoAs(new Date(actionData.salvoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    }
  }, [actionData]);
  useEffect(() => {
    if (!sujo) return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [sujo]);

  const mover = (chave: SecaoOrdenavel, d: -1 | 1) => {
    setEstrutura((a) => {
      const i = a.findIndex((x) => x.chave === chave);
      const j = i + d;
      if (i < 0 || j < 0 || j >= a.length) return a;
      const nova = [...a];
      [nova[i], nova[j]] = [nova[j], nova[i]];
      return nova;
    });
    marcar();
  };
  const alternar = (chave: SecaoOrdenavel) => { setEstrutura((a) => a.map((x) => (x.chave === chave ? { ...x, oculta: !x.oculta } : x))); marcar(); };

  const aplicarSemente = (s: SementeLP, rotulo: string) => {
    if (!confirm(`Substituir os textos, diferenciais, números, etapas, depoimentos e dúvidas pelos ${rotulo}? Nada é salvo até você clicar em Salvar.`)) return;
    setSemente(s);
    setVersao((x) => x + 1);
    faq.trocar(s.faq);
    numeros.trocar(s.numeros);
    etapas.trocar(s.etapas);
    depoimentos.trocar(s.depoimentos);
    if (s.destaques.length) { destaques.trocar(s.destaques); setModoDestaques("personalizado"); } else setModoDestaques("auto");
    marcar();
  };
  const trocarEstilo = (novo: EstiloLP) => {
    const info = infoEstilo(novo);
    setEstilo(novo);
    setTema(info.tema);
    setEstiloBotao(info.botao);
    setAvisoPaleta(`Cores e botões ajustados para a paleta do estilo ${info.rotulo}. Personalize abaixo se quiser.`);
    marcar();
  };

  // Campo de texto que acompanha a semente (key muda ao preencher textos).
  const texto = (campo: keyof SementeLP & string, rotulo: string, extra: { dica?: string; placeholder?: string; area?: boolean; maxLength?: number; className?: string } = {}) => {
    const chave = `${campo}-${versao}`;
    const props = { id: campo, rotulo, erro: erros[campo], dica: extra.dica, placeholder: extra.placeholder, maxLength: extra.maxLength, className: extra.className, defaultValue: String(semente[campo] ?? "") };
    return extra.area ? <CampoArea key={chave} {...props} rows={4} /> : <CampoTexto key={chave} {...props} />;
  };
  const adicionar = "botao-secundario h-10 px-3 text-sm";

  const uploadTopo = lp?.imagemTopo.startsWith("/imagens/lp/") ? lp.imagemTopo : undefined;
  const uploadFaixa = lp?.secao2Imagem.startsWith("/imagens/lp/") ? lp.secao2Imagem : undefined;

  const corpos: Record<SecaoOrdenavel, { titulo: string; ajuda: string; corpo: ReactNode }> = {
    conceito: {
      titulo: "Apresentação",
      ajuda: "Logo abaixo do topo: uma frase de impacto e um parágrafo sobre o carro.",
      corpo: <div className="grid gap-4">{texto("secao1Titulo", "Frase de impacto", { maxLength: 120 })}{texto("secao1Texto", "Parágrafo", { area: true, dica: "Vazio = descrição do cadastro do carro." })}</div>,
    },
    destaques: {
      titulo: "Diferenciais",
      ajuda: "Grade de ícones. Ano, km, câmbio e preço aparecem sempre, vindos do cadastro.",
      corpo: (
        <div className="grid gap-4">
          <input type="hidden" name="modoDestaques" value={modoDestaques} />
          <div className="grid gap-2 sm:grid-cols-2">
            {([["auto", "Automático", `Mostra os opcionais do carro (${v.opcionais.length}). Se você editar o carro, a página acompanha.`], ["personalizado", "Personalizar", "Escolha os itens, textos e ícones desta página."]] as const).map(([valor, titulo, desc]) => (
              <button key={valor} type="button" onClick={() => { setModoDestaques(valor); marcar(); }} aria-pressed={modoDestaques === valor}
                className={cn("rounded-xl border p-3 text-left text-sm", modoDestaques === valor ? "border-marca-600 ring-2 ring-marca-600/15" : "border-linha")}>
                <span className="block font-semibold text-tinta">{titulo}</span><span className="text-suave">{desc}</span>
              </button>
            ))}
          </div>
          {modoDestaques === "auto" ? (
            v.opcionais.length ? (
              <ul className="flex flex-wrap gap-2">
                {destaquesDosOpcionais(v.opcionais).map((h) => <li key={h.rotulo} className="inline-flex items-center gap-2 rounded-full border border-linha px-3 py-1.5 text-xs text-texto"><IconePrevia nome={h.icone} /> {h.rotulo}</li>)}
              </ul>
            ) : <p className="text-sm text-suave">Este carro não tem opcionais cadastrados: a seção não aparece. Personalize ou cadastre os opcionais.</p>
          ) : (
            <div className="grid gap-2">
              {destaques.itens.map((h) => (
                <div key={h.id} className="flex flex-wrap items-center gap-2 border-b border-linha pb-2 sm:flex-nowrap sm:border-0 sm:pb-0">
                  <span className="hidden size-11 shrink-0 place-items-center rounded-lg bg-fundo text-tinta sm:grid"><IconePrevia nome={h.icone} /></span>
                  <select name="destaque_icone" value={h.icone} onChange={(e) => destaques.mudar(h.id, { icone: e.target.value })} aria-label="Ícone" className="campo w-full text-sm sm:w-48 sm:shrink-0">
                    {OPCOES_ICONE.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
                  </select>
                  <input name="destaque_rotulo" value={h.rotulo} onChange={(e) => destaques.mudar(h.id, { rotulo: e.target.value })} aria-label="Texto" placeholder="Ex.: IPVA 2026 pago" maxLength={40} className="campo min-w-0 flex-1" />
                  <RemoverItem aoClicar={() => { destaques.remover(h.id); marcar(); }} rotulo={`Remover ${h.rotulo || "item"}`} />
                </div>
              ))}
              <div className="flex flex-wrap gap-2 pt-1">
                {destaques.itens.length < LIMITES.destaques && <button type="button" className={adicionar} onClick={() => { destaques.adicionar({ rotulo: "", icone: "Check" }); marcar(); }}><Plus className="size-4" /> Adicionar item</button>}
                {v.opcionais.length > 0 && <button type="button" className="botao-fantasma h-10 px-3 text-sm" onClick={() => { destaques.trocar([...destaques.itens, ...destaquesDosOpcionais(v.opcionais).filter((o) => !destaques.itens.some((x) => x.rotulo === o.rotulo))].slice(0, LIMITES.destaques)); marcar(); }}><Wand2 className="size-4" /> Importar opcionais do carro</button>}
              </div>
            </div>
          )}
        </div>
      ),
    },
    numeros: {
      titulo: "Números",
      ajuda: "Valores em destaque da loja (ex.: “2.500+ carros vendidos”). Sem itens, a seção não aparece.",
      corpo: (
        <div className="grid gap-3">
          {texto("numerosTitulo", "Título (opcional)", { placeholder: "Em números", maxLength: 80 })}
          {numeros.itens.map((n) => (
            <div key={n.id} className="flex items-center gap-2">
              <input name="numero_valor" value={n.valor} onChange={(e) => numeros.mudar(n.id, { valor: e.target.value })} aria-label="Valor" placeholder="10 anos" maxLength={24} className="campo w-28 shrink-0 sm:w-40" />
              <input name="numero_rotulo" value={n.rotulo} onChange={(e) => numeros.mudar(n.id, { rotulo: e.target.value })} aria-label="Rótulo" placeholder="de mercado" maxLength={60} className="campo min-w-0 flex-1" />
              <RemoverItem aoClicar={() => { numeros.remover(n.id); marcar(); }} rotulo="Remover número" />
            </div>
          ))}
          {numeros.itens.length < LIMITES.numeros && <button type="button" className={cn(adicionar, "w-fit")} onClick={() => { numeros.adicionar({ valor: "", rotulo: "" }); marcar(); }}><Plus className="size-4" /> Adicionar número</button>}
        </div>
      ),
    },
    galeria: {
      titulo: "Galeria de fotos",
      ajuda: "Fotos do carro em grade (ou carrossel, no estilo Vibrante).",
      corpo: <p className="text-sm text-suave">{fotos.length} foto{fotos.length === 1 ? "" : "s"} no cadastro do carro. <Link to={`/admin/veiculos/${v.id}`} target="_blank" className="font-semibold text-marca-700 underline">Gerenciar fotos</Link></p>,
    },
    faixa: {
      titulo: "Faixa de imagem",
      ajuda: "Uma foto grande com uma segunda frase de destaque.",
      corpo: (
        <div className="grid gap-4">
          <SeletorFoto nome="secao2Imagem" rotulo="Foto da faixa" fotos={fotos} valor={lp?.secao2Imagem ?? ""} upload={uploadFaixa} dica="Automático usa a 2ª foto do carro." />
          <ArquivoImagem campo="secao2ImagemArquivo" rotulo="Ou envie uma imagem própria" url={null} aceita="image/jpeg,image/png,image/webp" largo reduzirPara={2000} aoMudar={marcar} erro={erros.secao2ImagemArquivo} dica="Substitui a foto escolhida acima. JPG, PNG ou WebP." />
          {texto("secao2Titulo", "Frase de impacto", { maxLength: 120 })}
          {texto("secao2Texto", "Parágrafo", { area: true })}
        </div>
      ),
    },
    video: {
      titulo: "Vídeo",
      ajuda: "Player do YouTube, Vimeo ou arquivo .mp4. Sem link, a seção não aparece.",
      corpo: (
        <div className="grid gap-4 sm:grid-cols-[1fr_240px]">
          <CampoTexto id="videoUrl" rotulo="Link do vídeo" defaultValue={lp?.videoUrl ?? ""} placeholder="https://www.youtube.com/watch?v=…" erro={erros.videoUrl} inputMode="url" />
          {texto("videoTitulo", "Título da seção", { maxLength: 120 })}
        </div>
      ),
    },
    ficha: {
      titulo: "Ficha técnica",
      ajuda: "Marca, modelo, ano, km, câmbio, cor e opcionais, sempre atualizados com o cadastro.",
      corpo: (
        <div className="grid gap-3">
          {texto("fichaTitulo", "Título", { placeholder: "Ficha técnica", maxLength: 120 })}
          <p className="numeros text-sm text-suave">{anos(v.anoFabricacao, v.anoModelo)} · {km(v.km)} · {v.cambio} · {v.combustivel} · {v.cor} · {v.opcionais.length} opcionais</p>
        </div>
      ),
    },
    etapas: {
      titulo: "Como comprar",
      ajuda: "Passo a passo da compra (conversa, test drive, proposta…). Sem itens, a seção não aparece.",
      corpo: (
        <div className="grid gap-3">
          {texto("etapasTitulo", "Título", { placeholder: "Como comprar", maxLength: 120 })}
          {etapas.itens.map((e, i) => (
            <div key={e.id} className="grid gap-2 rounded-xl border border-linha p-3 sm:grid-cols-[1fr_2fr_auto]">
              <input name="etapa_titulo" value={e.titulo} onChange={(x) => etapas.mudar(e.id, { titulo: x.target.value })} aria-label={`Etapa ${i + 1}: título`} placeholder={`Etapa ${i + 1}`} maxLength={80} className="campo" />
              <input name="etapa_texto" value={e.texto} onChange={(x) => etapas.mudar(e.id, { texto: x.target.value })} aria-label={`Etapa ${i + 1}: descrição`} placeholder="Descrição curta" maxLength={300} className="campo" />
              <RemoverItem aoClicar={() => { etapas.remover(e.id); marcar(); }} rotulo={`Remover etapa ${i + 1}`} />
            </div>
          ))}
          {etapas.itens.length < LIMITES.etapas && <button type="button" className={cn(adicionar, "w-fit")} onClick={() => { etapas.adicionar({ titulo: "", texto: "" }); marcar(); }}><Plus className="size-4" /> Adicionar etapa</button>}
        </div>
      ),
    },
    localizacao: {
      titulo: "Localização da loja",
      ajuda: "Texto sobre a visita e mapa do Google (sem chave de API).",
      corpo: (
        <div className="grid gap-4">
          {texto("localTitulo", "Frase de impacto", { maxLength: 120 })}
          {texto("localTexto", "Parágrafo", { area: true, dica: "No estilo Noturno e Boutique, cada linha vira um item." })}
          {texto("mapaEndereco", "Endereço para o mapa", { dica: "Endereço completo ou coordenadas. Vazio = endereço da loja em Configurações.", maxLength: 200 })}
          <label className="flex w-fit cursor-pointer items-center gap-3 py-1 text-sm font-medium text-tinta">
            <input type="checkbox" name="mostrarMapa" defaultChecked={lp ? lp.mostrarMapa : true} className="size-4 accent-marca-600" /> Exibir o mapa
          </label>
        </div>
      ),
    },
    cards: {
      titulo: "Cards de navegação",
      ajuda: "Três cards com foto (Fotos, Ficha técnica, Localização) que levam às seções.",
      corpo: <p className="text-sm text-suave">Usam as fotos do carro. Não há o que configurar aqui.</p>,
    },
    depoimentos: {
      titulo: "Depoimentos",
      ajuda: "Avaliações de clientes com nome e contexto. Sem itens, a seção não aparece.",
      corpo: (
        <div className="grid gap-3">
          {texto("depoimentosTitulo", "Título", { placeholder: "Quem já comprou com a gente", maxLength: 120 })}
          {depoimentos.itens.map((d, i) => (
            <div key={d.id} className="grid gap-2 rounded-xl border border-linha p-3">
              <textarea name="depo_texto" value={d.texto} onChange={(x) => depoimentos.mudar(d.id, { texto: x.target.value })} aria-label={`Depoimento ${i + 1}`} placeholder="O que o cliente disse" rows={3} maxLength={400} className="campo" />
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <input name="depo_nome" value={d.nome} onChange={(x) => depoimentos.mudar(d.id, { nome: x.target.value })} aria-label="Nome" placeholder="Nome" maxLength={80} className="campo" />
                <input name="depo_contexto" value={d.contexto} onChange={(x) => depoimentos.mudar(d.id, { contexto: x.target.value })} aria-label="Contexto" placeholder="Ex.: Comprou um SUV em 2025" maxLength={80} className="campo" />
                <RemoverItem aoClicar={() => { depoimentos.remover(d.id); marcar(); }} rotulo={`Remover depoimento ${i + 1}`} />
              </div>
            </div>
          ))}
          {depoimentos.itens.length < LIMITES.depoimentos && <button type="button" className={cn(adicionar, "w-fit")} onClick={() => { depoimentos.adicionar({ nome: "", texto: "", contexto: "" }); marcar(); }}><Plus className="size-4" /> Adicionar depoimento</button>}
        </div>
      ),
    },
    faq: {
      titulo: "Dúvidas frequentes",
      ajuda: "Perguntas e respostas curtas. Sem itens, a seção não aparece.",
      corpo: (
        <div className="grid gap-3">
          {faq.itens.map((f, i) => (
            <div key={f.id} className="grid gap-2 rounded-xl border border-linha p-3">
              <div className="flex gap-2">
                <input name="faq_pergunta" value={f.pergunta} onChange={(x) => faq.mudar(f.id, { pergunta: x.target.value })} aria-label={`Pergunta ${i + 1}`} placeholder="Pergunta" maxLength={160} className="campo min-w-0 flex-1" />
                <RemoverItem aoClicar={() => { faq.remover(f.id); marcar(); }} rotulo={`Remover pergunta ${i + 1}`} />
              </div>
              <textarea name="faq_resposta" value={f.resposta} onChange={(x) => faq.mudar(f.id, { resposta: x.target.value })} aria-label={`Resposta ${i + 1}`} placeholder="Resposta" rows={3} maxLength={1000} className="campo" />
            </div>
          ))}
          {faq.itens.length < LIMITES.faq && <button type="button" className={cn(adicionar, "w-fit")} onClick={() => { faq.adicionar({ pergunta: "", resposta: "" }); marcar(); }}><Plus className="size-4" /> Adicionar pergunta</button>}
        </div>
      ),
    },
    contato: {
      titulo: "Formulário final",
      ajuda: "Última chamada com o formulário. Se ocultar, os botões principais levam ao WhatsApp.",
      corpo: (
        <div className="grid gap-4">
          {texto("ctaTitulo", "Título", { maxLength: 160 })}
          {texto("ctaSubtitulo", "Frase de apoio", { maxLength: 240 })}
          {texto("mensagemWhatsapp", "Mensagem inicial do WhatsApp", { dica: "Usada nos botões de WhatsApp desta página.", maxLength: 300 })}
        </div>
      ),
    },
  };

  const [copiado, setCopiado] = useState(false);
  const urlPagina = lp ? `${origem}/lp/${lp.slug}` : "";
  const tituloPadrao = `${v.marca} ${v.modelo} ${v.anoModelo} — campanha`;

  return (
    <>
      <Cabecalho titulo={lp ? "Editar landing page" : "Nova landing page"}
        descricao={`${codigoVeiculo(v.codigo)} · ${nomeCarro}${lp ? "" : ` · ${modo === "modelo" ? "modelo de campanha" : "com os dados do carro"}`}`}>
        {!lp && <Link to={`/admin/landing-pages/nova?veiculo=${v.id}`} className="botao-fantasma h-10 px-4 text-sm">Voltar à etapa 1</Link>}
      </Cabecalho>
      {params.get("criada") && !sujo && !salvoAs && <Aviso tipo="sucesso">Landing page criada como rascunho. Revise as seções (setas reordenam, o olho oculta) e mude o status para Ativa quando estiver pronta.</Aviso>}
      {Object.keys(erros).length > 0 && <Aviso tipo="erro">{erros.geral ?? "Revise os campos destacados."}</Aviso>}

      <Form method="post" encType="multipart/form-data" noValidate onChange={marcar} className="grid grid-cols-1 gap-6 pb-28 xl:grid-cols-[minmax(0,1fr)_340px]">
        {!lp && <input type="hidden" name="anuncioId" value={v.id} />}
        <input type="hidden" name="ordem" value={estrutura.map((s) => s.chave).join(",")} />
        {estrutura.filter((s) => s.oculta).map((s) => <input key={s.chave} type="hidden" name="oculta" value={s.chave} />)}
        {menuOculto && <input type="hidden" name="oculta" value="menu" />}
        {flutuanteOculto && <input type="hidden" name="oculta" value="whatsapp" />}

        <div className="grid min-w-0 content-start gap-3">
          <CartaoSecao n="☰" titulo="Menu superior" ajuda="Barra fixa com o logo, links das seções e botões. Oculto, o logo aparece sobre a foto do topo."
            oculta={menuOculto} alternar={() => { setMenuOculto((x) => !x); marcar(); }} abertaInicial={false}>
            <p className="text-sm text-suave">As cores do menu ficam no painel lateral, em “Menu superior”. Com o menu oculto, envie a versão branca do logo em “Topo da página”.</p>
          </CartaoSecao>

          <CartaoSecao n={<MessageCircle className="size-4" aria-hidden="true" />} titulo="WhatsApp flutuante" ajuda="Botão verde fixo no canto. Por padrão, usa o WhatsApp do vendedor do carro (ou da loja)."
            oculta={flutuanteOculto} alternar={() => { setFlutuanteOculto((x) => !x); marcar(); }} abertaInicial={false}>
            <div className="grid gap-4 sm:grid-cols-2">
              <CampoTelefone id="flutuanteNumero" rotulo="Número (opcional)" ddi={lp?.flutuanteDdi ?? "55"} numero={lp?.flutuanteNumero ?? ""} erro={erros.flutuanteNumero} dica="Vazio = vendedor do carro ou loja." />
              <CampoTexto id="flutuanteMensagem" rotulo="Mensagem (opcional)" defaultValue={lp?.flutuanteMensagem ?? ""} maxLength={300} dica="Vazio = mesma mensagem dos outros botões." />
            </div>
          </CartaoSecao>

          <CartaoSecao n={1} titulo="Topo da página" ajuda="A primeira coisa que o visitante vê. O fundo recebe um véu escuro para o texto ficar legível.">
            <div className="grid gap-4">
              {texto("headline", "Título principal", { maxLength: 120 })}
              {texto("subtitulo", "Frase de apoio", { maxLength: 240 })}
              <div className="grid gap-4 sm:grid-cols-2">
                <CampoTexto id="textoBotao" rotulo="Texto do botão principal" defaultValue={lp?.textoBotao ?? "Quero este carro"} maxLength={40} erro={erros.textoBotao} />
                {texto("nomeExibido", "Nome da campanha (opcional)", { dica: "Aparece acima do título. Ex.: Feirão de Setembro.", maxLength: 60 })}
              </div>
              <fieldset>
                <legend className="rotulo">Fundo do topo</legend>
                <input type="hidden" name="modoTopo" value={modoTopo} />
                <div className="grid grid-cols-2 gap-2 sm:max-w-md">
                  {([["foto", "Foto"], ["video", "Vídeo"]] as const).map(([valor, rotulo]) => (
                    <button key={valor} type="button" onClick={() => { setModoTopo(valor); marcar(); }} aria-pressed={modoTopo === valor}
                      className={cn("h-11 rounded-lg border text-sm font-semibold", modoTopo === valor ? "border-marca-600 text-marca-700 ring-2 ring-marca-600/15" : "border-linha text-texto")}>{rotulo}</button>
                  ))}
                </div>
              </fieldset>
              {modoTopo === "video" && <CampoTexto id="videoTopo" rotulo="Link do vídeo de fundo" defaultValue={lp?.videoTopo ?? ""} placeholder="https://www.youtube.com/watch?v=…" erro={erros.videoTopo} dica="YouTube, Vimeo ou .mp4. Toca sem som, em loop; a foto abaixo aparece enquanto carrega." inputMode="url" />}
              <SeletorFoto nome="imagemTopo" rotulo={modoTopo === "video" ? "Capa (enquanto o vídeo carrega)" : "Foto de fundo"} fotos={fotos} valor={lp?.imagemTopo ?? ""} upload={uploadTopo} dica="Automático usa a capa do carro." />
              <ArquivoImagem campo="imagemTopoArquivo" rotulo="Ou envie uma imagem própria" url={null} aceita="image/jpeg,image/png,image/webp" largo reduzirPara={2400} aoMudar={marcar} erro={erros.imagemTopoArquivo} dica="Substitui a foto escolhida acima. Ideal: 1920×1080." />
              <div>
                <label htmlFor="veuTopo" className="rotulo">Intensidade do véu escuro: <span className="numeros">{veu}%</span></label>
                <input id="veuTopo" name="veuTopo" type="range" min={20} max={80} step={5} value={veu} onChange={(e) => setVeu(Number(e.target.value))} className="w-full accent-marca-600" />
                <p className="text-xs text-suave">Quanto maior, mais escuro o fundo e mais legível o texto.</p>
              </div>
              <label className="flex w-fit cursor-pointer items-center gap-3 py-1 text-sm font-medium text-tinta">
                <input type="checkbox" name="mostrarPreco" defaultChecked={lp?.mostrarPreco ?? true} className="size-4 accent-marca-600" /> Mostrar o preço ({moeda(v.preco)}) na página
              </label>
              <ArquivoImagem campo="logoTopo" rotulo="Logo sobre o topo (versão branca)" url={lp?.logoTopo || null} escuro aceita="image/png,image/webp,image/svg+xml" aoMudar={marcar} erro={erros.logoTopo}
                dica={menuOculto ? "Aparece sobre a foto do topo, sem fundo e sem link. Vazio = logo claro de Configurações." : "Só aparece com o menu superior oculto."} />
            </div>
          </CartaoSecao>

          {estrutura.map((s, i) => (
            <CartaoSecao key={s.chave} id={`secao-${s.chave}`} n={i + 2} titulo={corpos[s.chave].titulo} ajuda={corpos[s.chave].ajuda}
              oculta={s.oculta} alternar={() => alternar(s.chave)} mover={(d) => mover(s.chave, d)} podeSubir={i > 0} podeDescer={i < estrutura.length - 1} abertaInicial={false}>
              {corpos[s.chave].corpo}
            </CartaoSecao>
          ))}

          <CartaoSecao n={estrutura.length + 2} titulo="Material para download" ajuda="Botão que pede nome e telefone, registra o lead e libera um PDF (laudo, ficha, condições)." abertaInicial={false}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="materialArquivo" className="rotulo">Arquivo PDF</label>
                <input id="materialArquivo" name="materialArquivo" type="file" accept="application/pdf" className="campo h-auto py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-fundo file:px-3 file:py-1.5 file:font-semibold"
                  aria-invalid={erros.materialArquivo ? true : undefined} aria-describedby="materialArquivo-dica" />
                {erros.materialArquivo
                  ? <p id="materialArquivo-dica" className="mt-1.5 text-sm text-erro">{erros.materialArquivo}</p>
                  : <p id="materialArquivo-dica" className="mt-1.5 text-xs text-suave">{lp?.materialChave ? "Já existe um arquivo. Envie outro para substituir." : "Até 10 MB."}</p>}
                {lp?.materialChave && (
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                    <a href={`/imagens/${lp.materialChave}`} target="_blank" rel="noopener" className="font-semibold text-marca-700 underline">Ver arquivo atual</a>
                    <label className="flex items-center gap-2 text-suave"><input type="checkbox" name="removerMaterial" value="1" className="size-4" /> Remover</label>
                  </div>
                )}
              </div>
              <CampoTexto id="materialRotulo" rotulo="Texto do botão" defaultValue={lp?.materialRotulo ?? ""} placeholder="Baixar o laudo cautelar" maxLength={40} />
            </div>
          </CartaoSecao>

          <CartaoSecao n={estrutura.length + 3} titulo="Endereço e SEO" ajuda="O endereço define o link da página. Título e descrição aparecem ao compartilhar." abertaInicial={!lp}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="slug" className="rotulo">Endereço</label>
                <div className="flex items-stretch overflow-hidden rounded-lg border border-linha-forte focus-within:border-marca-600">
                  <span className="flex items-center bg-fundo px-3 text-sm text-suave">/lp/</span>
                  <input id="slug" name="slug" defaultValue={lp?.slug ?? slugify(`${v.marca} ${v.modelo} ${v.versao} ${v.anoModelo}`).slice(0, 80)} autoCapitalize="off" spellCheck={false}
                    className="h-11 min-w-0 flex-1 px-3 text-[15px] text-tinta focus:outline-none" aria-invalid={erros.slug ? true : undefined} aria-describedby="slug-ajuda" />
                </div>
                <p id="slug-ajuda" className={cn("mt-1.5 text-sm", erros.slug ? "text-erro" : "text-suave")}>{erros.slug ?? "Letras minúsculas, números e hífens."}</p>
              </div>
              <CampoTexto id="seoTitulo" rotulo="Título ao compartilhar (opcional)" defaultValue={lp?.seoTitulo ?? ""} maxLength={70} />
              <CampoTexto id="seoDescricao" rotulo="Descrição (opcional)" defaultValue={lp?.seoDescricao ?? ""} maxLength={200} />
            </div>
          </CartaoSecao>
        </div>

        <aside className="min-w-0">
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 rounded-xl border border-linha bg-white p-5 xl:sticky xl:top-4 xl:max-h-[calc(100dvh-7rem)] xl:overflow-y-auto">
            <h2 className="font-bold text-tinta">Publicação</h2>
            <CampoTexto id="titulo" rotulo="Nome interno" defaultValue={lp?.titulo ?? tituloPadrao} maxLength={100} erro={erros.titulo} dica="Só aparece no painel." />
            <CampoSelecao id="status" rotulo="Status" defaultValue={lp?.status ?? "rascunho"}>
              <option value="rascunho">Rascunho (só a equipe vê)</option>
              <option value="ativa">Ativa (pública)</option>
            </CampoSelecao>
            {lp && (
              <div>
                <span className="rotulo">Link da página</span>
                <div className="flex items-center gap-1 rounded-lg bg-fundo p-1.5 pl-3 text-xs">
                  <span className="min-w-0 flex-1 truncate">{urlPagina}</span>
                  <button type="button" className="botao-fantasma h-9 px-2 text-xs" onClick={() => navigator.clipboard?.writeText(urlPagina).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 1500); })}>
                    {copiado ? <><Check className="size-4 text-sucesso" /> Copiado</> : <><Copy className="size-4" /> Copiar</>}
                  </button>
                </div>
              </div>
            )}
            <CampoSelecao id="estilo" rotulo="Estilo" value={estilo} onChange={(e) => trocarEstilo(e.target.value as EstiloLP)} dica={infoEstilo(estilo).descricao}>
              {INFO_ESTILOS.map((e) => <option key={e.valor} value={e.valor}>{e.rotulo}</option>)}
            </CampoSelecao>
            {avisoPaleta && <p role="status" className="-mt-2 rounded-lg bg-marca-50 px-3 py-2 text-xs text-marca-800">{avisoPaleta}</p>}
            <fieldset>
              <legend className="rotulo">Botões e cards</legend>
              <div className="grid grid-cols-3 gap-2">
                {ESTILOS_BOTAO.map((b) => (
                  <label key={b.valor} className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-linha p-2 text-xs has-[:checked]:border-marca-600 has-[:checked]:ring-2 has-[:checked]:ring-marca-600/15">
                    <input type="radio" name="estiloBotao" value={b.valor} checked={estiloBotao === b.valor} onChange={() => setEstiloBotao(b.valor)} className="sr-only" />
                    <span className="block h-7 w-14 bg-tinta" style={{ borderRadius: b.valor === "pilula" ? "9999px" : b.valor === "arredondado" ? "6px" : "0" }} />
                    {b.rotulo}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-3 border-t border-linha pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-tinta">Cores</span>
                <button type="button" onClick={() => { setTema(infoEstilo(estilo).tema); setEstiloBotao(infoEstilo(estilo).botao); marcar(); }} className="botao-fantasma h-9 px-2 text-xs"><Sparkles className="size-3.5" /> Paleta do estilo</button>
              </div>
              {GRUPOS_TEMA.map((grupo) => (
                <div key={grupo} className="grid gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-suave">{grupo}</p>
                  {CAMPOS_TEMA.filter((c) => c.grupo === grupo).map((c) => (
                    <SeletorCor key={c.chave} id={`tema_${c.chave}`} rotulo={c.rotulo} valor={tema[c.chave]} aoMudar={(cor) => { setTema((x) => ({ ...x, [c.chave]: cor })); marcar(); }} />
                  ))}
                </div>
              ))}
            </div>
            <div className="grid gap-2 border-t border-linha pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-suave">Preencher textos</p>
              <button type="button" onClick={() => aplicarSemente(doVeiculo, "dados do carro")} className="botao-secundario h-10 justify-start px-3 text-sm"><Sparkles className="size-4" /> Com os dados do carro</button>
              <button type="button" onClick={() => aplicarSemente(modelo, "textos do modelo de campanha")} className="botao-secundario h-10 justify-start px-3 text-sm"><Wand2 className="size-4" /> Com o modelo de campanha</button>
            </div>
            {lp && (
              <div className="border-t border-linha pt-4">
                <button type="submit" name="intencao" value="excluir" formNoValidate className="botao-perigo h-10 w-full px-4 text-sm"
                  onClick={(e) => { if (!confirm("Excluir esta landing page? Anúncios que usam este link vão parar de funcionar.")) e.preventDefault(); else setSujo(false); }}>
                  <Trash2 className="size-4" /> Excluir landing page
                </button>
              </div>
            )}
          </div>
        </aside>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-linha bg-white/95 backdrop-blur lg:left-64">
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-8">
            <p className="min-w-0 truncate text-sm" role="status">
              {salvando ? <span className="text-suave">Salvando…</span>
                : sujo ? <span className="font-medium text-alerta">● Alterações não salvas</span>
                : salvoAs ? <span className="text-sucesso">✓ Salvo às {salvoAs}</span>
                : <span className="text-suave">{lp ? "Nenhuma alteração" : "Ainda não salva"}</span>}
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <Link to="/admin/landing-pages" className="botao-fantasma hidden h-10 px-4 text-sm sm:inline-flex">Voltar</Link>
              {lp && <a href={`/lp/${lp.slug}`} target="_blank" rel="noopener" className="botao-secundario hidden h-10 px-4 text-sm sm:inline-flex"><ExternalLink className="size-4" /> {lp.status === "ativa" ? "Abrir" : "Pré-visualizar"}</a>}
              <button type="submit" disabled={salvando} className="botao-primario h-10 min-w-36 px-5 text-sm">{salvando ? "Salvando…" : lp ? "Salvar alterações" : "Criar landing page"}</button>
            </div>
          </div>
        </div>
      </Form>
    </>
  );
}

export { ErroPainel as ErrorBoundary } from "~/components/admin/ErroPainel";
