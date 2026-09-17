import { and, desc, eq, gte, type SQL } from "drizzle-orm";
import { db, schema } from "~/.server/db";
import { obterIntegracoes } from "~/.server/integracoes";
import { dentroDoLimite, ipDe } from "~/.server/seguranca";
import { iguais, sha256Hex } from "~/.server/token";
import { internacional } from "~/lib/formato";
import { codigoVeiculo, STATUS_LEAD, type StatusLead } from "~/lib/veiculos";
import type { Route } from "./+types/leads";

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

/**
 * API de leads para CRMs e automações.
 *   GET /api/leads?since=2026-09-01T00:00:00Z&status=novo&limit=100
 *   Authorization: Bearer <token gerado em Admin → Integrações>
 */
export async function loader({ request }: Route.LoaderArgs) {
  if (!(await dentroDoLimite(`api-leads:${ipDe(request)}`, 120, 60_000))) return json({ erro: "Muitas requisições." }, 429);

  const url = new URL(request.url);
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? url.searchParams.get("token") ?? "";
  const { apiTokenHash } = await obterIntegracoes();
  if (!apiTokenHash || !iguais(await sha256Hex(token), apiTokenHash)) return json({ erro: "Token inválido." }, 401);

  const condicoes: SQL[] = [];
  const since = url.searchParams.get("since");
  if (since) {
    const ms = Date.parse(since);
    if (Number.isNaN(ms)) return json({ erro: "Parâmetro since inválido. Use ISO 8601." }, 400);
    condicoes.push(gte(schema.leads.criadoEm, ms));
  }
  const status = url.searchParams.get("status");
  if (status) {
    if (!(STATUS_LEAD as readonly string[]).includes(status)) return json({ erro: `status deve ser um de: ${STATUS_LEAD.join(", ")}` }, 400);
    condicoes.push(eq(schema.leads.status, status as StatusLead));
  }
  const limite = Math.min(500, Math.max(1, Number(url.searchParams.get("limit")) || 100));

  const { leads, anuncios, marcas, modelos, vendedores } = schema;
  const linhas = await db.select({
    id: leads.id, origem: leads.origem, status: leads.status, nome: leads.nome, email: leads.email, telefone: leads.telefone,
    mensagem: leads.texto, notas: leads.notas, rastreio: leads.rastreio, criadoEm: leads.criadoEm, atualizadoEm: leads.atualizadoEm,
    veiculoId: anuncios.id, codigo: anuncios.codigo, slug: anuncios.slug, versao: anuncios.versao, anoModelo: anuncios.anoModelo, preco: anuncios.preco,
    marca: marcas.nome, modelo: modelos.nome, vendedor: vendedores.nome,
  }).from(leads)
    .leftJoin(anuncios, eq(anuncios.id, leads.anuncioId))
    .leftJoin(marcas, eq(marcas.id, anuncios.marcaId))
    .leftJoin(modelos, eq(modelos.id, anuncios.modeloId))
    .leftJoin(vendedores, eq(vendedores.id, leads.vendedorId))
    .where(condicoes.length ? and(...condicoes) : undefined)
    .orderBy(desc(leads.criadoEm)).limit(limite);

  return json({
    leads: linhas.map((l) => ({
      id: l.id, origem: l.origem, status: l.status, nome: l.nome, email: l.email, telefone: internacional(l.telefone),
      mensagem: l.mensagem, notas: l.notas, rastreio: JSON.parse(l.rastreio),
      criado_em: new Date(l.criadoEm).toISOString(), atualizado_em: new Date(l.atualizadoEm).toISOString(),
      vendedor: l.vendedor,
      veiculo: l.veiculoId ? {
        id: l.veiculoId, codigo: codigoVeiculo(l.codigo!), titulo: `${l.marca} ${l.modelo} ${l.versao} ${l.anoModelo}`,
        preco: l.preco, url: `${url.origin}/carro/${l.slug}`,
      } : null,
    })),
    total: linhas.length,
  });
}
