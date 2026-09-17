import { and, asc, eq, ne } from "drizzle-orm";
import { useMemo, useState } from "react";
import { data, Form, Link, redirect, useNavigation } from "react-router";
import { db, schema } from "~/.server/db";
import { exigirUsuario } from "~/.server/sessao";
import { exigirMesmaOrigem } from "~/.server/seguranca";
import { Aviso, BarraSalvar, Cabecalho, Secao } from "~/components/admin/ui";
import { CampoArea, CampoSelecao, CampoTexto } from "~/components/Campo";
import { anos, km, moeda, slugify } from "~/lib/formato";
import { metaAdmin } from "~/lib/site";
import { cn } from "~/lib/ui";
import { codigoVeiculo, ESTILOS_LP, ROTULO_ESTILO_LP, type EstiloLP } from "~/lib/veiculos";
import type { Route } from "./+types/landing-page-form";

export function meta({ params, matches }: Route.MetaArgs) {
  return metaAdmin(params.id ? "Editar landing page" : "Nova landing page", matches);
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await exigirUsuario(request);
  const { anuncios, marcas, modelos } = schema;
  const veiculos = await db.select({
    id: anuncios.id, codigo: anuncios.codigo, marca: marcas.nome, modelo: modelos.nome, versao: anuncios.versao,
    anoFabricacao: anuncios.anoFabricacao, anoModelo: anuncios.anoModelo, km: anuncios.km, preco: anuncios.preco, status: anuncios.status,
  }).from(anuncios)
    .innerJoin(marcas, eq(marcas.id, anuncios.marcaId))
    .innerJoin(modelos, eq(modelos.id, anuncios.modeloId))
    .orderBy(asc(marcas.nome), asc(modelos.nome));

  let lp = null;
  if (params.id) {
    [lp] = await db.select().from(schema.landingPages).where(eq(schema.landingPages.id, params.id)).limit(1);
    if (!lp) throw data("Landing page não encontrada", { status: 404 });
  }
  const url = new URL(request.url);
  return {
    veiculos,
    lp: lp ? { ...lp, destaques: (JSON.parse(lp.destaques) as string[]).join("\n") } : null,
    veiculoInicial: url.searchParams.get("veiculo") ?? "",
    origem: url.origin,
  };
}

type Campo = "anuncioId" | "titulo" | "slug" | "headline" | "subtitulo" | "destaques" | "textoBotao";
type Erros = Partial<Record<Campo, string>>;

export async function action({ request, params }: Route.ActionArgs) {
  exigirMesmaOrigem(request);
  await exigirUsuario(request);
  const form = await request.formData();
  const t = (k: string) => String(form.get(k) ?? "").trim();

  const v = {
    anuncioId: t("anuncioId"), titulo: t("titulo"), slug: slugify(t("slug") || t("titulo")).slice(0, 80),
    headline: t("headline"), subtitulo: t("subtitulo"),
    destaques: t("destaques").split("\n").map((d) => d.trim()).filter(Boolean).slice(0, 8).map((d) => d.slice(0, 80)),
    textoBotao: t("textoBotao") || "Quero este carro",
    mostrarPreco: form.get("mostrarPreco") === "on",
    estilo: ((ESTILOS_LP as readonly string[]).includes(t("estilo")) ? t("estilo") : "classico") as EstiloLP,
    status: t("status") === "pausada" ? ("pausada" as const) : ("ativa" as const),
  };

  const erros: Erros = {};
  const [veiculo] = v.anuncioId ? await db.select({ id: schema.anuncios.id }).from(schema.anuncios).where(eq(schema.anuncios.id, v.anuncioId)).limit(1) : [];
  if (!veiculo) erros.anuncioId = "Escolha o veículo.";
  if (v.titulo.length < 3 || v.titulo.length > 100) erros.titulo = "Dê um nome para identificar a página (3 a 100 caracteres).";
  if (v.slug.length < 3) erros.slug = "Endereço curto demais.";
  if (v.headline.length < 5 || v.headline.length > 120) erros.headline = "Título de 5 a 120 caracteres.";
  if (v.subtitulo.length > 240) erros.subtitulo = "Até 240 caracteres.";
  if (v.textoBotao.length > 40) erros.textoBotao = "Até 40 caracteres.";
  if (!erros.slug) {
    const [repetido] = await db.select({ id: schema.landingPages.id }).from(schema.landingPages)
      .where(params.id ? and(eq(schema.landingPages.slug, v.slug), ne(schema.landingPages.id, params.id)) : eq(schema.landingPages.slug, v.slug)).limit(1);
    if (repetido) erros.slug = "Já existe uma landing page com este endereço.";
  }
  if (Object.keys(erros).length) return data({ erros }, { status: 400 });

  const valores = { ...v, destaques: JSON.stringify(v.destaques), atualizadoEm: Date.now() };
  if (params.id) {
    await db.update(schema.landingPages).set(valores).where(eq(schema.landingPages.id, params.id));
  } else {
    await db.insert(schema.landingPages).values({ id: crypto.randomUUID(), ...valores });
  }
  throw redirect("/admin/landing-pages");
}

