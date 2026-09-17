import { desc, lt, sql } from "drizzle-orm";
import { db, schema } from "./db";

export type Canal = "webhook" | "email" | "meta";

/** Registra uma entrega para fora e mantém só as 100 mais recentes. */
export async function registrarEnvio(canal: Canal, sucesso: boolean, status: number, detalhe: string) {
  await db.insert(schema.envios).values({ id: crypto.randomUUID(), canal, sucesso, status, detalhe: detalhe.slice(0, 300) });
  const [corte] = await db.select({ criadoEm: schema.envios.criadoEm }).from(schema.envios)
    .orderBy(desc(schema.envios.criadoEm)).limit(1).offset(100);
  if (corte) await db.delete(schema.envios).where(lt(schema.envios.criadoEm, corte.criadoEm));
}

export function ultimosEnvios(limite = 12) {
  return db.select().from(schema.envios).orderBy(desc(schema.envios.criadoEm), sql`rowid desc`).limit(limite);
}

/** fetch com tempo-limite que devolve status e um trecho da resposta, sem lançar. */
export async function chamar(url: string, init: RequestInit) {
  try {
    const r = await fetch(url, { ...init, signal: AbortSignal.timeout(10_000), redirect: "manual" });
    return { ok: r.ok, status: r.status, texto: (await r.text()).slice(0, 300) };
  } catch (e) {
    return { ok: false, status: 0, texto: e instanceof Error ? e.message : "Falha de conexão" };
  }
}
