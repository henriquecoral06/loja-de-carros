import { eq } from "drizzle-orm";
import { data } from "react-router";
import { db, schema } from "./db";

/** Carrega um veículo do estoque para o admin. Qualquer pessoa da equipe edita qualquer veículo. */
export async function anuncioPorId(anuncioId: string) {
  const [anuncio] = await db.select().from(schema.anuncios).where(eq(schema.anuncios.id, anuncioId)).limit(1);
  if (!anuncio) throw data("Veículo não encontrado", { status: 404 });
  return anuncio;
}