const PREVIA_ESTILO: Record<EstiloLP, { fundo: string; texto: string; descricao: string }> = {
  classico: { fundo: "bg-fundo", texto: "text-tinta", descricao: "Fundo claro, fotos em galeria e formulário ao lado." },
  escuro: { fundo: "bg-noite", texto: "text-white", descricao: "Fundo escuro com a cor da loja em destaque." },
  impacto: { fundo: "bg-gradient-to-r from-noite to-noite/40", texto: "text-white", descricao: "Foto do carro ocupando o topo, formulário sobre ela." },
};

export default function LandingPageForm({ loaderData, actionData }: Route.ComponentProps) {
  const { veiculos, lp, veiculoInicial, origem } = loaderData;
  const erros: Erros = actionData?.erros ?? {};
  const enviando = useNavigation().state === "submitting";

  const [anuncioId, setAnuncioId] = useState(lp?.anuncioId ?? veiculoInicial);
  const veiculo = useMemo(() => veiculos.find((x) => x.id === anuncioId), [veiculos, anuncioId]);
  const [titulo, setTitulo] = useState(lp?.titulo ?? "");
  const [slug, setSlug] = useState(lp?.slug ?? "");
  const [slugManual, setSlugManual] = useState(Boolean(lp));
  const [headline, setHeadline] = useState(lp?.headline ?? "");
  const [estilo, setEstilo] = useState<EstiloLP>(lp?.estilo ?? "classico");

  // Ao escolher o carro numa página nova, sugere nome, endereço e título.
  function escolherVeiculo(id: string) {
    setAnuncioId(id);
    const x = veiculos.find((v) => v.id === id);
    if (!x || lp) return;
    const nome = `${x.marca} ${x.modelo} ${x.anoModelo}`;
    if (!titulo) setTitulo(`${nome} — campanha`);
    if (!slugManual) setSlug(slugify(`${x.marca} ${x.modelo} ${x.versao} ${x.anoModelo}`).slice(0, 80));
    if (!headline) setHeadline(`${x.marca} ${x.modelo} ${x.versao} ${x.anoModelo}`);
  }

  const passo = (n: number, texto: string) => (
    <span className="flex items-center gap-2.5">
      <span className="numeros grid size-7 place-items-center rounded-full bg-marca-600 text-sm font-bold text-sobre-marca">{n}</span>{texto}
    </span>
  );

  return (
    <Form method="post" noValidate className="max-w-4xl">
      <Cabecalho titulo={lp ? "Editar landing page" : "Nova landing page"} descricao="Página de campanha em 3 passos: veículo, conteúdo e estilo." />
      {Object.keys(erros).length > 0 && <Aviso tipo="erro">Revise os campos marcados.</Aviso>}

      <div className="grid gap-4">
        <Secao titulo={passo(1, "Qual carro a página vai vender?")}>
          <CampoSelecao id="anuncioId" rotulo="Veículo" value={anuncioId} onChange={(e) => escolherVeiculo(e.target.value)} erro={erros.anuncioId}>
            <option value="" disabled>Selecione</option>
            {veiculos.map((x) => (
              <option key={x.id} value={x.id}>{codigoVeiculo(x.codigo)} · {x.marca} {x.modelo} {x.versao} {x.anoModelo}{x.status !== "ativo" ? ` (${x.status})` : ""}</option>
            ))}
          </CampoSelecao>
          {veiculo && (
            <p className="numeros mt-2 text-sm text-suave">{anos(veiculo.anoFabricacao, veiculo.anoModelo)} · {km(veiculo.km)} · {moeda(veiculo.preco)} — fotos e itens vêm do cadastro do veículo.</p>
          )}
        </Secao>

        <Secao titulo={passo(2, "Conteúdo")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoTexto id="titulo" rotulo="Nome interno" value={titulo} onChange={(e) => setTitulo(e.target.value)} erro={erros.titulo} dica="Só aparece no painel." />
            <div>
              <label htmlFor="slug" className="rotulo">Endereço</label>
              <div className="flex items-stretch overflow-hidden rounded-lg border border-linha-forte focus-within:border-marca-600">
                <span className="flex items-center bg-fundo px-3 text-sm text-suave">/lp/</span>
                <input id="slug" name="slug" value={slug} onChange={(e) => { setSlugManual(true); setSlug(slugify(e.target.value)); }}
                  className="h-11 min-w-0 flex-1 px-3 text-[15px] text-tinta focus:outline-none" aria-invalid={erros.slug ? true : undefined} />
              </div>
              {erros.slug ? <p className="mt-1.5 text-sm text-erro">{erros.slug}</p> : <p className="mt-1.5 truncate text-xs text-suave">{origem}/lp/{slug || "…"}</p>}
            </div>
            <CampoTexto id="headline" rotulo="Título da página" value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={120} erro={erros.headline} className="sm:col-span-2" />
            <CampoTexto id="subtitulo" rotulo="Subtítulo" defaultValue={lp?.subtitulo} maxLength={240} erro={erros.subtitulo} className="sm:col-span-2"
              placeholder="Ex.: Revisado, com garantia e parcelas que cabem no bolso." />
            <CampoArea id="destaques" rotulo="Destaques (um por linha)" rows={4} defaultValue={lp?.destaques} className="sm:col-span-2"
              placeholder={"Único dono\nIPVA 2026 pago\nRevisões na concessionária"} dica="Até 8 itens curtos, com um check ao lado." />
            <CampoTexto id="textoBotao" rotulo="Texto do botão" defaultValue={lp?.textoBotao ?? "Quero este carro"} maxLength={40} erro={erros.textoBotao} />
            <label className="flex cursor-pointer items-center gap-3 self-end rounded-lg border border-linha px-4 py-3">
              <input type="checkbox" name="mostrarPreco" defaultChecked={lp?.mostrarPreco ?? true} className="size-4 accent-marca-600" />
              <span className="text-sm font-medium text-tinta">Mostrar o preço na página</span>
            </label>
          </div>
        </Secao>

        <Secao titulo={passo(3, "Estilo e publicação")}>
          <fieldset>
            <legend className="rotulo">Estilo</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              {ESTILOS_LP.map((e) => (
                <label key={e} className={cn("cursor-pointer overflow-hidden rounded-xl border-2 bg-white transition-colors", estilo === e ? "border-marca-600" : "border-linha hover:border-linha-forte")}>
                  <input type="radio" name="estilo" value={e} checked={estilo === e} onChange={() => setEstilo(e)} className="sr-only" />
                  <span aria-hidden="true" className={cn("flex h-20 flex-col justify-center gap-1.5 px-3", PREVIA_ESTILO[e].fundo)}>
                    <span className={cn("h-2 w-2/3 rounded", PREVIA_ESTILO[e].texto === "text-white" ? "bg-white/80" : "bg-tinta/70")} />
                    <span className={cn("h-1.5 w-1/2 rounded", PREVIA_ESTILO[e].texto === "text-white" ? "bg-white/40" : "bg-tinta/30")} />
                    <span className="mt-1 h-3 w-16 rounded bg-marca-600" />
                  </span>
                  <span className="block px-3 py-2.5">
                    <span className="block text-sm font-semibold text-tinta">{ROTULO_ESTILO_LP[e]}</span>
                    <span className="block text-xs text-suave">{PREVIA_ESTILO[e].descricao}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="mt-5 max-w-xs">
            <CampoSelecao id="status" rotulo="Status" defaultValue={lp?.status ?? "ativa"} dica="Pausada: o link responde “não encontrada” para visitantes.">
              <option value="ativa">Ativa</option>
              <option value="pausada">Pausada</option>
            </CampoSelecao>
          </div>
        </Secao>
      </div>

      <BarraSalvar>
        {lp && <a href={`/lp/${lp.slug}`} target="_blank" rel="noopener" className="botao-fantasma h-10 px-4 text-sm">Ver página</a>}
        <Link to="/admin/landing-pages" className="botao-fantasma h-10 px-4 text-sm">Cancelar</Link>
        <button type="submit" disabled={enviando} className="botao-primario h-10 min-w-40 px-5 text-sm">{enviando ? "Salvando…" : lp ? "Salvar alterações" : "Publicar landing page"}</button>
      </BarraSalvar>
    </Form>
  );
}

export { ErroPainel as ErrorBoundary } from "~/components/admin/ErroPainel";
