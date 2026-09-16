import { and, asc, count, desc, eq, gte, inArray, like, lte, ne, or, sql, type SQL } from "drizzle-orm";
import type { Filtros } from "~/lib/busca";
import { SITE } from "~/lib/site";
import { db, schema } from "./db";
import { urlImagem } from "./imagens";

const { anuncios, marcas, modelos, fotos } = schema;

/** Campos do card. A capa e o total de fotos saem de subconsultas correlacionadas. */
const camposCard = {
  id: anuncios.id,
  slug: anuncios.slug,
  versao: anuncios.versao,
  anoFabricacao: anuncios.anoFabricacao,
  anoModelo: anuncios.anoModelo,
  km: anuncios.km,
  preco: anuncios.preco,
  cambio: anuncios.cambio,
  combustivel: anuncios.combustivel,
  carroceria: anuncios.carroceria,
  destaque: anuncios.destaque,
  criadoEm: anuncios.criadoEm,
  marca: marcas.nome,
  modelo: modelos.nome,
  capa: sql<string | null>`(select ${fotos.chave} from ${fotos} where ${fotos.anuncioId} = ${anuncios.id} order by ${fotos.ordem} limit 1)`,
  totalFotos: sql<number>`(select count(*) from ${fotos} where ${fotos.anuncioId} = ${anuncios.id})`,
};

export type Card = Awaited<ReturnType<typeof recentes>>[number];

const paraCard = <T extends { capa: string | null }>(linha: T) => ({
  ...linha,
  capa: linha.capa ? urlImagem(linha.capa) : null,
});

async function idsDoCaminho(filtros: Pick<Filtros, "marca" | "modelo">) {
  if (!filtros.marca) return { marcaId: undefined, modeloId: undefined, inexistente: false };
  const [marca] = await db.select({ id: marcas.id }).from(marcas).where(eq(marcas.slug, filtros.marca)).limit(1);
  if (!marca) return { marcaId: undefined, modeloId: undefined, inexistente: true };
  if (!filtros.modelo) return { marcaId: marca.id, modeloId: undefined, inexistente: false };
  const [modelo] = await db.select({ id: modelos.id }).from(modelos)
    .where(and(eq(modelos.marcaId, marca.id), eq(modelos.slug, filtros.modelo))).limit(1);
  return { marcaId: marca.id, modeloId: modelo?.id, inexistente: !modelo };
}

function condicoes(f: Filtros, ids: { marcaId?: number; modeloId?: number }, ignorar: { marca?: boolean } = {}) {
  const lista: SQL[] = [eq(anuncios.status, "ativo")];
  if (!ignorar.marca && ids.marcaId) lista.push(eq(anuncios.marcaId, ids.marcaId));
  if (!ignorar.marca && ids.modeloId) lista.push(eq(anuncios.modeloId, ids.modeloId));
  if (f.precoMin) lista.push(gte(anuncios.preco, f.precoMin));
  if (f.precoMax) lista.push(lte(anuncios.preco, f.precoMax));
  if (f.anoMin) lista.push(gte(anuncios.anoModelo, f.anoMin));
  if (f.anoMax) lista.push(lte(anuncios.anoModelo, f.anoMax));
  if (f.kmMax) lista.push(lte(anuncios.km, f.kmMax));
  if (f.cambio.length) lista.push(inArray(anuncios.cambio, f.cambio));
  if (f.combustivel.length) lista.push(inArray(anuncios.combustivel, f.combustivel));
  if (f.carroceria.length) lista.push(inArray(anuncios.carroceria, f.carroceria));
  if (f.q) {
    // Cada palavra precisa aparecer em marca, modelo, versão ou ano:
    // "corolla xei" acha o Corolla XEi sem exigir a ordem exata.
    for (const palavra of f.q.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6)) {
      const termo = `%${palavra.replace(/[%_]/g, "")}%`;
      lista.push(or(
        like(sql`lower(${marcas.nome})`, termo),
        like(sql`lower(${modelos.nome})`, termo),
        like(sql`lower(${anuncios.versao})`, termo),
        like(sql`cast(${anuncios.anoModelo} as text)`, termo),
      )!);
    }
  }
  return and(...lista);
}

const ordenar = (ordem: Filtros["ordem"]) => {
  switch (ordem) {
    case "menor-preco": return [asc(anuncios.preco)];
    case "maior-preco": return [desc(anuncios.preco)];
    case "menor-km": return [asc(anuncios.km)];
    case "mais-novo": return [desc(anuncios.anoModelo), desc(anuncios.criadoEm)];
    default: return [desc(anuncios.criadoEm)];
  }
};

const base = () => db.select(camposCard).from(anuncios)
  .innerJoin(marcas, eq(marcas.id, anuncios.marcaId))
  .innerJoin(modelos, eq(modelos.id, anuncios.modeloId));

