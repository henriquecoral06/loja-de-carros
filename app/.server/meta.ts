import { apenasDigitos } from "~/lib/formato";
import { chamar, registrarEnvio } from "./envios";

type ConfigMeta = { metaPixelId: string; metaTokenCapi: string; metaCodigoTeste: string };

const sha256 = async (texto: string) =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto)))].map((b) => b.toString(16).padStart(2, "0")).join("");

const cookie = (request: Request, nome: string) =>
  request.headers.get("Cookie")?.split(/;\s*/).find((c) => c.startsWith(`${nome}=`))?.slice(nome.length + 1);

export type EventoServidor = {
  nome: string;
  eventId: string;
  url: string;
  email?: string;
  telefoneInternacional?: string;
  nomePessoa?: string;
  valor?: number;
  conteudo?: string;
};

/**
 * Evento pela API de Conversões do Meta. O mesmo `event_id` do Pixel no
 * navegador faz o Meta contar uma vez só (deduplicação). Dados pessoais
 * vão com SHA-256, como a API exige.
 */
export async function enviarEventoMeta(c: ConfigMeta, request: Request, e: EventoServidor) {
  if (!c.metaPixelId || !c.metaTokenCapi) return { ok: false, status: 0, texto: "API de Conversões não configurada." };

  const [primeiro, ...resto] = (e.nomePessoa ?? "").trim().toLowerCase().split(/\s+/);
  const user_data: Record<string, unknown> = {
    client_ip_address: request.headers.get("CF-Connecting-IP") ?? undefined,
    client_user_agent: request.headers.get("User-Agent") ?? undefined,
    fbp: cookie(request, "_fbp"),
    fbc: cookie(request, "_fbc"),
  };
  if (e.email) user_data.em = [await sha256(e.email.trim().toLowerCase())];
  if (e.telefoneInternacional) user_data.ph = [await sha256(apenasDigitos(e.telefoneInternacional))];
  if (primeiro) user_data.fn = [await sha256(primeiro)];
  if (resto.length) user_data.ln = [await sha256(resto.at(-1)!)];

  const corpo = {
    data: [{
      event_name: e.nome,
      event_time: Math.floor(Date.now() / 1000),
      event_id: e.eventId,
      action_source: "website",
      event_source_url: e.url,
      user_data,
      custom_data: { currency: "BRL", ...(e.valor ? { value: e.valor } : {}), ...(e.conteudo ? { content_name: e.conteudo } : {}) },
    }],
    ...(c.metaCodigoTeste ? { test_event_code: c.metaCodigoTeste } : {}),
  };

  const r = await chamar(`https://graph.facebook.com/v21.0/${encodeURIComponent(c.metaPixelId)}/events?access_token=${encodeURIComponent(c.metaTokenCapi)}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo),
  });
  await registrarEnvio("meta", r.ok, r.status, r.ok ? `${e.nome}${c.metaCodigoTeste ? " (teste)" : ""}` : r.texto || `HTTP ${r.status}`);
  return r;
}
