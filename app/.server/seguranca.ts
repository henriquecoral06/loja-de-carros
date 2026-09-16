import { sql } from "drizzle-orm";
import { data } from "react-router";
import { db } from "./db";

export const ipDe = (request: Request) =>
  request.headers.get("CF-Connecting-IP") ?? request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ?? "local";

/**
 * Defesa extra contra CSRF, além do cookie SameSite=Lax: um POST cujo
 * Origin não é o próprio site é recusado.
 */
export function exigirMesmaOrigem(request: Request) {
  const origem = request.headers.get("Origin");
  if (origem && origem !== new URL(request.url).origin) {
    throw data("Origem não permitida.", { status: 403 });
  }
}

/**
 * Conta uma tentativa na janela atual e diz se ainda está dentro do
 * limite. Um único UPSERT atômico: duas requisições simultâneas não
 * conseguem passar juntas pela mesma contagem.
 */
export async function dentroDoLimite(chave: string, maximo: number, janelaMs: number) {
  const janela = Math.floor(Date.now() / janelaMs);
  const [linha] = await db.all<{ contagem: number }>(sql`
    insert into limites (chave, janela, contagem) values (${chave}, ${janela}, 1)
    on conflict(chave) do update set
      contagem = case when limites.janela = excluded.janela then limites.contagem + 1 else 1 end,
      janela = excluded.janela
    returning contagem
  `);
  return (linha?.contagem ?? 1) <= maximo;
}
