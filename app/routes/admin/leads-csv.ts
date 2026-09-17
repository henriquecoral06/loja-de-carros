import { buscarLeads, descreverOrigem } from "~/.server/consulta-leads";
import { exigirUsuario } from "~/.server/sessao";
import { dataHora, internacional } from "~/lib/formato";
import { codigoVeiculo, ROTULO_ORIGEM, ROTULO_STATUS_LEAD } from "~/lib/veiculos";
import type { Route } from "./+types/leads-csv";

/**
 * CSV com os mesmos filtros da tela. Separador ";" e BOM UTF-8: é o que o
 * Excel em português abre direto, com acentos certos. Células que começam
 * com = + - @ recebem apóstrofo para não virarem fórmula.
 */
const celula = (v: string | number | null | undefined) => {
  let t = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`;
  return `"${t.replace(/"/g, '""')}"`;
};

export async function loader({ request }: Route.LoaderArgs) {
  await exigirUsuario(request);
  const url = new URL(request.url);
  const leads = await buscarLeads(url.searchParams.get("q") ?? "", url.searchParams.get("status") ?? "", 10_000);

  const cabecalho = ["Data", "Nome", "Telefone", "E-mail", "Status", "Origem", "Código", "Veículo", "Vendedor", "Landing page", "Campanha", "Mensagem", "Anotações"];
  const linhas = leads.map((l) => [
    dataHora(l.criadoEm), l.nome, internacional(l.telefone), l.email, ROTULO_STATUS_LEAD[l.status], ROTULO_ORIGEM[l.origem],
    l.codigo ? codigoVeiculo(l.codigo) : "", l.marca ? `${l.marca} ${l.modelo} ${l.versao} ${l.anoModelo}` : "",
    l.vendedor, l.landingPage, descreverOrigem(l.rastreio), l.texto, l.notas,
  ].map(celula).join(";"));

  const nome = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(`﻿${[cabecalho.map(celula).join(";"), ...linhas].join("\r\n")}`, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${nome}"`, "Cache-Control": "no-store" },
  });
}