export async function buscar(f: Filtros) {
  const ids = await idsDoCaminho(f);
  if (ids.inexistente) return { anuncios: [], total: 0, marcasFaceta: [], modelosFaceta: [], inexistente: true };

  const onde = condicoes(f, ids);
  const deslocamento = (f.pagina - 1) * SITE.porPagina;

  // Promise.all, NÃO db.batch. No batch o D1 devolve cada linha como
  // objeto chaveado pelo nome da coluna, e o Drizzle converte com
  // Object.values: marcas.nome e modelos.nome colidem em "nome", o array
  // encurta e todos os campos seguintes deslocam — sem erro nenhum.
  const [linhas, [{ total }], marcasFaceta, modelosFaceta] = await Promise.all([
    base().where(onde).orderBy(...ordenar(f.ordem)).limit(SITE.porPagina).offset(deslocamento),
    db.select({ total: count() }).from(anuncios)
      .innerJoin(marcas, eq(marcas.id, anuncios.marcaId))
      .innerJoin(modelos, eq(modelos.id, anuncios.modeloId))
      .where(onde),
    // A faceta de marca ignora o filtro de marca: senão, ao escolher uma
    // marca, todas as outras sumiriam da lista.
    db.select({ slug: marcas.slug, nome: marcas.nome, total: count() }).from(anuncios)
      .innerJoin(marcas, eq(marcas.id, anuncios.marcaId))
      .innerJoin(modelos, eq(modelos.id, anuncios.modeloId))
      .where(condicoes(f, ids, { marca: true }))
      .groupBy(marcas.id).orderBy(desc(count()), asc(marcas.nome)),
    ids.marcaId
      ? db.select({ slug: modelos.slug, nome: modelos.nome, total: count() }).from(anuncios)
          .innerJoin(marcas, eq(marcas.id, anuncios.marcaId))
          .innerJoin(modelos, eq(modelos.id, anuncios.modeloId))
          .where(condicoes({ ...f, modelo: undefined }, { marcaId: ids.marcaId }))
          .groupBy(modelos.id).orderBy(asc(modelos.nome))
      : Promise.resolve([] as { slug: string; nome: string; total: number }[]),
  ]);

  return { anuncios: linhas.map(paraCard), total, marcasFaceta, modelosFaceta, inexistente: false };
}

export async function recentes(limite = 8) {
  const linhas = await base().where(eq(anuncios.status, "ativo")).orderBy(desc(anuncios.criadoEm)).limit(limite);
  return linhas.map(paraCard);
}

/** Vitrine da home. Sem destaque marcado, cai para os mais recentes. */
export async function destaques(limite = 8) {
  const linhas = await base().where(and(eq(anuncios.status, "ativo"), eq(anuncios.destaque, true)))
    .orderBy(desc(anuncios.atualizadoEm)).limit(limite);
  return linhas.length ? linhas.map(paraCard) : recentes(limite);
}

export async function porSlug(slug: string) {
  const [anuncio] = await db.select({
    ...camposCard,
    cor: anuncios.cor, portas: anuncios.portas, opcionais: anuncios.opcionais,
    descricao: anuncios.descricao, status: anuncios.status, visualizacoes: anuncios.visualizacoes,
    marcaSlug: marcas.slug, modeloSlug: modelos.slug,
  }).from(anuncios)
    .innerJoin(marcas, eq(marcas.id, anuncios.marcaId))
    .innerJoin(modelos, eq(modelos.id, anuncios.modeloId))
    .where(eq(anuncios.slug, slug)).limit(1);

  if (!anuncio) return null;

  const listaFotos = await db.select({ id: fotos.id, chave: fotos.chave }).from(fotos)
    .where(eq(fotos.anuncioId, anuncio.id)).orderBy(asc(fotos.ordem));

  return {
    ...paraCard(anuncio),
    opcionais: JSON.parse(anuncio.opcionais) as string[],
    fotos: listaFotos.map((f) => ({ id: f.id, url: urlImagem(f.chave) })),
  };
}

/** Mesma carroceria e preço parecido, os mais próximos primeiro. */
export async function similares(anuncio: { id: string; carroceria: string; preco: number }, limite = 4) {
  const linhas = await base().where(and(
    eq(anuncios.status, "ativo"),
    ne(anuncios.id, anuncio.id),
    eq(anuncios.carroceria, anuncio.carroceria as never),
    gte(anuncios.preco, Math.round(anuncio.preco * 0.7)),
    lte(anuncios.preco, Math.round(anuncio.preco * 1.3)),
  )).orderBy(sql`abs(${anuncios.preco} - ${anuncio.preco})`).limit(limite);
  return linhas.map(paraCard);
}

export async function registrarVisualizacao(id: string) {
  await db.update(anuncios).set({ visualizacoes: sql`${anuncios.visualizacoes} + 1` }).where(eq(anuncios.id, id));
}

export async function catalogo() {
  // Cada SELECT lê uma tabela só: sem nome de coluna repetido, o batch é seguro aqui.
  const [listaMarcas, listaModelos] = await db.batch([
    db.select().from(marcas).orderBy(asc(marcas.nome)),
    db.select().from(modelos).orderBy(asc(modelos.nome)),
  ]);
  return listaMarcas.map((m) => ({
    ...m,
    modelos: listaModelos.filter((mo) => mo.marcaId === m.id).map(({ id, nome, slug }) => ({ id, nome, slug })),
  }));
}

/** Marcas com carro disponível e quantos — para a vitrine e o filtro da home. */
export async function marcasComEstoque() {
  return db.select({ nome: marcas.nome, slug: marcas.slug, total: count() }).from(anuncios)
    .innerJoin(marcas, eq(marcas.id, anuncios.marcaId))
    .where(eq(anuncios.status, "ativo"))
    .groupBy(marcas.id).orderBy(desc(count()), asc(marcas.nome));
}

/** Modelos com carro disponível, agrupados por marca — o seletor da home só oferece o que existe. */
export async function modelosComEstoque() {
  const linhas = await db.select({ marcaSlug: marcas.slug, slug: modelos.slug, nome: modelos.nome }).from(anuncios)
    .innerJoin(marcas, eq(marcas.id, anuncios.marcaId))
    .innerJoin(modelos, eq(modelos.id, anuncios.modeloId))
    .where(eq(anuncios.status, "ativo"))
    .groupBy(modelos.id).orderBy(asc(modelos.nome));
  const porMarca: Record<string, { slug: string; nome: string }[]> = {};
  for (const l of linhas) (porMarca[l.marcaSlug] ??= []).push({ slug: l.slug, nome: l.nome });
  return porMarca;
}
