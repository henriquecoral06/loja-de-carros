import { waitUntil } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { db, schema } from "./db";
import { obterIntegracoes } from "./integracoes";

export type PayloadLead = {
  evento: "lead.novo" | "teste";
  id: string;
  criado_em: string;
  origem: "pagina_do_veiculo" | "contato" | "teste";
  lead: { nome: string; email: string; telefone: string; mensagem: string };
  veiculo: null | { id: string; titulo: string; marca: string; modelo: string; versao: string; ano_modelo: number; preco: number; url: string };
  rastreio: Record<string, string>;
  loja: { nome: string };
};

const paraHex = (buffer: ArrayBuffer) => [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");

async function assinar(segredo: string, corpo: string) {
  const chave = await crypto.subtle.importKey("raw", new TextEncoder().encode(segredo), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return paraHex(await crypto.subtle.sign("HMAC", chave, new TextEncoder().encode(corpo)));
}

/**
 * POST JSON para o CRM. Com segredo, envia o cabeçalho
 * `X-Assinatura: sha256=<hmac do corpo>` para o CRM conferir a origem.
 * Grava o resultado da última entrega, que aparece em Admin → Integrações.
 */
export async function entregarWebhook(url: string, segredo: string, payload: PayloadLead) {
  const corpo = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "loja-de-carros-webhook/1.0",
    "X-Evento": payload.evento,
  };
  if (segredo) headers["X-Assinatura"] = `sha256=${await assinar(segredo, corpo)}`;

  let status = 0;
  let resposta = "";
  try {
    const r = await fetch(url, { method: "POST", headers, body: corpo, signal: AbortSignal.timeout(10_000), redirect: "manual" });
    status = r.status;
    resposta = (await r.text()).slice(0, 300);
  } catch (e) {
    resposta = e instanceof Error ? e.message.slice(0, 300) : "Falha de conexão";
  }

  await db.update(schema.integracoes)
    .set({ webhookUltimoStatus: status, webhookUltimoEm: Date.now(), webhookUltimaResposta: resposta })
    .where(eq(schema.integracoes.id, 1));
  return { status, resposta };
}

/**
 * Dispara o webhook sem atrasar a resposta ao visitante: `waitUntil`
 * mantém o Worker vivo até a entrega terminar.
 */
export async function enviarLeadAoCrm(payload: Omit<PayloadLead, "evento" | "loja">, nomeLoja: string) {
  const { webhookUrl, webhookSegredo } = await obterIntegracoes();
  if (!webhookUrl) return;
  waitUntil(entregarWebhook(webhookUrl, webhookSegredo, { evento: "lead.novo", loja: { nome: nomeLoja }, ...payload }));
}
