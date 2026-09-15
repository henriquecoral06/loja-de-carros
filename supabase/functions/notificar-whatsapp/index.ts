// Resposta ao lead pelo painel, via Evolution API.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { enviarWhatsApp, cors, json } from "../_shared/evolution.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return json({ erro: "nao_autenticado" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: { user }, error: erroAuth } = await supabase.auth.getUser(token);
  if (erroAuth || !user) return json({ erro: "nao_autenticado" }, 401);

  const { lead_id, texto } = await req.json();
  if (!lead_id || !texto?.trim()) return json({ erro: "dados_incompletos" }, 400);

  const { data: lead } = await supabase
    .from("leads").select("id, nome, whatsapp").eq("id", lead_id).maybeSingle();
  if (!lead) return json({ erro: "lead_nao_encontrado" }, 404);

  const envio = await enviarWhatsApp(lead.whatsapp, texto);

  // A interação é gravada mesmo quando o envio falha: o vendedor precisa
  // ver que tentou, e o gatilho de primeira resposta depende disso.
  await supabase.from("lead_interacoes").insert({
    lead_id: lead.id,
    usuario_id: user.id,
    texto,
    canal: envio.ok ? "whatsapp" : "whatsapp_falhou",
  });

  return json(envio, envio.ok ? 200 : 502);
});
