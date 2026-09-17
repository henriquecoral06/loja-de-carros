import { eq, sql } from "drizzle-orm";
import { isbot } from "isbot";
import { data, redirect } from "react-router";
import { porSlug } from "~/.server/anuncios";
import { db, schema } from "~/.server/db";
import { criarLead, validarLead } from "~/.server/leads";
import { obterUsuario } from "~/.server/sessao";
import { dentroDoLimite, exigirMesmaOrigem, ipDe } from "~/.server/seguranca";
import { LandingPage } from "~/components/lp/LandingPage";
import { Rastreamento } from "~/components/Rastreamento";
import { lojaDasRotas } from "~/lib/site";
import type { Route } from "./+types/lp";

async function carregar(slug: string) {
  const [lp] = await db.select().from(schema.landingPages).where(eq(schema.landingPages.slug, slug)).limit(1);
  if (!lp) return null;
  const [carro] = await db.select({ slug: schema.anuncios.slug }).from(schema.anuncios).where(eq(schema.anuncios.id, lp.anuncioId)).limit(1);
  const veiculo = carro ? await porSlug(carro.slug) : null;
  return veiculo ? { lp, veiculo } : null;
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const achado = await carregar(params.slug);
  if (!achado) throw data("Página não encontrada", { status: 404 });
  const equipe = Boolean(await obterUsuario(request));
  const { lp, veiculo } = achado;
  if (lp.status !== "ativa" && !equipe) throw data("Página não encontrada", { status: 404 });
  // Carro pausado não pode ser anunciado; vendido leva à página do carro (aviso e opções parecidas).
  if (veiculo.status === "pausado" && !equipe) throw data("Página não encontrada", { status: 404 });
  if (veiculo.status === "vendido" && !equipe) throw redirect(`/carro/${veiculo.slug}`, 302);

  if (!equipe && !isbot(request.headers.get("User-Agent"))) {
    await db.update(schema.landingPages).set({ visitas: sql`${schema.landingPages.visitas} + 1` }).where(eq(schema.landingPages.id, lp.id));
  }
  const url = new URL(request.url);
  return { lp, veiculo, equipe, previa: lp.status !== "ativa", urlPagina: `${url.origin}/lp/${lp.slug}`, origem: url.origin };
}

export function meta({ loaderData, matches }: Route.MetaArgs) {
  const loja = lojaDasRotas(matches);
  if (!loaderData) return [{ title: `Página não encontrada — ${loja.nome}` }];
  const { lp, veiculo: v, origem, urlPagina } = loaderData;
  const titulo = lp.seoTitulo || `${lp.headline} — ${loja.nome}`;
  const descricao = (lp.seoDescricao || lp.subtitulo || `${v.marca} ${v.modelo} ${v.versao} ${v.anoModelo}`).slice(0, 200);
  const imagem = lp.imagemTopo || v.fotos[0]?.url;
  return [
    { title: titulo },
    { name: "description", content: descricao },
    // Página de campanha: fica fora do Google para não competir com a página do carro.
    { name: "robots", content: "noindex" },
    { property: "og:title", content: titulo },
    { property: "og:description", content: descricao },
    { property: "og:type", content: "website" },
    { property: "og:url", content: urlPagina },
    ...(imagem ? [{ property: "og:image", content: imagem.startsWith("http") ? imagem : `${origem}${imagem}` }] : []),
  ];
}

export async function action({ request, params }: Route.ActionArgs) {
  exigirMesmaOrigem(request);
  const achado = await carregar(params.slug);
  if (!achado || achado.lp.status !== "ativa" && !(await obterUsuario(request))) throw data("Página não encontrada", { status: 404 });
  const form = await request.formData();
  if (form.get("empresa")) return { enviada: true };
  const { lp, veiculo } = achado;
  const material = form.get("intencao") === "material";
  if (material && !lp.materialChave) return data({ erro: "Material indisponível." }, { status: 404 });
  if (!material && veiculo.status !== "ativo") return data({ erro: "Este carro já foi vendido." }, { status: 410 });

  const resultado = validarLead(form, { textoObrigatorio: false });
  if ("erros" in resultado) return data({ erros: resultado.erros }, { status: 400 });
  if (!(await dentroDoLimite(`mensagem:${ipDe(request)}`, 8, 3_600_000))) {
    return data({ erro: "Você enviou muitas mensagens em pouco tempo. Tente de novo mais tarde." }, { status: 429 });
  }
  const texto = material
    ? `Baixou o material "${lp.materialRotulo || "Material"}" da landing page "${lp.titulo}".`
    : resultado.dados.texto || `Interesse pela landing page "${lp.titulo}".`;
  await criarLead({
    request, origem: "landing_page", anuncioId: veiculo.id, landingPageId: lp.id,
    dados: { ...resultado.dados, texto }, rastreio: resultado.rastreio, eventId: resultado.eventId,
  });
  return material
    ? { enviada: true, eventId: resultado.eventId, url: `/imagens/${lp.materialChave}` }
    : { enviada: true, eventId: resultado.eventId };
}

export default function PaginaLP({ loaderData }: Route.ComponentProps) {
  const { lp, veiculo, equipe, previa, urlPagina } = loaderData;
  return (
    <>
      <LandingPage lp={lp} veiculo={veiculo} equipe={equipe} previa={previa} urlPagina={urlPagina} />
      <Rastreamento />
    </>
  );
}
