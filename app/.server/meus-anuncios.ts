import { and, eq } from "drizzle-orm";
import { data } from "react-router";
import { db, schema } from "./db";

/**
 * Carrega o anúncio garantindo que é de quem pede. Anúncio de outra
 * pessoa responde 404, não 403: não confirma que aquele id existe.
 */
export async function anuncioDoUsuario(anuncioId: string, usuarioId: string) {
  const [anuncio] = await db.select().from(schema.anuncios)
    .where(and(eq(schema.anuncios.id, anuncioId), eq(schema.anuncios.usuarioId, usuarioId))).limit(1);
  if (!anuncio) throw data("Anúncio não encontrado", { status: 404 });
  return anuncio;
}
