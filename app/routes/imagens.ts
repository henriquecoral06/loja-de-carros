import { waitUntil } from "cloudflare:workers";
import { lerArquivo } from "~/.server/imagens";
import type { Route } from "./+types/imagens";

/**
 * Serve as imagens enviadas pelo painel (D1 ou R2). As chaves têm UUID, então
 * o conteúdo de cada URL nunca muda: cache de um ano e `immutable`. A
 * resposta também fica no cache da borda da Cloudflare, para não ler o banco
 * a cada visita.
 */
export async function loader({ params, request }: Route.LoaderArgs) {
  const chave = params["*"];
  // Só os prefixos públicos.
  if (!chave || !(chave.startsWith("anuncios/") || chave.startsWith("loja/") || chave.startsWith("lp/")) || chave.includes("..")) {
    return new Response("Não encontrado", { status: 404 });
  }

  const cache = (globalThis as { caches?: { default?: Cache } }).caches?.default;
  const chaveCache = new Request(new URL(request.url).toString(), { method: "GET" });
  const emCache = await cache?.match(chaveCache);
  if (emCache) return emCache;

  const arquivo = await lerArquivo(chave);
  if (!arquivo) return new Response("Não encontrado", { status: 404 });

  const etag = arquivo.etag;
  const headers = new Headers({
    "Content-Type": arquivo.tipo,
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
    ETag: etag,
  });
  // SVG aberto direto no navegador vira documento: sem script, sem nada externo.
  if (chave.endsWith(".pdf")) headers.set("Content-Disposition", 'inline; filename="material.pdf"');
  if (chave.endsWith(".svg")) headers.set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox");
  if (request.headers.get("If-None-Match") === etag) return new Response(null, { status: 304, headers });

  const resposta = new Response(arquivo.corpo, { headers });
  if (cache) waitUntil(cache.put(chaveCache, resposta.clone()));
  return resposta;
}
