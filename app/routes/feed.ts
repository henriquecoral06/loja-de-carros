import { asc, eq } from "drizzle-orm";
import { db, schema } from "~/.server/db";
import { urlImagem } from "~/.server/imagens";
import { lojaCompleta } from "~/.server/loja";
import { iguais } from "~/.server/token";
import { codigoVeiculo } from "~/lib/veiculos";
import type { Route } from "./+types/feed";

const x = (t: string | number) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Feed XML do estoque à venda, para importação em portais e integradores.
 * Formato genérico e documentado no README; o endereço leva o token
 * gerado em Admin → Veículos → Exportar para portais.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const loja = await lojaCompleta();
  if (!loja.feedAtivo || !loja.feedToken || !iguais(url.searchParams.get("token") ?? "", loja.feedToken)) {
    return new Response("Feed desativado ou token inválido.", { status: 404 });
  }

  const { anuncios, marcas, modelos, fotos } = schema;
  const lista = await db.select({
    id: anuncios.id, codigo: anuncios.codigo, slug: anuncios.slug, versao: anuncios.versao, anoFabricacao: anuncios.anoFabricacao,
    anoModelo: anuncios.anoModelo, km: anuncios.km, preco: anuncios.preco, cambio: anuncios.cambio, combustivel: anuncios.combustivel,
    carroceria: anuncios.carroceria, cor: anuncios.cor, portas: anuncios.portas, opcionais: anuncios.opcionais,
    descricao: anuncios.descricao, atualizadoEm: anuncios.atualizadoEm, marca: marcas.nome, modelo: modelos.nome,
  }).from(anuncios)
    .innerJoin(marcas, eq(marcas.id, anuncios.marcaId))
    .innerJoin(modelos, eq(modelos.id, anuncios.modeloId))
    .where(eq(anuncios.status, "ativo"));

  // Join em vez de IN (...): o D1 aceita no máximo 100 parâmetros por consulta.
  const todasFotos = await db.select({ anuncioId: fotos.anuncioId, chave: fotos.chave }).from(fotos)
    .innerJoin(anuncios, eq(anuncios.id, fotos.anuncioId))
    .where(eq(anuncios.status, "ativo")).orderBy(asc(fotos.ordem));
  const absoluta = (u: string) => (u.startsWith("http") ? u : `${url.origin}${u}`);

  const corpo = lista.map((a) => `
  <veiculo>
    <codigo>${x(codigoVeiculo(a.codigo))}</codigo>
    <marca>${x(a.marca)}</marca>
    <modelo>${x(a.modelo)}</modelo>
    <versao>${x(a.versao)}</versao>
    <ano_fabricacao>${a.anoFabricacao}</ano_fabricacao>
    <ano_modelo>${a.anoModelo}</ano_modelo>
    <km>${a.km}</km>
    <preco>${a.preco}</preco>
    <cambio>${x(a.cambio)}</cambio>
    <combustivel>${x(a.combustivel)}</combustivel>
    <carroceria>${x(a.carroceria)}</carroceria>
    <cor>${x(a.cor)}</cor>
    <portas>${a.portas}</portas>
    <opcionais>${(JSON.parse(a.opcionais) as string[]).map((o) => `<opcional>${x(o)}</opcional>`).join("")}</opcionais>
    <descricao>${x(a.descricao)}</descricao>
    <url>${x(`${url.origin}/carro/${a.slug}`)}</url>
    <atualizado_em>${new Date(a.atualizadoEm).toISOString()}</atualizado_em>
    <fotos>${todasFotos.filter((f) => f.anuncioId === a.id).map((f) => `<foto>${x(absoluta(urlImagem(f.chave)))}</foto>`).join("")}</fotos>
  </veiculo>`).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<estoque loja="${x(loja.nome)}" gerado_em="${new Date().toISOString()}" total="${lista.length}">${corpo}
</estoque>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "private, max-age=300", "X-Robots-Tag": "noindex" } });
}
