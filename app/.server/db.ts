import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

/**
 * Cliente Drizzle sobre o binding D1. Só roda no servidor.
 *
 * ATENÇÃO com db.batch(): nele o D1 devolve linhas como objeto chaveado
 * pelo nome da coluna. Um SELECT com JOIN que traz duas colunas de mesmo
 * nome (marcas.nome e modelos.nome) perde uma delas e desloca todos os
 * campos seguintes — sem erro nenhum. Use batch só para escrita ou para
 * SELECT sem nomes repetidos; para leitura com JOIN, use Promise.all.
 */
export const db = drizzle(env.DB, { schema });
export { schema };
