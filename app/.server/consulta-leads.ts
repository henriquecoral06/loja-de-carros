import { and, desc, eq, like, or, sql, type SQL } from "drizzle-orm";
import { apenasDigitos } from "~/lib/formato";
import { STATUS_LEAD, type StatusLead } from "~/lib/veiculos";
import { db, schema } from "./db";

/** Busca de leads usada pela tela e pela exportação CSV (mesmos filtros). */
export function buscarLeads(q: string, status: string, limite = 300) {
  const { leads, anuncios, marcas, modelos, vendedores, landingPages } = schema;
  const condicoes: SQL[] = [];
  if ((STATUS_LEAD as readonly string[]).includes(status)) condicoes.push(eq(leads.status, status as StatusLead));
  const termo = q.trim().toLowerCase().slice(0, 80);
  if (termo) {
    const t = `%${termo.replace(/[%_]/g, "")}%`;
    const digitos = apenasDigitos(termo);
    condicoes.push(or(
      like(sql`lower(${leads.nome})`, t), like(sql`lower(${leads.email})`, t), like(sql`lower(${leads.texto})`, t),
      ...(digitos.length >= 4 ? [like(leads.telefone, `%${digitos}%`)] : []),
    )!);
  }
  return db.select({
    id: leads.id, nome: leads.nome, email: leads.email, telefone: leads.telefone, texto: leads.texto, status: leads.status,
    notas: leads.notas, origem: leads.origem, rastreio: leads.rastreio, criadoEm: leads.criadoEm,
    anuncioId: anuncios.id, codigo: anuncios.codigo, slug: anuncios.slug, versao: anuncios.versao, anoModelo: anuncios.anoModelo,
    marca: marcas.nome, modelo: modelos.nome, vendedor: vendedores.nome, landingPage: landingPages.titulo,
  }).from(leads)
    .leftJoin(anuncios, eq(anuncios.id, leads.anuncioId))
    .leftJoin(marcas, eq(marcas.id, anuncios.marcaId))
    .leftJoin(modelos, eq(modelos.id, anuncios.modeloId))
    .leftJoin(vendedores, eq(vendedores.id, leads.vendedorId))
    .leftJoin(landingPages, eq(landingPages.id, leads.landingPageId))
    .where(condicoes.length ? and(...condicoes) : undefined)
    .orderBy(desc(leads.criadoEm)).limit(limite);
}

/** "Google Ads · campanha x" a partir dos utm/gclid gravados com o lead. */
export function descreverOrigem(json: string) {
  try {
    const r = JSON.parse(json) as Record<string, string>;
    const canal = r.gclid || r.gbraid || r.wbraid ? "Google Ads" : r.fbclid ? "Meta Ads" : r.utm_source ? [r.utm_source, r.utm_medium].filter(Boolean).join(" / ") : "";
    return [canal, r.utm_campaign && `campanha ${r.utm_campaign}`].filter(Boolean).join(" · ");
  } catch {
    return "";
  }
}
