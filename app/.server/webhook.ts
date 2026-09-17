import { aplicarModelo } from "~/lib/webhook-modelo";
import { chamar, registrarEnvio } from "./envios";

export type PayloadLead = {
  evento: "lead.novo" | "teste";
  id: string;
  criado_em: string;
  origem: string;
  status: string;
  lead: { nome: string; email: string; telefone: string; mensagem: string };
  veiculo: null | { id: string; codigo: string; titulo: string; marca: string; modelo: string; versao: string; ano_modelo: number; preco: number; url: string };
  vendedor: null | { nome: string; whatsapp: string; email: string };
  landing_page: null | { titulo: string; url: string };
  rastreio: Record<string, string>;
  loja: { nome: string };
};

const hex = (buffer: ArrayBuffer) => [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");

async function assinar(segredo: string, corpo: string) {
  const chave = await crypto.subtle.importKey("raw", new TextEncoder().encode(segredo), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", chave, new TextEncoder().encode(corpo)));
}

/**
 * POST JSON para o CRM. Com segredo, envia:
 * - `X-Webhook-Signature: sha256=<HMAC-SHA256 do corpo>` — para CRMs que validam assinatura;
 * - `X-Webhook-Secret: <segredo>` — para Make/Zapier/n8n, que só comparam um cabeçalho.
 */
export async function entregarWebhook(url: string, segredo: string, payload: PayloadLead, modelo = "") {
  // Com modelo, o corpo segue o formato que o CRM espera.
  const corpo = JSON.stringify(modelo.trim() ? aplicarModelo(modelo, payload) : payload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "loja-de-carros-webhook/1.0",
    "X-Webhook-Event": payload.evento,
  };
  if (segredo) {
    headers["X-Webhook-Signature"] = `sha256=${await assinar(segredo, corpo)}`;
    headers["X-Webhook-Secret"] = segredo;
  }
  const r = await chamar(url, { method: "POST", headers, body: corpo });
  await registrarEnvio("webhook", r.ok, r.status, r.ok ? `${payload.evento} · ${payload.lead.nome}` : r.texto || `HTTP ${r.status}`);
  return r;
}
