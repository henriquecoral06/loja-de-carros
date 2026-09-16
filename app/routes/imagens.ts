import { env } from "cloudflare:workers";
import type { Route } from "./+types/imagens";

/**
 * Serve as fotos do R2 através do Worker. As chaves têm UUID, então o
 * conteúdo de cada URL nunca muda: cache de um ano e `immutable`, e o
 * navegador nem pergunta de novo.
 */
export async function loader({ params, request }: Route.LoaderArgs) {
  const chave = params["*"];
  // Só o prefixo público. Qualquer outra coisa no bucket não sai por aqui.
  if (!chave || !(chave.startsWith("anuncios/") || chave.startsWith("loja/")) || chave.includes("..")) {
    return new Response("Não encontrado", { status: 404 });
  }

  const etag = request.headers.get("If-None-Match")?.replace(/^W\//, "").replace(/"/g, "");
  const objeto = await env.IMAGENS.get(chave, etag ? { onlyIf: { etagDoesNotMatch: etag } } : undefined);
  if (!objeto) return new Response("Não encontrado", { status: 404 });

  const headers = new Headers();
  objeto.writeHttpMetadata(headers);
  headers.set("ETag", objeto.httpEtag);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("X-Content-Type-Options", "nosniff");
  // SVG aberto direto no navegador vira documento: sem script, sem nada externo.
  if (chave.endsWith(".svg")) headers.set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox");

  // Sem corpo = a precondição falhou = o navegador já tem esta versão.
  if (!("body" in objeto)) return new Response(null, { status: 304, headers });
  return new Response(objeto.body, { headers });
}
