// =====================================================================
// Cliente da Evolution API (WhatsApp não oficial).
//
// Vive em _shared porque duas funções precisam dele. Importar de dentro
// de outra função não funcionaria: cada arquivo de função chama
// Deno.serve() no topo, e importá-lo subiria um segundo servidor.
//
// A chave fica em secret de edge function e NUNCA no bundle do navegador.
//
// A Evolution conecta um WhatsApp comum por QR code, fora dos termos da
// Meta: o número pode ser bloqueado e a API muda sem aviso. Por isso
// nada aqui lança exceção — a falha vira retorno, e quem chama decide.
// Notificação jamais derruba o registro de um lead.
// =====================================================================

export interface ResultadoEnvio {
  ok: boolean;
  motivo?: string;
}

export async function enviarWhatsApp(numero: string, texto: string): Promise<ResultadoEnvio> {
  const url = Deno.env.get("EVOLUTION_API_URL");
  const key = Deno.env.get("EVOLUTION_API_KEY");
  const instancia = Deno.env.get("EVOLUTION_INSTANCE");

  if (!url || !key || !instancia) {
    return { ok: false, motivo: "evolution_nao_configurada" };
  }

  const destino = numero.replace(/\D/g, "");
  if (destino.length < 12) return { ok: false, motivo: "numero_invalido" };

  try {
    const resposta = await fetch(`${url.replace(/\/$/, "")}/message/sendText/${instancia}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: key },
      body: JSON.stringify({ number: destino, text: texto, delay: 1000 }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!resposta.ok) {
      console.error("evolution respondeu erro", resposta.status, await resposta.text());
      return { ok: false, motivo: `http_${resposta.status}` };
    }
    return { ok: true };
  } catch (erro) {
    console.error("evolution inacessivel", erro);
    return { ok: false, motivo: "inacessivel" };
  }
}

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
