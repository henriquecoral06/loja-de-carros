// =====================================================================
// notificar-whatsapp — envio via Evolution API (não oficial)
//
// A chave da Evolution fica em secret de edge function e NUNCA no bundle
// do navegador. Quem remixar o projeto cadastra a própria instância.
//
// A Evolution conecta um WhatsApp comum por QR code, fora dos termos da
// Meta: o número pode ser bloqueado e a API muda sem aviso. Por isso
// nada aqui lança exceção para cima — a falha é registrada e o fluxo
// segue pelo e-mail. Notificação nunca derruba o cadastro do lead.
// =====================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export interface EnvioWhatsApp {
  numero: string;
  texto: string;
}

export async function enviarWhatsApp({ numero, texto }: EnvioWhatsApp) {
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
      body: JSON.stringify({
        number: destino,
        text: texto,
        delay: 1000,
      }),
    });

    if (!resposta.ok) {
      const corpo = await resposta.text();
      console.error("evolution falhou", resposta.status, corpo);
      return { ok: false, motivo: `http_${resposta.status}` };
    }
    return { ok: true };
  } catch (erro) {
    console.error("evolution inacessível", erro);
    return { ok: false, motivo: "inacessivel" };
  }
}

// Endpoint próprio: usado pelo CRM para responder o lead pelo painel.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ erro: "nao_autenticado" }), {
      status: 401, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const { lead_id, texto } = await req.json();
  const { data: lead } = await supabase
    .from("leads").select("id, nome, whatsapp, vendedor_id").eq("id", lead_id).maybeSingle();

  if (!lead) {
    return new Response(JSON.stringify({ erro: "lead_nao_encontrado" }), {
      status: 404, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const envio = await enviarWhatsApp({ numero: lead.whatsapp, texto });

  // A interação é gravada mesmo se o envio falhar: o vendedor precisa
  // ver que tentou, e o gatilho de primeira resposta depende disso.
  await supabase.from("lead_interacoes").insert({
    lead_id: lead.id,
    usuario_id: user.id,
    texto,
    canal: envio.ok ? "whatsapp" : "whatsapp_falhou",
  });

  return new Response(JSON.stringify(envio), {
    status: envio.ok ? 200 : 502,
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
