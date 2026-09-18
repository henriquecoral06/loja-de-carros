import { and, count, eq, ne } from "drizzle-orm";
import { slugify } from "~/lib/formato";
import { db, schema } from "./db";

/**
 * Cadastro de marcas e modelos feito pela equipe. O slug de cada um vai
 * na URL do estoque (/carros/toyota/corolla), por isso é único por marca.
 */

const { marcas, modelos, anuncios } = schema;
export type Resultado = { ok: true; id: number; nome: string } | { ok: false; erro: string };

/** "  toyota   " → "Toyota"; nomes que já vêm com maiúsculas (BMW, HB20) ficam como estão. */
function limpar(nome: string) {
  const t = nome.replace(/\s+/g, " ").trim().slice(0, 40);
  return t && t === t.toLowerCase() ? t.replace(/(^|[\s-])\p{L}/gu, (l) => l.toUpperCase()) : t;
}

/** Cria a marca; se já existe uma com o mesmo nome, devolve a existente. */
export async function criarMarca(nomeEntrada: string): Promise<Resultado> {
  const nome = limpar(nomeEntrada);
  const slug = slugify(nome);
  if (!slug) return { ok: false, erro: "Informe o nome da marca." };
  const [existe] = await db.select({ id: marcas.id, nome: marcas.nome }).from(marcas).where(eq(marcas.slug, slug)).limit(1);
  if (existe) return { ok: true, ...existe };
  const [nova] = await db.insert(marcas).values({ nome, slug }).returning({ id: marcas.id, nome: marcas.nome });
  return { ok: true, ...nova };
}

/** Cria o modelo dentro da marca; se já existe, devolve o existente. */
export async function criarModelo(marcaId: number, nomeEntrada: string): Promise<Resultado> {
  const nome = limpar(nomeEntrada);
  const slug = slugify(nome);
  if (!slug) return { ok: false, erro: "Informe o nome do modelo." };
  const [marca] = await db.select({ id: marcas.id }).from(marcas).where(eq(marcas.id, marcaId)).limit(1);
  if (!marca) return { ok: false, erro: "Marca não encontrada." };
  const [existe] = await db.select({ id: modelos.id, nome: modelos.nome }).from(modelos)
    .where(and(eq(modelos.marcaId, marcaId), eq(modelos.slug, slug))).limit(1);
  if (existe) return { ok: true, ...existe };
  const [novo] = await db.insert(modelos).values({ marcaId, nome, slug }).returning({ id: modelos.id, nome: modelos.nome });
  return { ok: true, ...novo };
}

export async function renomearMarca(id: number, nomeEntrada: string): Promise<Resultado> {
  const nome = limpar(nomeEntrada);
  const slug = slugify(nome);
  if (!slug) return { ok: false, erro: "Informe o nome da marca." };
  const [outra] = await db.select({ id: marcas.id }).from(marcas).where(and(eq(marcas.slug, slug), ne(marcas.id, id))).limit(1);
  if (outra) return { ok: false, erro: `Já existe a marca “${nome}”.` };
  await db.update(marcas).set({ nome, slug }).where(eq(marcas.id, id));
  return { ok: true, id, nome };
}

export async function renomearModelo(id: number, nomeEntrada: string): Promise<Resultado> {
  const nome = limpar(nomeEntrada);
  const slug = slugify(nome);
  if (!slug) return { ok: false, erro: "Informe o nome do modelo." };
  const [atual] = await db.select({ marcaId: modelos.marcaId }).from(modelos).where(eq(modelos.id, id)).limit(1);
  if (!atual) return { ok: false, erro: "Modelo não encontrado." };
  const [outro] = await db.select({ id: modelos.id }).from(modelos)
    .where(and(eq(modelos.marcaId, atual.marcaId), eq(modelos.slug, slug), ne(modelos.id, id))).limit(1);
  if (outro) return { ok: false, erro: `Essa marca já tem o modelo “${nome}”.` };
  await db.update(modelos).set({ nome, slug }).where(eq(modelos.id, id));
  return { ok: true, id, nome };
}

/** Só apaga o que nenhum veículo usa: o cadastro do carro depende da marca e do modelo. */
export async function excluirMarca(id: number): Promise<Resultado> {
  const [{ n }] = await db.select({ n: count() }).from(anuncios).where(eq(anuncios.marcaId, id));
  if (n > 0) return { ok: false, erro: `Não dá para excluir: ${n} ${n === 1 ? "veículo usa" : "veículos usam"} esta marca.` };
  await db.delete(marcas).where(eq(marcas.id, id)); // os modelos saem junto (ON DELETE CASCADE)
  return { ok: true, id, nome: "" };
}

export async function excluirModelo(id: number): Promise<Resultado> {
  const [{ n }] = await db.select({ n: count() }).from(anuncios).where(eq(anuncios.modeloId, id));
  if (n > 0) return { ok: false, erro: `Não dá para excluir: ${n} ${n === 1 ? "veículo usa" : "veículos usam"} este modelo.` };
  await db.delete(modelos).where(eq(modelos.id, id));
  return { ok: true, id, nome: "" };
}
