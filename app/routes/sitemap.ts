import { desc, eq } from "drizzle-orm";
import { db, schema } from "~/.server/db";
import type { Route } from "./+types/sitemap";

const escapar = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function loader({ request }: Route.LoaderArgs) {
  const origem = new URL(request.url).origin;
  const [anuncios, marcas] = await db.batch([
    db.select({ slug: schema.anuncios.slug, atualizadoEm: schema.anuncios.atualizadoEm }).from(schema.anuncios)
      .where(eq(schema.anuncios.status, "ativo")).orderBy(desc(schema.anuncios.atualizadoEm)).limit(45000),
    db.selectDistinct({ slug: schema.marcas.slug }).from(schema.marcas)
      .innerJoin(schema.anuncios, eq(schema.anuncios.marcaId, schema.marcas.id))
      .where(eq(schema.anuncios.status, "ativo")),
  ]);

  const url = (loc: string, lastmod?: number) =>
    `<url><loc>${escapar(origem + loc)}</loc>${lastmod ? `<lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` : ""}</url>`;

  const corpo = [
    url("/"), url("/carros"), url("/sobre"), url("/contato"),
    ...marcas.map((m) => url(`/carros/${m.slug}`)),
    ...anuncios.map((a) => url(`/carro/${a.slug}`, a.atualizadoEm)),
  ].join("");

  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${corpo}</urlset>`, {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
